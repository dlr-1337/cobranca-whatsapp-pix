import {
  type AuditEventType,
  confirmEmailInputSchema,
  forgotPasswordInputSchema,
  loginInputSchema,
  normalizeEmail,
  resetPasswordInputSchema,
  signupRequestSchema,
  tenantSettingsInputSchema,
  type ConfirmEmailInput,
  type ForgotPasswordInput,
  type LoginInput,
  type ResetPasswordInput,
  type SignupRequestInput,
  type TenantSettingsInput,
} from '@cobrazap/domain';
import { createDevEmailOutbox, type DevEmailOutboxMessage } from '@cobrazap/integrations';
import {
  BadRequestException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'crypto';

import { AuthStorageService } from './auth-storage.service';

interface AuthRequestMeta {
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface AuthSessionPayload {
  authenticated: true;
  tenant: {
    id: string;
    businessName: string;
    primaryEmail: string;
    whatsappPhone: string;
    timezone: string;
    defaultDueDay: number;
    whatsappTemplateChargeInitial: string;
    whatsappTemplateReminder: string;
    whatsappTemplatePaymentConfirmation: string;
    reminderWindowStartHour: number;
    reminderWindowEndHour: number;
  };
  user: {
    id: string;
    email: string;
    role: string;
  };
}

const EMAIL_OR_PASSWORD_INVALID = 'Email ou senha invalidos.';
const SESSION_EXPIRED = 'Sua sessao expirou. Entre novamente para continuar.';
const RESET_LINK_INVALID =
  'Este link nao e mais valido. Solicite um novo link.';
const RESET_REQUEST_MESSAGE =
  'Se o email existir, voce recebera um link para redefinir a senha.';
const PASSWORD_HASH_KEYLEN = 64;
const SESSION_IDLE_TIMEOUT_MINUTES = 12 * 60;
const SESSION_ABSOLUTE_LIFETIME_MS = 14 * 24 * 60 * 60 * 1000;
const RESET_TOKEN_LIFETIME_MS = 60 * 60 * 1000;
const EMAIL_CONFIRMATION_LIFETIME_MS = 24 * 60 * 60 * 1000;

function createOpaqueToken() {
  return randomBytes(32).toString('base64url');
}

function hashOpaqueToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const digest = scryptSync(password, salt, PASSWORD_HASH_KEYLEN).toString('hex');
  return `scrypt:${salt}:${digest}`;
}

function verifyPassword(password: string, storedHash: string) {
  const [algorithm, salt, digest] = storedHash.split(':');

  if (algorithm !== 'scrypt' || !salt || !digest) {
    return false;
  }

  const computed = scryptSync(password, salt, PASSWORD_HASH_KEYLEN);
  const stored = Buffer.from(digest, 'hex');

  if (stored.length !== computed.length) {
    return false;
  }

  return timingSafeEqual(stored, computed);
}

@Injectable()
export class AuthService {
  private readonly outbox = createDevEmailOutbox();

  constructor(
    @Inject(AuthStorageService)
    private readonly authStorage: AuthStorageService,
  ) {}

  listOutboxMessages() {
    return this.outbox.listMessages();
  }

  clearOutbox() {
    this.outbox.clear();
  }

  async signup(input: SignupRequestInput) {
    const parsed = signupRequestSchema.parse(input);
    const repository = await this.authStorage.getRepository();
    const existingUser = await repository.findUserByEmail(parsed.ownerEmail);

    if (existingUser) {
      throw new BadRequestException('Ja existe uma conta para este email.');
    }

    const created = await repository.bootstrapOwnerTenant({
      businessName: parsed.businessName,
      primaryEmail: parsed.primaryEmail,
      whatsappPhone: parsed.whatsappPhone,
      timezone: parsed.timezone,
      defaultDueDay: parsed.defaultDueDay,
      ownerEmail: parsed.ownerEmail,
      ownerPasswordHash: hashPassword(parsed.password),
    });

    await this.issueEmailToken({
      kind: 'email-confirmation',
      tenantId: created.tenantId,
      userId: created.userId,
      to: parsed.ownerEmail,
      subject: 'Confirme seu email no CobraZap',
      path: '/confirmar-email',
      lifetimeMs: EMAIL_CONFIRMATION_LIFETIME_MS,
    });

    await repository.appendAuditEvent({
      tenantId: created.tenantId,
      actorUserId: created.userId,
      actorEmail: parsed.ownerEmail,
      eventType: 'auth.signup_requested',
      summary: 'Cadastro inicial da empresa criado e aguardando confirmação de email.',
    });

    return {
      requiresEmailConfirmation: true,
    };
  }

  async confirmEmail(input: ConfirmEmailInput) {
    const parsed = confirmEmailInputSchema.parse(input);
    const repository = await this.authStorage.getRepository();
    const consumed = await repository.consumeEmailActionToken({
      kind: 'email-confirmation',
      tokenHash: hashOpaqueToken(parsed.token),
      consumedAt: new Date(),
    });

    if (!consumed) {
      throw new BadRequestException(RESET_LINK_INVALID);
    }

    const now = new Date();
    await repository.markUserEmailVerified(consumed.userId, now);
    await repository.activateTenant(consumed.tenantId, now);
    const user = await repository.getUserById(consumed.userId);

    await repository.appendAuditEvent({
      tenantId: consumed.tenantId,
      actorUserId: consumed.userId,
      actorEmail: user?.email ?? null,
      eventType: 'auth.email_confirmed',
      summary: 'Email do responsável confirmado e empresa ativada.',
      occurredAt: now,
    });

    return {
      confirmed: true,
    };
  }

  async login(input: LoginInput, requestMeta: AuthRequestMeta) {
    const parsed = loginInputSchema.parse(input);
    const repository = await this.authStorage.getRepository();
    const user = await repository.findUserByEmail(parsed.email);

    if (!user || !verifyPassword(parsed.password, user.passwordHash)) {
      await this.recordLoginFailure(repository, user?.id ?? null, user?.email ?? parsed.email);
      throw new UnauthorizedException(EMAIL_OR_PASSWORD_INVALID);
    }

    const membership = await repository.findPrimaryMembershipByUserId(user.id);

    if (!membership) {
      await this.recordLoginFailure(repository, user.id, user.email);
      throw new UnauthorizedException(EMAIL_OR_PASSWORD_INVALID);
    }

    const tenant = await repository.getTenantById(membership.tenantId);
    const settings = await repository.getTenantSettings(membership.tenantId);

    if (!tenant || !settings || !user.emailVerified || tenant.status !== 'active') {
      await repository.appendAuditEvent({
        tenantId: membership.tenantId,
        actorUserId: user.id,
        actorEmail: user.email,
        eventType: 'auth.login_failed',
        summary: 'Tentativa de login bloqueada antes da ativação completa da empresa.',
      });
      throw new UnauthorizedException(EMAIL_OR_PASSWORD_INVALID);
    }

    const now = new Date();
    const sessionToken = createOpaqueToken();

    await repository.createSession({
      tenantId: membership.tenantId,
      userId: user.id,
      membershipId: membership.id,
      tokenHash: hashOpaqueToken(sessionToken),
      expiresAt: new Date(now.getTime() + SESSION_ABSOLUTE_LIFETIME_MS),
      createdAt: now,
      lastSeenAt: now,
      idleTimeoutMinutes: SESSION_IDLE_TIMEOUT_MINUTES,
      userAgent: requestMeta.userAgent ?? null,
      ipAddress: requestMeta.ipAddress ?? null,
    });

    await repository.appendAuditEvent({
      tenantId: membership.tenantId,
      actorUserId: user.id,
      actorEmail: user.email,
      eventType: 'auth.login_succeeded',
      summary: 'Login concluído com sessão ativa para o responsável da conta.',
      occurredAt: now,
    });

    return {
      sessionToken,
      payload: this.buildSessionPayload({
        membershipRole: membership.role,
        settings,
        tenantId: tenant.id,
        userId: user.id,
        userEmail: user.email,
      }),
    };
  }

  async getSession(sessionToken: string | null) {
    const resolved = await this.requireSession(sessionToken);

    return {
      authenticated: true,
      tenant: resolved.payload.tenant,
      user: resolved.payload.user,
    };
  }

  async logout(sessionToken: string | null) {
    if (!sessionToken) {
      return;
    }

    const repository = await this.authStorage.getRepository();
    const revokedSession = await repository.revokeSessionByTokenHash(
      hashOpaqueToken(sessionToken),
      'logout',
      new Date(),
    );

    if (revokedSession) {
      const user = await repository.getUserById(revokedSession.userId);

      await repository.appendAuditEvent({
        tenantId: revokedSession.tenantId,
        actorUserId: revokedSession.userId,
        actorEmail: user?.email ?? null,
        eventType: 'auth.logout',
        summary: 'Sessão encerrada manualmente pelo responsável da conta.',
      });
    }
  }

  async forgotPassword(input: ForgotPasswordInput) {
    const parsed = forgotPasswordInputSchema.parse(input);
    const repository = await this.authStorage.getRepository();
    const user = await repository.findUserByEmail(parsed.email);

    if (user?.emailVerified) {
      const membership = await repository.findPrimaryMembershipByUserId(user.id);

      if (membership) {
        await this.issueEmailToken({
          kind: 'password-reset',
          tenantId: membership.tenantId,
          userId: user.id,
          to: user.email,
          subject: 'Redefina sua senha no CobraZap',
          path: '/redefinir-senha',
          lifetimeMs: RESET_TOKEN_LIFETIME_MS,
        });

        await repository.appendAuditEvent({
          tenantId: membership.tenantId,
          actorUserId: user.id,
          actorEmail: user.email,
          eventType: 'auth.password_reset_requested',
          summary: 'Pedido de redefinição de senha gerado para a conta da empresa.',
        });
      }
    }

    return {
      accepted: true,
      message: RESET_REQUEST_MESSAGE,
    };
  }

  async resetPassword(input: ResetPasswordInput) {
    const parsed = resetPasswordInputSchema.parse(input);
    const repository = await this.authStorage.getRepository();
    const consumed = await repository.consumeEmailActionToken({
      kind: 'password-reset',
      tokenHash: hashOpaqueToken(parsed.token),
      consumedAt: new Date(),
    });

    if (!consumed) {
      throw new BadRequestException(RESET_LINK_INVALID);
    }

    const now = new Date();
    await repository.updateUserPassword(consumed.userId, hashPassword(parsed.password), now);
    await repository.revokeAllUserSessions({
      userId: consumed.userId,
      tenantId: consumed.tenantId,
      reason: 'password-reset',
      revokedAt: now,
    });
    const user = await repository.getUserById(consumed.userId);

    await repository.appendAuditEvent({
      tenantId: consumed.tenantId,
      actorUserId: consumed.userId,
      actorEmail: user?.email ?? null,
      eventType: 'auth.password_reset_completed',
      summary: 'Senha redefinida e demais sessões revogadas.',
      occurredAt: now,
    });

    return {
      reset: true,
    };
  }

  async getTenantSettings(sessionToken: string | null) {
    const resolved = await this.requireSession(sessionToken);
    return resolved.payload.tenant;
  }

  async updateTenantSettings(
    sessionToken: string | null,
    input: TenantSettingsInput,
  ) {
    const parsed = tenantSettingsInputSchema.parse(input);
    const resolved = await this.requireSession(sessionToken);
    const repository = await this.authStorage.getRepository();
    const updated = await repository.updateTenantSettings(
      resolved.payload.tenant.id,
      parsed,
    );

    if (!updated) {
      throw new UnauthorizedException(SESSION_EXPIRED);
    }

    await repository.appendAuditEvent({
      tenantId: resolved.payload.tenant.id,
      actorUserId: resolved.payload.user.id,
      actorEmail: resolved.payload.user.email,
      eventType: 'tenant.settings_updated',
      summary: 'Configurações básicas da empresa foram atualizadas no painel.',
    });

    return updated;
  }

  async resolveTenantContext(sessionToken: string | null) {
    return this.requireSession(sessionToken);
  }

  private async issueEmailToken(input: {
    kind: DevEmailOutboxMessage['kind'];
    tenantId: string;
    userId: string;
    to: string;
    subject: string;
    path: string;
    lifetimeMs: number;
  }) {
    const repository = await this.authStorage.getRepository();
    const token = createOpaqueToken();

    await repository.createEmailActionToken({
      tenantId: input.tenantId,
      userId: input.userId,
      kind: input.kind,
      tokenHash: hashOpaqueToken(token),
      expiresAt: new Date(Date.now() + input.lifetimeMs),
    });

    const link = `${this.baseUrl()}${input.path}?token=${token}`;

    this.outbox.send({
      kind: input.kind,
      to: input.to,
      subject: input.subject,
      html: `<p><a href="${link}">${link}</a></p>`,
      link,
      createdAt: new Date(),
    });
  }

  private async requireSession(sessionToken: string | null) {
    if (!sessionToken) {
      throw new UnauthorizedException(SESSION_EXPIRED);
    }

    const repository = await this.authStorage.getRepository();
    const session = await repository.getActiveSessionByTokenHash(
      hashOpaqueToken(sessionToken),
      new Date(),
    );

    if (!session) {
      throw new UnauthorizedException(SESSION_EXPIRED);
    }

    await repository.touchSession(session.sessionId, new Date());

    const [user, settings] = await Promise.all([
      repository.getUserById(session.userId),
      repository.getTenantSettings(session.tenantId),
    ]);

    if (!user || !settings) {
      throw new UnauthorizedException(SESSION_EXPIRED);
    }

    return {
      session,
      payload: this.buildSessionPayload({
        membershipRole: session.role,
        settings,
        tenantId: session.tenantId,
        userId: user.id,
        userEmail: normalizeEmail(user.email),
      }),
    };
  }

  private buildSessionPayload(input: {
    tenantId: string;
    userId: string;
    userEmail: string;
    membershipRole: string;
    settings: TenantSettingsInput & { tenantId?: string };
  }): AuthSessionPayload {
    return {
      authenticated: true,
      tenant: {
        id: input.tenantId,
        businessName: input.settings.businessName,
        primaryEmail: input.settings.primaryEmail,
        whatsappPhone: input.settings.whatsappPhone,
        timezone: input.settings.timezone,
        defaultDueDay: input.settings.defaultDueDay,
        whatsappTemplateChargeInitial: input.settings.whatsappTemplateChargeInitial,
        whatsappTemplateReminder: input.settings.whatsappTemplateReminder,
        whatsappTemplatePaymentConfirmation:
          input.settings.whatsappTemplatePaymentConfirmation,
        reminderWindowStartHour: input.settings.reminderWindowStartHour,
        reminderWindowEndHour: input.settings.reminderWindowEndHour,
      },
      user: {
        id: input.userId,
        email: input.userEmail,
        role: input.membershipRole,
      },
    };
  }

  private baseUrl() {
    return process.env.APP_BASE_URL || 'http://localhost:3000';
  }

  private async recordLoginFailure(
    repository: Awaited<ReturnType<AuthStorageService['getRepository']>>,
    userId: string | null,
    email: string,
  ) {
    if (!userId) {
      return;
    }

    const membership = await repository.findPrimaryMembershipByUserId(userId);

    if (!membership) {
      return;
    }

    await repository.appendAuditEvent({
      tenantId: membership.tenantId,
      actorUserId: userId,
      actorEmail: email,
      eventType: 'auth.login_failed',
      summary: 'Tentativa de login rejeitada por credenciais inválidas.',
    });
  }
}
