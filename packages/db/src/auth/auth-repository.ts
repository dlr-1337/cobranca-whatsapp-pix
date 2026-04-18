import {
  normalizeEmail,
  slugifyTenantName,
  type AuthEmailTokenKind,
  type SessionRevocationReason,
  type SignupOwnerTenantInput,
  type TenantSettingsInput,
} from "@cobrazap/domain";
import {
  and,
  eq,
  gt,
  isNull,
  sql,
} from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import {
  authEmailTokens,
  authSessions,
  lower,
  memberships,
  tenantSettings,
  tenants,
  users,
} from "../schema/index.js";
import * as schema from "../schema/index.js";

export type AuthDatabase = NodePgDatabase<typeof schema>;

function createId() {
  return crypto.randomUUID();
}

function buildTenantSlug(name: string) {
  const base = slugifyTenantName(name) || "empresa";
  const suffix = crypto.randomUUID().slice(0, 8);
  return `${base}-${suffix}`;
}

export interface CreateSessionInput {
  tenantId: string;
  userId: string;
  membershipId: string;
  tokenHash: string;
  expiresAt: Date;
  createdAt?: Date;
  lastSeenAt?: Date;
  idleTimeoutMinutes: number;
  userAgent?: string | null;
  ipAddress?: string | null;
}

export interface RevokeAllUserSessionsInput {
  userId: string;
  tenantId: string;
  reason: SessionRevocationReason;
  revokedAt: Date;
}

export interface CreateEmailActionTokenInput {
  tenantId: string;
  userId: string;
  kind: AuthEmailTokenKind;
  tokenHash: string;
  expiresAt: Date;
}

export interface ConsumeEmailActionTokenInput {
  kind: AuthEmailTokenKind;
  tokenHash: string;
  consumedAt: Date;
}

