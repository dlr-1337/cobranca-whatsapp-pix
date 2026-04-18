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

describe('Messaging flows (e2e)', () => {
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
        businessName: 'Clinica Aurora',
        primaryEmail: 'financeiro@aurora.com.br',
        ownerEmail: 'owner@aurora.com.br',
        whatsappPhone: '+5511999444333',
        defaultDueDay: 7,
        password: 'SenhaSegura123!',
        timezone: 'America/Sao_Paulo',
      })
      .expect(201);

    const confirmationMessage = (authService.listOutboxMessages?.() ?? []).find(
      (item) => item.to === 'owner@aurora.com.br' && item.kind === 'email-confirmation',
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
        email: 'owner@aurora.com.br',
        password: 'SenhaSegura123!',
      })
      .expect(200);
  }

  async function bootstrapCharge() {
    const customerResponse = await agent.post('/wallet/customers').send({
      name: 'Vanessa Lima',
      whatsappPhone: '+55 11 99876-0001',
      status: 'active',
    });
    const chargeResponse = await agent.post('/charges').send({
      customerId: customerResponse.body.id,
      amountCents: 21990,
      dueDate: '2026-04-30T00:00:00.000Z',
      description: 'Mensalidade abril',
    });

    expect(customerResponse.status).toBe(201);
    expect(chargeResponse.status).toBe(201);

    return {
      chargeId: chargeResponse.body.id as string,
      amountCents: chargeResponse.body.amountCents as number,
    };
  }

  it('renders preview, records assisted send, and cancels reminders after payment confirmation', async () => {
    await signupAndLogin();
    const { chargeId, amountCents } = await bootstrapCharge();

    const pixResponse = await agent.post(`/payments/charges/${chargeId}/pix`).send();

    expect(pixResponse.status).toBe(201);

    const previewResponse = await agent.get(
      `/messaging/charges/${chargeId}/preview?templateKind=charge_initial`,
    );
    const sendResponse = await agent.post(`/messaging/charges/${chargeId}/manual-send`).send({
      templateKind: 'charge_initial',
    });
    const beforePaymentSnapshot = await agent.get('/messaging/current');

    expect(previewResponse.status).toBe(200);
    expect(previewResponse.body).toMatchObject({
      chargeId,
      templateKind: 'charge_initial',
      recipientWhatsappPhone: '5511998760001',
    });
    expect(previewResponse.body.renderedMessage).toContain('Vanessa Lima');
    expect(previewResponse.body.renderedMessage).toContain('219,90');
    expect(previewResponse.body.renderedMessage).toContain('000201');
    expect(sendResponse.status).toBe(201);
    expect(sendResponse.body).toMatchObject({
      chargeId,
      templateKind: 'charge_initial',
      status: 'opened',
    });
    expect(sendResponse.body.transportUrl).toContain('https://wa.me/5511998760001?text=');
    expect(beforePaymentSnapshot.status).toBe(200);
    expect(beforePaymentSnapshot.body.dispatches).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          chargeId,
          templateKind: 'charge_initial',
          status: 'opened',
        }),
        expect.objectContaining({
          chargeId,
          templateKind: 'charge_reminder',
          reminderSlot: 'd-1',
          status: 'scheduled',
        }),
        expect.objectContaining({
          chargeId,
          templateKind: 'charge_reminder',
          reminderSlot: 'd0',
          status: 'scheduled',
        }),
        expect.objectContaining({
          chargeId,
          templateKind: 'charge_reminder',
          reminderSlot: 'd+1',
          status: 'scheduled',
        }),
      ]),
    );

    await request(app.getHttpServer())
      .post('/payments/webhooks/asaas')
      .set('asaas-access-token', 'test-asaas-webhook-token')
      .send({
        id: 'evt_test_msg_0001',
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
      })
      .expect(200);

    const afterPaymentSnapshot = await agent.get('/messaging/current');

    expect(afterPaymentSnapshot.status).toBe(200);
    expect(afterPaymentSnapshot.body.dispatches).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          chargeId,
          templateKind: 'charge_reminder',
          reminderSlot: 'd-1',
          status: 'canceled',
        }),
        expect.objectContaining({
          chargeId,
          templateKind: 'charge_reminder',
          reminderSlot: 'd0',
          status: 'canceled',
        }),
        expect.objectContaining({
          chargeId,
          templateKind: 'charge_reminder',
          reminderSlot: 'd+1',
          status: 'canceled',
        }),
      ]),
    );
  });
});
