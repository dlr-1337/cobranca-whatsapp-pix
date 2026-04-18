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

describe('Wallet flows (e2e)', () => {
  let app: INestApplication;
  let primaryAgent: SessionAgent;
  let secondaryAgent: SessionAgent;
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

    primaryAgent = request.agent(app.getHttpServer());
    secondaryAgent = request.agent(app.getHttpServer());
    authService = app.get(AuthService) as typeof authService;
    authService.clearOutbox?.();
  });

  afterEach(async () => {
    await app.close();
  });

  async function signupAndLogin(
    agent: SessionAgent,
    input: {
      businessName: string;
      primaryEmail: string;
      ownerEmail: string;
      whatsappPhone: string;
      defaultDueDay: number;
    },
  ) {
    await request(app.getHttpServer())
      .post('/auth/signup')
      .send({
        ...input,
        password: 'SenhaSegura123!',
        timezone: 'America/Sao_Paulo',
      })
      .expect(201);

    const confirmationMessage = (authService.listOutboxMessages?.() ?? []).find(
      (item) => item.to === input.ownerEmail && item.kind === 'email-confirmation',
    );

    if (!confirmationMessage) {
      throw new Error(`confirmation message not found for ${input.ownerEmail}`);
    }

    await request(app.getHttpServer())
      .post('/auth/confirm-email')
      .send({
        token: extractTokenFromLink(confirmationMessage.link),
      })
      .expect(200);

    await agent
      .post('/auth/login')
      .send({
        email: input.ownerEmail,
        password: 'SenhaSegura123!',
      })
      .expect(200);
  }

  it('creates customer, consent, billing plan, subscription, and returns tenant-scoped wallet state', async () => {
    await signupAndLogin(primaryAgent, {
      businessName: 'Academia Centro',
      primaryEmail: 'financeiro@academiacentro.com.br',
      ownerEmail: 'otavio@academiacentro.com.br',
      whatsappPhone: '+5511999999999',
      defaultDueDay: 5,
    });

    const customerResponse = await primaryAgent.post('/wallet/customers').send({
      name: 'Camila Rocha',
      whatsappPhone: '+55 (11) 99876-0001',
      notes: 'Prefere receber cobranca pela manha',
      status: 'active',
    });

    expect(customerResponse.status).toBe(201);
    expect(customerResponse.body).toMatchObject({
      name: 'Camila Rocha',
      whatsappPhoneDisplay: '+55 (11) 99876-0001',
      whatsappPhoneNormalized: '5511998760001',
      status: 'active',
      latestConsentByChannel: {
        whatsapp: null,
        email: null,
      },
    });

    const consentResponse = await primaryAgent
      .post(`/wallet/customers/${customerResponse.body.id}/consent-events`)
      .send({
        channel: 'whatsapp',
        status: 'opted-in',
        evidence: 'Autorizou no balcao em 2026-04-17',
        effectiveAt: '2026-04-17T09:30:00.000Z',
      });

    expect(consentResponse.status).toBe(201);
    expect(consentResponse.body).toMatchObject({
      customerId: customerResponse.body.id,
      channel: 'whatsapp',
      status: 'opted-in',
    });

    const planResponse = await primaryAgent.post('/wallet/plans').send({
      name: 'Mensalidade Pilates',
      amountCents: 18990,
      billingInterval: 'monthly',
      defaultDueDay: 7,
      messageTemplate: 'Ola {{customerName}}, segue sua cobranca Pix.',
      reminderProfile: 'manual',
      status: 'active',
    });

    expect(planResponse.status).toBe(201);
    expect(planResponse.body).toMatchObject({
      name: 'Mensalidade Pilates',
      amountCents: 18990,
      billingInterval: 'monthly',
      status: 'active',
    });

    const subscriptionResponse = await primaryAgent.post('/wallet/subscriptions').send({
      customerId: customerResponse.body.id,
      planId: planResponse.body.id,
      startDate: '2026-04-20T00:00:00.000Z',
      nextCycleStart: '2026-05-20T00:00:00.000Z',
      anchorDueDay: 10,
      overrideAmountCents: 19990,
      overrideDueDay: 10,
      transitionReason: 'Contrato inicial',
    });

    expect(subscriptionResponse.status).toBe(201);
    expect(subscriptionResponse.body).toMatchObject({
      customerId: customerResponse.body.id,
      planId: planResponse.body.id,
      status: 'active',
      overrideAmountCents: 19990,
      overrideDueDay: 10,
      lastTransitionReason: 'Contrato inicial',
    });

    const currentResponse = await primaryAgent.get('/wallet/current');

    expect(currentResponse.status).toBe(200);
    expect(currentResponse.body).toMatchObject({
      customers: [
        expect.objectContaining({
          id: customerResponse.body.id,
          latestConsentByChannel: {
            whatsapp: expect.objectContaining({
              status: 'opted-in',
            }),
            email: null,
          },
        }),
      ],
      consentEvents: [
        expect.objectContaining({
          customerId: customerResponse.body.id,
          status: 'opted-in',
        }),
      ],
      plans: [
        expect.objectContaining({
          id: planResponse.body.id,
          billingInterval: 'monthly',
        }),
      ],
      subscriptions: [
        expect.objectContaining({
          id: subscriptionResponse.body.id,
          status: 'active',
          lastTransitionReason: 'Contrato inicial',
        }),
      ],
    });
  });

  it('blocks duplicate phones unless the operator explicitly overrides the warning', async () => {
    await signupAndLogin(primaryAgent, {
      businessName: 'Oficina Nobre',
      primaryEmail: 'financeiro@oficinanobre.com.br',
      ownerEmail: 'ana@oficinanobre.com.br',
      whatsappPhone: '+5511977776666',
      defaultDueDay: 10,
    });

    await primaryAgent
      .post('/wallet/customers')
      .send({
        name: 'Primeiro Cliente',
        whatsappPhone: '+55 (11) 97777-6666',
        status: 'active',
      })
      .expect(201);

    const duplicateResponse = await primaryAgent.post('/wallet/customers').send({
      name: 'Mesmo Telefone',
      whatsappPhone: '11977776666',
      status: 'active',
    });

    expect(duplicateResponse.status).toBe(409);
    expect(duplicateResponse.body).toMatchObject({
      code: 'DUPLICATE_CUSTOMER_PHONE',
      message: expect.stringMatching(/telefone|duplicate|phone/i),
    });

    const overrideResponse = await primaryAgent.post('/wallet/customers').send({
      name: 'Mesmo Telefone',
      whatsappPhone: '11977776666',
      status: 'inactive',
      allowDuplicatePhone: true,
    });

    expect(overrideResponse.status).toBe(201);
    expect(overrideResponse.body).toMatchObject({
      name: 'Mesmo Telefone',
      status: 'inactive',
      whatsappPhoneNormalized: '5511977776666',
    });
  });

  it('keeps wallet data isolated between tenants and exposes append-only subscription history', async () => {
    await signupAndLogin(primaryAgent, {
      businessName: 'Clinica Horizonte',
      primaryEmail: 'financeiro@clinicahorizonte.com.br',
      ownerEmail: 'maria@clinicahorizonte.com.br',
      whatsappPhone: '+5511966665555',
      defaultDueDay: 12,
    });

    await signupAndLogin(secondaryAgent, {
      businessName: 'Studio Norte',
      primaryEmail: 'financeiro@studionorte.com.br',
      ownerEmail: 'paulo@studionorte.com.br',
      whatsappPhone: '+5511955554444',
      defaultDueDay: 15,
    });

    const customerResponse = await primaryAgent.post('/wallet/customers').send({
      name: 'Cliente A',
      whatsappPhone: '+5511911111111',
      status: 'active',
    });

    const planResponse = await primaryAgent.post('/wallet/plans').send({
      name: 'Plano Bronze',
      amountCents: 9900,
      billingInterval: 'monthly',
      defaultDueDay: 12,
      reminderProfile: 'manual',
      status: 'active',
    });

    const subscriptionResponse = await primaryAgent.post('/wallet/subscriptions').send({
      customerId: customerResponse.body.id,
      planId: planResponse.body.id,
      startDate: '2026-04-22T00:00:00.000Z',
      nextCycleStart: '2026-05-22T00:00:00.000Z',
      anchorDueDay: 12,
    });

    await primaryAgent
      .patch(`/wallet/subscriptions/${subscriptionResponse.body.id}`)
      .send({
        action: 'pause',
        effectiveAt: '2026-04-25T12:00:00.000Z',
        reason: 'Ferias da cliente',
      })
      .expect(200);

    await primaryAgent
      .patch(`/wallet/subscriptions/${subscriptionResponse.body.id}`)
      .send({
        action: 'reactivate',
        effectiveAt: '2026-05-01T09:00:00.000Z',
        reason: 'Retorno apos ferias',
      })
      .expect(200);

    await primaryAgent
      .patch(`/wallet/subscriptions/${subscriptionResponse.body.id}`)
      .send({
        action: 'cancel',
        effectiveAt: '2026-05-15T09:00:00.000Z',
        reason: 'Contrato encerrado',
      })
      .expect(200);

    const eventHistoryResponse = await primaryAgent.get(
      `/wallet/subscriptions/${subscriptionResponse.body.id}/events`,
    );
    const primaryCurrent = await primaryAgent.get('/wallet/current');
    const secondaryCurrent = await secondaryAgent.get('/wallet/current');

    expect(eventHistoryResponse.status).toBe(200);
    expect(eventHistoryResponse.body.map((event: { eventType: string }) => event.eventType)).toEqual([
      'canceled',
      'reactivated',
      'paused',
      'created',
    ]);
    expect(
      eventHistoryResponse.body.map((event: { toStatus: string }) => event.toStatus),
    ).toEqual(['canceled', 'active', 'paused', 'active']);

    expect(primaryCurrent.status).toBe(200);
    expect(secondaryCurrent.status).toBe(200);
    expect(primaryCurrent.body.customers).toHaveLength(1);
    expect(primaryCurrent.body.subscriptions).toHaveLength(1);
    expect(primaryCurrent.body.subscriptions[0]).toMatchObject({
      id: subscriptionResponse.body.id,
      status: 'canceled',
      lastTransitionReason: 'Contrato encerrado',
    });
    expect(secondaryCurrent.body.customers).toHaveLength(0);
    expect(secondaryCurrent.body.plans).toHaveLength(0);
    expect(secondaryCurrent.body.subscriptions).toHaveLength(0);
  });
});