export function createAuthRepository(db: AuthDatabase) {
  return {
    async bootstrapOwnerTenant(input: SignupOwnerTenantInput) {
      return db.transaction(async (tx) => {
        const tenantId = createId();
        const userId = createId();
        const membershipId = createId();
        const now = new Date();

        await tx.insert(tenants).values({
          id: tenantId,
          slug: buildTenantSlug(input.businessName),
          status: "pending-email-confirmation",
          createdAt: now,
          updatedAt: now,
        });

        await tx.insert(users).values({
          id: userId,
          email: normalizeEmail(input.ownerEmail),
          passwordHash: input.ownerPasswordHash,
          passwordChangedAt: now,
          createdAt: now,
          updatedAt: now,
        });

        await tx.insert(memberships).values({
          id: membershipId,
          tenantId,
          userId,
          role: "owner",
          createdAt: now,
        });

        await tx.insert(tenantSettings).values({
          tenantId,
          businessName: input.businessName,
          primaryEmail: normalizeEmail(input.primaryEmail),
          whatsappPhone: input.whatsappPhone,
          timezone: input.timezone,
          defaultDueDay: input.defaultDueDay,
          createdAt: now,
          updatedAt: now,
        });

        return {
          tenantId,
          userId,
          membershipId,
        };
      });
    },

    async findUserByEmail(email: string) {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(lower(users.email), email.toLowerCase()))
        .limit(1);

      return user ?? null;
    },

    async findPrimaryMembershipByUserId(userId: string) {
      const [membership] = await db
        .select()
        .from(memberships)
        .where(eq(memberships.userId, userId))
        .limit(1);

      return membership ?? null;
    },

    async getTenantById(tenantId: string) {
      const [tenant] = await db
        .select()
        .from(tenants)
        .where(eq(tenants.id, tenantId))
        .limit(1);

      return tenant ?? null;
    },

    async getUserById(userId: string) {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      return user ?? null;
    },

    async getTenantSettings(tenantId: string) {
      const [settings] = await db
        .select()
        .from(tenantSettings)
        .where(eq(tenantSettings.tenantId, tenantId))
        .limit(1);

      return settings ?? null;
    },

    async updateTenantSettings(tenantId: string, input: TenantSettingsInput) {
      const [settings] = await db
        .update(tenantSettings)
        .set({
          businessName: input.businessName,
          primaryEmail: normalizeEmail(input.primaryEmail),
          whatsappPhone: input.whatsappPhone,
          timezone: input.timezone,
          defaultDueDay: input.defaultDueDay,
          whatsappTemplateChargeInitial: input.whatsappTemplateChargeInitial,
          whatsappTemplateReminder: input.whatsappTemplateReminder,
          whatsappTemplatePaymentConfirmation:
            input.whatsappTemplatePaymentConfirmation,
          reminderWindowStartHour: input.reminderWindowStartHour,
          reminderWindowEndHour: input.reminderWindowEndHour,
          updatedAt: new Date(),
        })
        .where(eq(tenantSettings.tenantId, tenantId))
        .returning();

      return settings ?? null;
    },

    async markUserEmailVerified(userId: string, verifiedAt: Date) {
      const [user] = await db
        .update(users)
        .set({
          emailVerified: true,
          emailVerifiedAt: verifiedAt,
          updatedAt: verifiedAt,
        })
        .where(eq(users.id, userId))
        .returning();

      return user ?? null;
    },

    async activateTenant(tenantId: string, activatedAt: Date) {
      const [tenant] = await db
        .update(tenants)
        .set({
          status: "active",
          updatedAt: activatedAt,
        })
        .where(eq(tenants.id, tenantId))
        .returning();

      return tenant ?? null;
    },

    async updateUserPassword(userId: string, passwordHash: string, changedAt: Date) {
      const [user] = await db
        .update(users)
        .set({
          passwordHash,
          passwordChangedAt: changedAt,
          updatedAt: changedAt,
        })
        .where(eq(users.id, userId))
        .returning();

      return user ?? null;
    },

    async createSession(input: CreateSessionInput) {
      const createdAt = input.createdAt ?? new Date();
      const [session] = await db
        .insert(authSessions)
        .values({
          id: createId(),
          tenantId: input.tenantId,
          userId: input.userId,
          membershipId: input.membershipId,
          tokenHash: input.tokenHash,
          expiresAt: input.expiresAt,
          lastSeenAt: input.lastSeenAt ?? createdAt,
          idleTimeoutMinutes: input.idleTimeoutMinutes,
          userAgent: input.userAgent ?? null,
          ipAddress: input.ipAddress ?? null,
          createdAt,
        })
        .returning();

      return session;
    },

    async getActiveSessionByTokenHash(tokenHash: string, now: Date) {
      const [session] = await db
        .select({
          sessionId: authSessions.id,
          tenantId: authSessions.tenantId,
          userId: authSessions.userId,
          membershipId: authSessions.membershipId,
          expiresAt: authSessions.expiresAt,
          lastSeenAt: authSessions.lastSeenAt,
          idleTimeoutMinutes: authSessions.idleTimeoutMinutes,
          role: memberships.role,
        })
        .from(authSessions)
        .innerJoin(memberships, eq(memberships.id, authSessions.membershipId))
        .where(
          and(
            eq(authSessions.tokenHash, tokenHash),
            isNull(authSessions.revokedAt),
            gt(authSessions.expiresAt, now),
          ),
        )
        .limit(1);

      if (!session) {
        return null;
      }

      const idleExpiry =
        session.lastSeenAt.getTime() + session.idleTimeoutMinutes * 60_000;

      if (idleExpiry <= now.getTime()) {
        return null;
      }

      return session;
    },

    async touchSession(sessionId: string, touchedAt: Date) {
      const [session] = await db
        .update(authSessions)
        .set({
          lastSeenAt: touchedAt,
        })
        .where(eq(authSessions.id, sessionId))
        .returning();

      return session ?? null;
    },

    async revokeAllUserSessions(input: RevokeAllUserSessionsInput) {
      return db
        .update(authSessions)
        .set({
          revokedAt: input.revokedAt,
          revokedReason: input.reason,
        })
        .where(
          and(
            eq(authSessions.userId, input.userId),
            eq(authSessions.tenantId, input.tenantId),
            isNull(authSessions.revokedAt),
          ),
        )
        .returning();
    },

    async revokeSessionByTokenHash(
      tokenHash: string,
      reason: SessionRevocationReason,
      revokedAt: Date,
    ) {
      const [session] = await db
        .update(authSessions)
        .set({
          revokedAt,
          revokedReason: reason,
        })
        .where(
          and(
            eq(authSessions.tokenHash, tokenHash),
            isNull(authSessions.revokedAt),
          ),
        )
        .returning();

      return session ?? null;
    },

    async createEmailActionToken(input: CreateEmailActionTokenInput) {
      const [token] = await db
        .insert(authEmailTokens)
        .values({
          id: createId(),
          tenantId: input.tenantId,
          userId: input.userId,
          kind: input.kind,
          tokenHash: input.tokenHash,
          expiresAt: input.expiresAt,
        })
        .returning();

      return token;
    },

    async consumeEmailActionToken(input: ConsumeEmailActionTokenInput) {
      const [token] = await db
        .update(authEmailTokens)
        .set({
          consumedAt: input.consumedAt,
        })
        .where(
          and(
            eq(authEmailTokens.kind, input.kind),
            eq(authEmailTokens.tokenHash, input.tokenHash),
            isNull(authEmailTokens.consumedAt),
            gt(authEmailTokens.expiresAt, input.consumedAt),
          ),
        )
        .returning();

      return token ?? null;
    },

    async getTenantBootstrapSnapshot(tenantId: string, userId: string) {
      const [record] = await db
        .select({
          tenant: tenants,
          user: users,
          membership: memberships,
          settings: tenantSettings,
        })
        .from(tenants)
        .innerJoin(tenantSettings, eq(tenantSettings.tenantId, tenants.id))
        .innerJoin(memberships, eq(memberships.tenantId, tenants.id))
        .innerJoin(users, eq(users.id, memberships.userId))
        .where(and(eq(tenants.id, tenantId), eq(users.id, userId)))
        .limit(1);

      if (!record) {
        throw new Error("bootstrap snapshot not found");
      }

      return record;
    },

    async getUserSessions(userId: string) {
      return db
        .select()
        .from(authSessions)
        .where(eq(authSessions.userId, userId));
    },

    async getLatestTokenForUser(userId: string, kind: AuthEmailTokenKind) {
      const [token] = await db
        .select()
        .from(authEmailTokens)
        .where(
          and(eq(authEmailTokens.userId, userId), eq(authEmailTokens.kind, kind)),
        )
        .orderBy(sql`${authEmailTokens.createdAt} desc`)
        .limit(1);

      return token ?? null;
    },
  };
}

export type AuthRepository = ReturnType<typeof createAuthRepository>;
