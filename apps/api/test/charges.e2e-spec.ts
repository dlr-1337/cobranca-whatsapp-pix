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

describe('Charges flows (e2e)', () => {
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

  async function bootstrapWallet(agent: SessionAgent) {
    const customer = await agent.post('/wallet/customers').send({
      name: 'Camila Rocha',
      whatsappPhone: '+55 (11) 99876-0001',
      status: 'active',
    });
    const plan = await agent.post('/wallet/plans').send({
      name: 'Mensalidade Pilates',
      amountCents: 18990,
      billingInterval: 'monthly',
      defaultDueDay: 7,
      reminderProfile: 'manual',
      status: 'active',
    });

    return {
      customerId: customer.body.id as string,
      planId: plan.body.id as string,
    };
  }

  it('creates manual charges and exposes an aggregated charges dashboard', async () => {
    await signupAndLogin(primaryAgent, {
      businessName: 'Academia Centro',
      primaryEmail: 'financeiro@academiacentro.com.br',
      ownerEmail: 'otavio@academiacentro.com.br',
      whatsappPhone: '+5511999999999',
      defaultDueDay: 5,
    });

    const { customerId, planId } = await bootstrapWallet(primaryAgent);

    const createResponse = await primaryAgent.post('/charges').send({
      customerId,
      planId,
      amountCents: 21990,
      dueDate: '2026-12-05T00:00:00.000Z',
      description: 'Cobranca avulsa de matricula',
    });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body).toMatchObject({
      customerId,
      planId,
      origin: 'manual',
      status: 'open',
      amountCents: 21990,
    });

    const currentResponse = await primaryAgent.get('/charges/current');

    expect(currentResponse.status).toBe(200);
    expect(currentResponse.body).toMatchObject({
      summary: expect.objectContaining({
        dueSoonCount: 1,
        dueSoonCents: 21990,
        receivedCount: 0,
      }),
      charges: [
        expect.objectContaining({
          id: createResponse.body.id,
          customerName: 'Camila Rocha',
          planName: 'Mensalidade Pilates',
        }),
      ],
      chargeEvents: [
        expect.objectContaining({
          chargeId: createResponse.body.id,
          eventType: 'created',
        }),
      ],
    });
  });

  it('generates recurring charges idempotently and advances the subscription cursor', async () => {
    await signupAndLogin(primaryAgent, {
      businessName: 'Studio Movimento',
      primaryEmail: 'financeiro@studiomovimento.com.br',
      ownerEmail: 'bianca@studiomovimento.com.br',
      whatsappPhone: '+5511988887777',
      defaultDueDay: 7,
    });

    const { customerId, planId } = await bootstrapWallet(primaryAgent);

    const subscriptionResponse = await primaryAgent.post('/wallet/subscriptions').send({
      customerId,
      planId,
      startDate: '2026-01-10T00:00:00.000Z',
      nextCycleStart: '2026-02-10T00:00:00.000Z',
      anchorDueDay: 7,
    });

    expect(subscriptionResponse.status).toBe(201);

    const firstGeneration = await primaryAgent
      .post('/charges/generate-recurring')
      .send({
        referenceDate: '2026-04-12T00:00:00.000Z',
      });
    const secondGeneration = await primaryAgent
      .post('/charges/generate-recurring')
      .send({
        referenceDate: '2026-04-12T00:00:00.000Z',
      });
    const chargesResponse = await primaryAgent.get('/charges').query({
      origin: 'recurring',
    });
    const walletResponse = await primaryAgent.get('/wallet/current');

    expect(firstGeneration.status).toBe(201);
    expect(firstGeneration.body).toMatchObject({
      generatedCount: 3,
      processedSubscriptions: 1,
    });
    expect(secondGeneration.status).toBe(201);
    expect(secondGeneration.body).toMatchObject({
      generatedCount: 0,
      processedSubscriptions: 0,
    });
    expect(chargesResponse.status).toBe(200);
    expect(chargesResponse.body).toHaveLength(3);
    expect(chargesResponse.body.map((charge: { competenceKey: string }) => charge.competenceKey)).toEqual([
      '2026-04',
      '2026-03',
      '2026-02',
    ]);
    expect(walletResponse.status).toBe(200);
    expect(walletResponse.body.subscriptions[0]).toMatchObject({
      id: subscriptionResponse.body.id,
      nextCycleStart: '2026-05-10T00:00:00.000Z',
    });
  });

  it('supports mark-paid, replace, cancel and keeps charge history isolated per tenant', async () => {
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

    const { customerId } = await bootstrapWallet(primaryAgent);

    const openCharge = await primaryAgent.post('/charges').send({
      customerId,
      amountCents: 12000,
      dueDate: '2026-04-01T00:00:00.000Z',
      description: 'Mensalidade abril',
    });
    const payableCharge = await primaryAgent.post('/charges').send({
      customerId,
      amountCents: 15000,
      dueDate: '2026-12-15T00:00:00.000Z',
      description: 'Mensalidade futura',
    });

    const paidResponse = await primaryAgent
      .patch(`/charges/${payableCharge.body.id}`)
      .send({
        action: 'mark-paid',
        occurredAt: new Date().toISOString(),
        reason: 'Pagamento confirmado na recepcao',
      });
    const replaceResponse = await primaryAgent
      .patch(`/charges/${openCharge.body.id}`)
      .send({
        action: 'replace',
        occurredAt: new Date(Date.now() + 60_000).toISOString(),
        reason: 'Reemissao com novo vencimento',
        amountCents: 13500,
        dueDate: '2026-04-30T00:00:00.000Z',
      });
    const cancelResponse = await primaryAgent
      .patch(`/charges/${replaceResponse.body.replacementCharge.id}`)
      .send({
        action: 'cancel',
        occurredAt: new Date(Date.now() + 120_000).toISOString(),
        reason: 'Acordo fechado fora do sistema',
      });
    const currentResponse = await primaryAgent.get('/charges/current');
    const eventHistoryResponse = await primaryAgent.get(
      `/charges/${openCharge.body.id}/events`,
    );
    const secondaryCurrent = await secondaryAgent.get('/charges/current');

    expect(paidResponse.status).toBe(200);
    expect(paidResponse.body).toMatchObject({
      id: payableCharge.body.id,
      status: 'paid',
    });
    expect(replaceResponse.status).toBe(200);
    expect(replaceResponse.body).toMatchObject({
      replacedCharge: expect.objectContaining({
        id: openCharge.body.id,
        status: 'replaced',
      }),
      replacementCharge: expect.objectContaining({
        status: 'open',
        replacesChargeId: openCharge.body.id,
      }),
    });
    expect(cancelResponse.status).toBe(200);
    expect(cancelResponse.body).toMatchObject({
      id: replaceResponse.body.replacementCharge.id,
      status: 'canceled',
    });
    expect(currentResponse.status).toBe(200);
    expect(currentResponse.body.summary).toMatchObject({
      receivedCount: 1,
      receivedCents: 15000,
      dueSoonCount: 0,
      overdueCount: 0,
    });
    expect(eventHistoryResponse.status).toBe(200);
    expect(eventHistoryResponse.body.map((event: { eventType: string }) => event.eventType)).toEqual([
      'replaced',
      'created',
    ]);
    expect(secondaryCurrent.status).toBe(200);
    expect(secondaryCurrent.body.charges).toHaveLength(0);
  });
});
