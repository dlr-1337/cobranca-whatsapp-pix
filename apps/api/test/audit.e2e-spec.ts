import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request, { type SuperAgentTest } from 'supertest';

import { AppModule } from './../src/app.module';
import { AuthService } from './../src/modules/auth/auth.service';

function extractTokenFromLink(link: string) {
  const url = new URL(link, 'http://localhost');
  const token = url.searchParams.get('token');

  if (!token) {
    throw new Error(`token not found in link: ${link}`);
  }

  return token;
}

describe('Audit flows (e2e)', () => {
  let app: INestApplication;
  let authService: AuthService & {
    listOutboxMessages?: () => Array<{
      kind: string;
      to: string;
      subject: string;
      link: string;
    }>;
    clearOutbox?: () => void;
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    authService = app.get(AuthService) as typeof authService;
    authService.clearOutbox?.();
  });

  afterEach(async () => {
    await app.close();
  });

  async function signupAndLogin(agent: SuperAgentTest, input: {
    businessName: string;
    primaryEmail: string;
    ownerEmail: string;
    password: string;
    whatsappPhone: string;
    defaultDueDay: number;
  }) {
    authService.clearOutbox?.();

    await request(app.getHttpServer())
      .post('/auth/signup')
      .send({
        ...input,
        timezone: 'America/Sao_Paulo',
      })
      .expect(201);

    const confirmationToken = extractTokenFromLink(
      (authService.listOutboxMessages?.() ?? [])[0].link,
    );

    await request(app.getHttpServer())
      .post('/auth/confirm-email')
      .send({ token: confirmationToken })
      .expect(200);

    await agent
      .post('/auth/login')
      .send({
        email: input.ownerEmail,
        password: input.password,
      })
      .expect(200);
  }

  it('keeps audit queries tenant-scoped and filterable', async () => {
    const tenantAAgent = request.agent(app.getHttpServer());
    const tenantBAgent = request.agent(app.getHttpServer());

    await signupAndLogin(tenantAAgent, {
      businessName: 'Academia Centro',
      primaryEmail: 'financeiro@academia.com.br',
      ownerEmail: 'otavio@academia.com.br',
      password: 'SenhaSegura123!',
      whatsappPhone: '+5511999999999',
      defaultDueDay: 5,
    });

    await signupAndLogin(tenantBAgent, {
      businessName: 'Oficina Nobre',
      primaryEmail: 'financeiro@oficina.com.br',
      ownerEmail: 'ana@oficina.com.br',
      password: 'SenhaSegura123!',
      whatsappPhone: '+5511988887777',
      defaultDueDay: 10,
    });

    await tenantAAgent
      .patch('/tenant-settings/current')
      .send({
        businessName: 'Academia Centro Premium',
        primaryEmail: 'financeiro@academia.com.br',
        whatsappPhone: '+5511977776666',
        timezone: 'America/Sao_Paulo',
        defaultDueDay: 7,
      })
      .expect(200);

    await tenantBAgent.post('/auth/logout').expect(204);

    await tenantBAgent
      .post('/auth/login')
      .send({
        email: 'ana@oficina.com.br',
        password: 'SenhaSegura123!',
      })
      .expect(200);

    const tenantAAudit = await tenantAAgent
      .get('/audit-events')
      .query({ period: '30d' });

    expect(tenantAAudit.status).toBe(200);
    expect(tenantAAudit.body.items).not.toHaveLength(0);
    expect(
      tenantAAudit.body.items.every(
        (item: { actorEmail?: string; tenantId: string }) =>
          item.tenantId !== undefined &&
          item.actorEmail !== 'ana@oficina.com.br',
      ),
    ).toBe(true);

    const tenantAFiltered = await tenantAAgent
      .get('/audit-events')
      .query({ period: '30d', type: 'tenant.settings_updated' });

    expect(tenantAFiltered.status).toBe(200);
    expect(tenantAFiltered.body.items).toHaveLength(1);
    expect(tenantAFiltered.body.items[0]).toMatchObject({
      actorEmail: 'otavio@academia.com.br',
      eventType: 'tenant.settings_updated',
    });

    const tenantBAudit = await tenantBAgent
      .get('/audit-events')
      .query({ period: '30d' });

    expect(tenantBAudit.status).toBe(200);
    expect(
      tenantBAudit.body.items.every(
        (item: { actorEmail?: string }) =>
          item.actorEmail !== 'otavio@academia.com.br',
      ),
    ).toBe(true);

    await request(app.getHttpServer()).get('/audit-events').expect(401);
  });
});
