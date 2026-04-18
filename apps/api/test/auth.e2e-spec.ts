import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from './../src/app.module';
import { AuthService } from './../src/modules/auth/auth.service';

type SessionAgent = ReturnType<typeof request.agent>;

function extractTokenFromLink(link: string) {
  const url = new URL(link, 'http://localhost');
  const token = url.searchParams.get('token');

  if (!token) {
    throw new Error(`token not found in link: ${link}`);
  }

  return token;
}

describe('Auth flows (e2e)', () => {
  let app: INestApplication;
  let agent: SessionAgent;
  let authService: AuthService & {
    listOutboxMessages?: () => Array<{
      kind: string;
      to: string;
      subject: string;
      link: string;
    }>;
    clearOutbox?: () => void;
  };

  function requireFirstOutboxMessage(
    messages: Array<{
      kind: string;
      to: string;
      subject: string;
      link: string;
    }>,
    context: string,
  ) {
    const message = messages[0];

    if (!message) {
      throw new Error(`expected outbox message for ${context}`);
    }

    return message;
  }

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    agent = request.agent(app.getHttpServer());
    authService = app.get(AuthService) as typeof authService;
    authService.clearOutbox?.();
  });

  afterEach(async () => {
    await app.close();
  });

  it('signs up, confirms email, logs in, resolves the session, and updates tenant settings', async () => {
    const signupResponse = await request(app.getHttpServer())
      .post('/auth/signup')
      .send({
        businessName: 'Academia Centro',
        primaryEmail: 'financeiro@academiacentro.com.br',
        ownerEmail: 'otavio@academiacentro.com.br',
        password: 'SenhaSegura123!',
        whatsappPhone: '+5511999999999',
        timezone: 'America/Sao_Paulo',
        defaultDueDay: 5,
      });

    expect(signupResponse.status).toBe(201);
    expect(signupResponse.body).toEqual({
      requiresEmailConfirmation: true,
    });

    const outboxMessages = authService.listOutboxMessages?.() ?? [];
    expect(outboxMessages).toHaveLength(1);
    expect(
      requireFirstOutboxMessage(outboxMessages, 'email confirmation'),
    ).toMatchObject({
      kind: 'email-confirmation',
      to: 'otavio@academiacentro.com.br',
    });

    const loginBeforeConfirmation = await agent.post('/auth/login').send({
      email: 'otavio@academiacentro.com.br',
      password: 'SenhaSegura123!',
    });

    expect(loginBeforeConfirmation.status).toBe(401);
    expect(loginBeforeConfirmation.body).toMatchObject({
      message: 'Email ou senha invalidos.',
    });

    const confirmationToken = extractTokenFromLink(
      requireFirstOutboxMessage(outboxMessages, 'email confirmation').link,
    );

    const confirmResponse = await request(app.getHttpServer())
      .post('/auth/confirm-email')
      .send({
        token: confirmationToken,
      });

    expect(confirmResponse.status).toBe(200);
    expect(confirmResponse.body).toEqual({
      confirmed: true,
    });

    const loginResponse = await agent.post('/auth/login').send({
      email: 'otavio@academiacentro.com.br',
      password: 'SenhaSegura123!',
    });

    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body).toMatchObject({
      tenant: {
        businessName: 'Academia Centro',
      },
      user: {
        email: 'otavio@academiacentro.com.br',
      },
    });

    const sessionResponse = await agent.get('/auth/session');

    expect(sessionResponse.status).toBe(200);
    expect(sessionResponse.body).toMatchObject({
      authenticated: true,
      tenant: {
        businessName: 'Academia Centro',
      },
      user: {
        email: 'otavio@academiacentro.com.br',
      },
    });

    const settingsResponse = await agent.get('/tenant-settings/current');

    expect(settingsResponse.status).toBe(200);
    expect(settingsResponse.body).toMatchObject({
      businessName: 'Academia Centro',
      primaryEmail: 'financeiro@academiacentro.com.br',
      timezone: 'America/Sao_Paulo',
      defaultDueDay: 5,
    });

    const updateResponse = await agent.patch('/tenant-settings/current').send({
      businessName: 'Academia Centro Premium',
      primaryEmail: 'financeiro@academiacentro.com.br',
      whatsappPhone: '+5511988887777',
      timezone: 'America/Sao_Paulo',
      defaultDueDay: 7,
    });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body).toMatchObject({
      businessName: 'Academia Centro Premium',
      whatsappPhone: '+5511988887777',
      defaultDueDay: 7,
    });
  });

  it('returns generic reset messaging, resets the password, and revokes older sessions', async () => {
    await request(app.getHttpServer())
      .post('/auth/signup')
      .send({
        businessName: 'Oficina Nobre',
        primaryEmail: 'financeiro@oficinanobre.com.br',
        ownerEmail: 'ana@oficinanobre.com.br',
        password: 'SenhaSegura123!',
        whatsappPhone: '+5511977776666',
        timezone: 'America/Sao_Paulo',
        defaultDueDay: 10,
      })
      .expect(201);

    const signupOutbox = authService.listOutboxMessages?.() ?? [];
    const confirmationToken = extractTokenFromLink(
      requireFirstOutboxMessage(signupOutbox, 'signup confirmation').link,
    );

    await request(app.getHttpServer())
      .post('/auth/confirm-email')
      .send({ token: confirmationToken })
      .expect(200);

    await agent
      .post('/auth/login')
      .send({
        email: 'ana@oficinanobre.com.br',
        password: 'SenhaSegura123!',
      })
      .expect(200);

    authService.clearOutbox?.();

    const forgotKnown = await request(app.getHttpServer())
      .post('/auth/forgot-password')
      .send({
        email: 'ana@oficinanobre.com.br',
      });

    const forgotUnknown = await request(app.getHttpServer())
      .post('/auth/forgot-password')
      .send({
        email: 'naoexiste@oficinanobre.com.br',
      });

    expect(forgotKnown.status).toBe(202);
    expect(forgotUnknown.status).toBe(202);
    expect(forgotKnown.body).toEqual(forgotUnknown.body);

    const resetOutbox = authService.listOutboxMessages?.() ?? [];
    expect(resetOutbox).toHaveLength(1);
    expect(requireFirstOutboxMessage(resetOutbox, 'password reset').kind).toBe(
      'password-reset',
    );

    const resetToken = extractTokenFromLink(
      requireFirstOutboxMessage(resetOutbox, 'password reset').link,
    );

    const resetResponse = await request(app.getHttpServer())
      .post('/auth/reset-password')
      .send({
        token: resetToken,
        password: 'NovaSenha456!',
        confirmPassword: 'NovaSenha456!',
      });

    expect(resetResponse.status).toBe(200);
    expect(resetResponse.body).toEqual({
      reset: true,
    });

    const oldSession = await agent.get('/auth/session');
    expect(oldSession.status).toBe(401);

    const loginWithOldPassword = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'ana@oficinanobre.com.br',
        password: 'SenhaSegura123!',
      });

    expect(loginWithOldPassword.status).toBe(401);

    const loginWithNewPassword = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'ana@oficinanobre.com.br',
        password: 'NovaSenha456!',
      });

    expect(loginWithNewPassword.status).toBe(200);
  });

  it('revokes the active session on logout and blocks anonymous settings access', async () => {
    const anonymousSettings = await request(app.getHttpServer()).get(
      '/tenant-settings/current',
    );

    expect(anonymousSettings.status).toBe(401);

    await request(app.getHttpServer())
      .post('/auth/signup')
      .send({
        businessName: 'Clinica Horizonte',
        primaryEmail: 'financeiro@clinicahorizonte.com.br',
        ownerEmail: 'maria@clinicahorizonte.com.br',
        password: 'SenhaSegura123!',
        whatsappPhone: '+5511966665555',
        timezone: 'America/Sao_Paulo',
        defaultDueDay: 12,
      })
      .expect(201);

    const confirmationToken = extractTokenFromLink(
      requireFirstOutboxMessage(
        authService.listOutboxMessages?.() ?? [],
        'logout flow confirmation',
      ).link,
    );

    await request(app.getHttpServer())
      .post('/auth/confirm-email')
      .send({ token: confirmationToken })
      .expect(200);

    await agent
      .post('/auth/login')
      .send({
        email: 'maria@clinicahorizonte.com.br',
        password: 'SenhaSegura123!',
      })
      .expect(200);

    const logoutResponse = await agent.post('/auth/logout');
    expect(logoutResponse.status).toBe(204);

    const sessionAfterLogout = await agent.get('/auth/session');
    expect(sessionAfterLogout.status).toBe(401);
  });
});
