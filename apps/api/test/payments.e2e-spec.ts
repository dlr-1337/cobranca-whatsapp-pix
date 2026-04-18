import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from './../src/app.module';
import { AuthService } from './../src/modules/auth/auth.service';
import { AuthStorageService } from './../src/modules/auth/auth-storage.service';

type SessionAgent = ReturnType<typeof request.agent>;

function extractTokenFromLink(link: string) {
  const url = new URL(link, 'http://localhost');
  const token = url.searchParams.get('token');

  if (!token) {
    throw new Error(`token not found in link: ${link}`);
  }

  return token;
}

describe('Payments flows (e2e)', () => {
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

  async function signupAndLogin() {
    await request(app.getHttpServer())
      .post('/auth/signup')
      .send({
        businessName: 'Financeiro Pilates',
        primaryEmail: 'financeiro@pilates.com.br',
        ownerEmail: 'owner@pilates.com.br',
        whatsappPhone: '+5511999888777',
        defaultDueDay: 7,
        password: 'SenhaSegura123!',
        timezone: 'America/Sao_Paulo',
      })
      .expect(201);

    const confirmationMessage = (authService.listOutboxMessages?.() ?? []).find(
      (item) => item.to === 'owner@pilates.com.br' && item.kind === 'email-confirmation',
    );

    if (!confirmationMessage) {
      throw new Error('confirmation message not found');
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
        email: 'owner@pilates.com.br',
        password: 'SenhaSegura123!',
      })
      .expect(200);
  }

  async function bootstrapCharge() {
    const customerResponse = await agent.post('/wallet/customers').send({
      name: 'Camila Rocha',
      whatsappPhone: '+55 11 99876-0001',
      status: 'active',
    });
    const chargeResponse = await agent.post('/charges').send({
      customerId: customerResponse.body.id,
      amountCents: 18990,
      dueDate: '2026-04-30T00:00:00.000Z',
      description: 'Mensalidade abril',
    });

    expect(customerResponse.status).toBe(201);
    expect(chargeResponse.status).toBe(201);

    return {
      customerId: customerResponse.body.id as string,
      chargeId: chargeResponse.body.id as string,
      amountCents: chargeResponse.body.amountCents as number,
      tenantId: chargeResponse.body.tenantId as string,
    };
  }

  it('creates Pix payment idempotently for a charge and exposes its current state', async () => {
    await signupAndLogin();
    const { chargeId } = await bootstrapCharge();

    const firstResponse = await agent
      .post(`/payments/charges/${chargeId}/pix`)
      .send();
    const secondResponse = await agent
      .post(`/payments/charges/${chargeId}/pix`)
      .send();
    const currentState = await agent.get(`/payments/charges/${chargeId}`);

    expect(firstResponse.status).toBe(201);
    expect(firstResponse.body).toMatchObject({
      chargeId,
      provider: 'asaas',
      status: 'awaiting_payment',
    });
    expect(firstResponse.body.providerPaymentId).toContain('pay_');
    expect(firstResponse.body.providerCustomerId).toContain('cus_');
    expect(firstResponse.body.pixCopyPasteCode).toContain('000201');
    expect(secondResponse.status).toBe(201);
    expect(secondResponse.body.providerPaymentId).toBe(firstResponse.body.providerPaymentId);
    expect(currentState.status).toBe(200);
    expect(currentState.body).toMatchObject({
      chargeId,
      providerPaymentId: firstResponse.body.providerPaymentId,
      status: 'awaiting_payment',
    });
  });

  it('accepts duplicated Asaas webhooks idempotently and marks the charge as paid after processing', async () => {
    await signupAndLogin();
    const { chargeId, amountCents } = await bootstrapCharge();

    const pixResponse = await agent
      .post(`/payments/charges/${chargeId}/pix`)
      .send();

    expect(pixResponse.status).toBe(201);

    const webhookPayload = {
      id: 'evt_test_0001',
      event: 'PAYMENT_RECEIVED',
      dateCreated: '2026-04-17 10:30:00',
      payment: {
        object: 'payment',
        id: pixResponse.body.providerPaymentId,
        customer: pixResponse.body.providerCustomerId,
        externalReference: chargeId,
        status: 'RECEIVED',
        value: amountCents / 100,
      },
    };

    const firstWebhook = await request(app.getHttpServer())
      .post('/payments/webhooks/asaas')
      .set('asaas-access-token', 'test-asaas-webhook-token')
      .send(webhookPayload);
    const duplicateWebhook = await request(app.getHttpServer())
      .post('/payments/webhooks/asaas')
      .set('asaas-access-token', 'test-asaas-webhook-token')
      .send(webhookPayload);
    const currentPayment = await agent.get(`/payments/charges/${chargeId}`);
    const chargesOverview = await agent.get('/charges/current');

    expect(firstWebhook.status).toBe(200);
    expect(firstWebhook.body).toEqual({
      received: true,
      duplicate: false,
    });
    expect(duplicateWebhook.status).toBe(200);
    expect(duplicateWebhook.body).toEqual({
      received: true,
      duplicate: true,
    });
    expect(currentPayment.status).toBe(200);
    expect(currentPayment.body).toMatchObject({
      chargeId,
      providerPaymentId: pixResponse.body.providerPaymentId,
      status: 'received',
    });
    expect(chargesOverview.status).toBe(200);
    expect(chargesOverview.body.summary).toMatchObject({
      receivedCount: 1,
      receivedCents: amountCents,
    });
  });

  it('replays failed provider events safely from the inbox', async () => {
    await signupAndLogin();
    const { chargeId, amountCents, tenantId } = await bootstrapCharge();

    const pixResponse = await agent
      .post(`/payments/charges/${chargeId}/pix`)
      .send();

    expect(pixResponse.status).toBe(201);

    const webhookPayload = {
      id: 'evt_test_replay_0001',
      event: 'PAYMENT_RECEIVED',
      dateCreated: '2026-04-17 10:30:00',
      payment: {
        object: 'payment',
        id: pixResponse.body.providerPaymentId,
        customer: pixResponse.body.providerCustomerId,
        externalReference: chargeId,
        status: 'RECEIVED',
        value: amountCents / 100,
      },
    };

    await request(app.getHttpServer())
      .post('/payments/webhooks/asaas')
      .set('asaas-access-token', 'test-asaas-webhook-token')
      .send(webhookPayload)
      .expect(200);

    const repository = await app.get(AuthStorageService).getRepository();
    await repository.markPaymentProviderEventFailed({
      tenantId,
      providerEventId: webhookPayload.id,
      processingSummary: 'forced failure before replay',
      processedAt: new Date('2026-04-17T11:00:00.000Z'),
    });

    const replayResponse = await agent
      .post(`/payments/provider-events/${webhookPayload.id}/replay`)
      .send();
    const currentPayment = await agent.get(`/payments/charges/${chargeId}`);
    const currentOperations = await agent.get('/payments/current');

    expect(replayResponse.status).toBe(202);
    expect(replayResponse.body).toEqual({
      accepted: true,
      mode: 'inline',
      providerEventId: webhookPayload.id,
    });
    expect(currentPayment.status).toBe(200);
    expect(currentPayment.body).toMatchObject({
      chargeId,
      providerPaymentId: pixResponse.body.providerPaymentId,
      status: 'received',
    });
    expect(currentOperations.status).toBe(200);
    expect(currentOperations.body.providerEvents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          providerEventId: webhookPayload.id,
          processingStatus: 'processed',
        }),
      ]),
    );
  });
});
