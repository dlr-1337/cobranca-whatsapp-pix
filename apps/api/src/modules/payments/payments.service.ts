import { loadPaymentsEnv, loadWorkerEnv } from '@cobrazap/config';
import {
  PAYMENTS_QUEUE_NAME,
  PROCESS_PROVIDER_EVENT_JOB,
  syncChargePaymentWithProviderSnapshot,
  type AuditEventType,
} from '@cobrazap/domain';
import {
  HttpAsaasClient,
  InMemoryAsaasClient,
  parseAsaasWebhookEvent,
  type AsaasClient,
} from '@cobrazap/integrations';
import { Queue } from 'bullmq';
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  OnModuleDestroy,
  UnauthorizedException,
} from '@nestjs/common';

import { TenantContextService } from '../../common/tenant/tenant-context.service';
import { AuthStorageService } from '../auth/auth-storage.service';
import { MessagingService } from '../messaging/messaging.service';

@Injectable()
export class PaymentsService implements OnModuleDestroy {
  private testAsaasClient?: InMemoryAsaasClient;
  private httpAsaasClient?: HttpAsaasClient;
  private paymentsQueue?: Queue;

  constructor(
    @Inject(AuthStorageService)
    private readonly authStorage: AuthStorageService,
    @Inject(TenantContextService)
    private readonly tenantContext: TenantContextService,
    @Inject(MessagingService)
    private readonly messagingService: MessagingService,
  ) {}

  async onModuleDestroy() {
    if (this.paymentsQueue) {
      await this.paymentsQueue.close();
    }
  }

  async createPixForCharge(sessionToken: string | null, chargeId: string) {
    const scope = await this.resolveSessionScope(sessionToken);
    const charge = await scope.repository.getChargeById({
      tenantId: scope.tenantId,
      chargeId,
    });

    if (!charge) {
      throw new NotFoundException('Cobranca nao encontrada.');
    }

    const existing = await scope.repository.getChargePaymentByChargeId({
      tenantId: scope.tenantId,
      chargeId,
    });

    if (existing) {
      return existing;
    }

    const customer = await scope.repository.getCustomerById({
      tenantId: scope.tenantId,
      customerId: charge.customerId,
    });

    if (!customer) {
      throw new NotFoundException('Cliente da cobranca nao encontrado.');
    }

    const asaasClient = this.getAsaasClient();
    const providerMapping =
      (await scope.repository.getPaymentProviderCustomer({
        tenantId: scope.tenantId,
        customerId: charge.customerId,
        provider: 'asaas',
      })) ??
      (await this.createProviderCustomer(scope, asaasClient, {
        customerId: charge.customerId,
        customerName: customer.name,
        whatsappPhone:
          customer.whatsappPhoneNormalized ?? customer.whatsappPhoneDisplay ?? '',
      }));
    const pixPayment = await asaasClient.createPixPayment({
      providerCustomerId: providerMapping.providerCustomerId,
      valueCents: charge.amountCents,
      dueDate: charge.dueDate,
      externalReference: charge.id,
      description: charge.description ?? null,
    });
    const paymentRecord = await scope.repository.upsertChargePayment({
      tenantId: scope.tenantId,
      chargeId: charge.id,
      provider: 'asaas',
      providerCustomerId: providerMapping.providerCustomerId,
      providerPaymentId: pixPayment.providerPaymentId,
      externalReference: charge.id,
      status: pixPayment.status,
      pixCopyPasteCode: pixPayment.pixCopyPasteCode,
      qrCodeBase64: pixPayment.qrCodeBase64,
      expiresAt: pixPayment.expiresAt,
      lastSyncedAt: new Date(),
      rawChargePayload: pixPayment.rawChargePayload,
      rawQrCodePayload: pixPayment.rawQrCodePayload,
    });

    await this.appendAudit(scope, {
      eventType: 'payment.pix_generated',
      summary: `Pix ${paymentRecord.providerPaymentId} gerado para cobranca ${charge.id}.`,
    });
    await this.messagingService.syncChargeRemindersAsync({
      tenantId: scope.tenantId,
      chargeId: charge.id,
    });

    return paymentRecord;
  }

  async getChargePayment(sessionToken: string | null, chargeId: string) {
    const scope = await this.resolveSessionScope(sessionToken);
    const payment = await scope.repository.getChargePaymentByChargeId({
      tenantId: scope.tenantId,
      chargeId,
    });

    if (!payment) {
      throw new NotFoundException('Pagamento Pix nao encontrado para a cobranca.');
    }

    return payment;
  }

  async getCurrentOperations(sessionToken: string | null) {
    const scope = await this.resolveSessionScope(sessionToken);
    const [chargePayments, providerEvents, reconciliationRuns] = await Promise.all([
      scope.repository.listChargePayments({
        tenantId: scope.tenantId,
        provider: 'asaas',
      }),
      scope.repository.listPaymentProviderEvents({
        tenantId: scope.tenantId,
        provider: 'asaas',
        limit: 20,
      }),
      scope.repository.listPaymentReconciliationRuns({
        tenantId: scope.tenantId,
        provider: 'asaas',
      }),
    ]);

    return {
      chargePayments,
      providerEvents,
      reconciliationRuns,
    };
  }

  async receiveAsaasWebhook(
    asaasAccessToken: string | undefined,
    rawPayload: Record<string, unknown>,
  ) {
    this.assertAsaasWebhookToken(asaasAccessToken);

    const parsedEvent = parseAsaasWebhookEvent(rawPayload);

    if (!parsedEvent.providerEventId || (!parsedEvent.providerPaymentId && !parsedEvent.externalReference)) {
      throw new BadRequestException('Payload de webhook Asaas sem identificadores minimos.');
    }

    const repository = await this.authStorage.getRepository();
    const tenantRecord = await this.resolveWebhookTenant(repository, parsedEvent);

    if (!tenantRecord) {
      throw new NotFoundException('Webhook Asaas nao pode ser associado a uma cobranca interna.');
    }

    const ingested = await repository.ingestPaymentProviderEvent({
      tenantId: tenantRecord.tenantId,
      provider: 'asaas',
      providerEventId: parsedEvent.providerEventId,
      eventType: parsedEvent.eventType,
      providerPaymentId: parsedEvent.providerPaymentId,
      externalReference: parsedEvent.externalReference,
      rawPayload,
    });

    await repository.appendAuditEvent({
      tenantId: tenantRecord.tenantId,
      actorEmail: 'asaas-webhook',
      eventType: 'payment.webhook_received',
      summary: `Webhook ${parsedEvent.eventType} recebido para cobranca ${tenantRecord.chargeId}.`,
      occurredAt: parsedEvent.occurredAt,
    });

    if (ingested.inserted) {
      if (process.env.NODE_ENV === 'test') {
        await this.processAsaasEvent(tenantRecord.tenantId, parsedEvent.providerEventId);
      } else {
        await this.getPaymentsQueue().add(
          PROCESS_PROVIDER_EVENT_JOB,
          {
            tenantId: tenantRecord.tenantId,
            correlationId: parsedEvent.providerEventId,
            providerEventId: parsedEvent.providerEventId,
          },
          {
            jobId: `${tenantRecord.tenantId}:${parsedEvent.providerEventId}`,
            removeOnComplete: 1_000,
            removeOnFail: 1_000,
          },
        );
      }
    }

    return {
      received: true,
      duplicate: !ingested.inserted,
    };
  }

  async runManualReconciliation(sessionToken: string | null) {
    const scope = await this.resolveSessionScope(sessionToken);
    const asaasClient = this.getAsaasClient();
    const startedAt = new Date();
    const payments = await scope.repository.listChargePayments({
      tenantId: scope.tenantId,
      provider: 'asaas',
    });
    const items: Array<{
      chargeId: string;
      providerPaymentId: string;
      outcome: 'matched' | 'updated' | 'diverged' | 'failed';
      internalStatus: string;
      providerStatus: string;
      summary: string;
    }> = [];

    for (const payment of payments) {
      try {
        const providerSnapshot = await asaasClient.getPayment(payment.providerPaymentId);
        const syncResult = await syncChargePaymentWithProviderSnapshot(scope.repository, {
          tenantId: scope.tenantId,
          provider: 'asaas',
          providerPaymentId: providerSnapshot.providerPaymentId,
          externalReference: providerSnapshot.externalReference,
          providerCustomerId: providerSnapshot.providerCustomerId,
          status: providerSnapshot.status,
          lastSyncedAt: new Date(),
          pixCopyPasteCode: providerSnapshot.pixCopyPasteCode,
          qrCodeBase64: providerSnapshot.qrCodeBase64,
          expiresAt: providerSnapshot.expiresAt,
          rawChargePayload: providerSnapshot.rawChargePayload,
          rawQrCodePayload: providerSnapshot.rawQrCodePayload,
          paidAmountCents: providerSnapshot.valueCents,
        });

        items.push({
          chargeId: syncResult.chargeId,
          providerPaymentId: providerSnapshot.providerPaymentId,
          outcome: syncResult.outcome,
          internalStatus: syncResult.previousStatus ?? 'not_synced',
          providerStatus: providerSnapshot.status,
          summary: this.reconciliationSummary(syncResult.outcome, providerSnapshot.status),
        });
        await this.messagingService.syncChargeRemindersAsync({
          tenantId: scope.tenantId,
          chargeId: syncResult.chargeId,
        });
      } catch (error) {
        items.push({
          chargeId: payment.chargeId,
          providerPaymentId: payment.providerPaymentId,
          outcome: 'failed',
          internalStatus: payment.status,
          providerStatus: 'unavailable',
          summary:
            error instanceof Error
              ? error.message
              : 'Falha desconhecida ao consultar o PSP.',
        });
      }
    }

    const run = await scope.repository.recordPaymentReconciliationRun({
      tenantId: scope.tenantId,
      provider: 'asaas',
      trigger: 'manual',
      matchedCount: items.filter((item) => item.outcome === 'matched').length,
      updatedCount: items.filter((item) => item.outcome === 'updated').length,
      divergenceCount: items.filter((item) => item.outcome === 'diverged').length,
      failedCount: items.filter((item) => item.outcome === 'failed').length,
      startedAt,
      finishedAt: new Date(),
      items,
    });

    await this.appendAudit(scope, {
      eventType: 'payment.reconciliation_run',
      summary: `Reconciliacao manual Pix executada com ${items.length} pagamentos avaliados.`,
    });

    return run;
  }

  async replayProviderEvent(sessionToken: string | null, providerEventId: string) {
    const scope = await this.resolveSessionScope(sessionToken);
    const storedEvent = await scope.repository.getPaymentProviderEvent({
      tenantId: scope.tenantId,
      providerEventId,
    });

    if (!storedEvent) {
      throw new NotFoundException('Evento Pix nao encontrado na inbox.');
    }

    if (storedEvent.processingStatus !== 'failed') {
      throw new BadRequestException(
        'Somente eventos com falha podem ser reenfileirados manualmente.',
      );
    }

    if (process.env.NODE_ENV === 'test') {
      await this.processAsaasEvent(scope.tenantId, providerEventId);
      await this.appendAudit(scope, {
        eventType: 'payment.event_replayed',
        summary: `Replay manual aplicado inline ao evento Pix ${providerEventId}.`,
      });

      return {
        accepted: true,
        mode: 'inline',
        providerEventId,
      };
    }

    await this.getPaymentsQueue().add(
      PROCESS_PROVIDER_EVENT_JOB,
      {
        tenantId: scope.tenantId,
        correlationId: providerEventId,
        providerEventId,
      },
      {
        jobId: `replay:${scope.tenantId}:${providerEventId}:${Date.now()}`,
        removeOnComplete: 1_000,
        removeOnFail: 1_000,
      },
    );
    await this.appendAudit(scope, {
      eventType: 'payment.event_replayed',
      summary: `Replay manual solicitado para o evento Pix ${providerEventId}.`,
    });

    return {
      accepted: true,
      mode: 'queued',
      providerEventId,
    };
  }

  async listReconciliationRuns(sessionToken: string | null) {
    const scope = await this.resolveSessionScope(sessionToken);

    return scope.repository.listPaymentReconciliationRuns({
      tenantId: scope.tenantId,
      provider: 'asaas',
    });
  }

  async processAsaasEvent(tenantId: string, providerEventId: string) {
    const repository = await this.authStorage.getRepository();
    const storedEvent = await repository.getPaymentProviderEvent({
      tenantId,
      providerEventId,
    });

    if (!storedEvent) {
      throw new NotFoundException('Evento Pix nao encontrado na inbox.');
    }

    const parsedEvent = parseAsaasWebhookEvent(
      storedEvent.rawPayload as Record<string, unknown>,
    );

    try {
      const result = await syncChargePaymentWithProviderSnapshot(repository, {
        tenantId,
        provider: 'asaas',
        providerPaymentId: parsedEvent.providerPaymentId ?? '',
        externalReference: parsedEvent.externalReference,
        providerCustomerId: parsedEvent.providerCustomerId,
        status: parsedEvent.paymentStatus,
        lastSyncedAt: parsedEvent.occurredAt,
        rawChargePayload: parsedEvent.rawChargePayload,
        paidAmountCents: parsedEvent.paidAmountCents,
      });

      await repository.markPaymentProviderEventProcessed({
        tenantId,
        providerEventId,
        processingSummary: `Evento aplicado com resultado ${result.outcome}.`,
        processedAt: new Date(),
      });
      await this.messagingService.syncChargeRemindersAsync({
        tenantId,
        chargeId: result.chargeId,
      });

      return result;
    } catch (error) {
      await repository.markPaymentProviderEventFailed({
        tenantId,
        providerEventId,
        processingSummary:
          error instanceof Error ? error.message : 'Falha desconhecida no processamento Pix.',
        processedAt: new Date(),
      });
      throw error;
    }
  }

  private getAsaasClient(): AsaasClient {
    if (process.env.NODE_ENV === 'test') {
      this.testAsaasClient ??= new InMemoryAsaasClient();
      return this.testAsaasClient;
    }

    const env = loadPaymentsEnv(process.env);

    if (!env.apiKey) {
      throw new Error('ASAAS_API_KEY is required to enable Pix payments.');
    }

    this.httpAsaasClient ??= new HttpAsaasClient({
      apiKey: env.apiKey,
      baseUrl: env.apiBaseUrl,
      userAgent: env.userAgent,
    });

    return this.httpAsaasClient;
  }

  private getPaymentsQueue() {
    if (!this.paymentsQueue) {
      const env = loadWorkerEnv(process.env);
      this.paymentsQueue = new Queue(PAYMENTS_QUEUE_NAME, {
        connection: env.redisConnection,
      });
    }

    return this.paymentsQueue;
  }

  private assertAsaasWebhookToken(receivedToken: string | undefined) {
    const env = loadPaymentsEnv(process.env);
    const expectedToken =
      env.webhookToken ?? (process.env.NODE_ENV === 'test' ? 'test-asaas-webhook-token' : null);

    if (!expectedToken || receivedToken !== expectedToken) {
      throw new UnauthorizedException('Token de webhook Asaas invalido.');
    }
  }

  private async createProviderCustomer(
    scope: Awaited<ReturnType<PaymentsService['resolveSessionScope']>>,
    asaasClient: AsaasClient,
    input: {
      customerId: string;
      customerName: string;
      whatsappPhone: string;
    },
  ) {
    const created = await asaasClient.createCustomer({
      name: input.customerName,
      mobilePhone: input.whatsappPhone,
      externalReference: input.customerId,
    });

    return scope.repository.linkPaymentProviderCustomer({
      tenantId: scope.tenantId,
      customerId: input.customerId,
      provider: 'asaas',
      providerCustomerId: created.id,
      customerNameSnapshot: input.customerName,
      whatsappPhoneSnapshot: input.whatsappPhone,
    });
  }

  private async resolveSessionScope(sessionToken: string | null) {
    const [context, repository] = await Promise.all([
      this.tenantContext.resolve(sessionToken),
      this.authStorage.getRepository(),
    ]);

    return {
      repository,
      tenantId: context.payload.tenant.id,
      actorUserId: context.payload.user.id,
      actorEmail: context.payload.user.email,
    };
  }

  private async resolveWebhookTenant(
    repository: Awaited<ReturnType<AuthStorageService['getRepository']>>,
    input: ReturnType<typeof parseAsaasWebhookEvent>,
  ) {
    if (input.providerPaymentId) {
      const payment = await repository.findChargePaymentByProviderPaymentId({
        provider: 'asaas',
        providerPaymentId: input.providerPaymentId,
      });

      if (payment) {
        return {
          tenantId: payment.tenantId,
          chargeId: payment.chargeId,
        };
      }
    }

    if (input.externalReference) {
      const charge = await repository.findChargeById({
        chargeId: input.externalReference,
      });

      if (charge) {
        return {
          tenantId: charge.tenantId,
          chargeId: charge.id,
        };
      }
    }

    return null;
  }

  private reconciliationSummary(
    outcome: 'matched' | 'updated' | 'diverged',
    providerStatus: string,
  ) {
    switch (outcome) {
      case 'matched':
        return `Estado interno ja alinhado com o PSP (${providerStatus}).`;
      case 'updated':
        return `Estado interno atualizado a partir do PSP (${providerStatus}).`;
      case 'diverged':
        return `Divergencia operacional detectada para status ${providerStatus}.`;
    }
  }

  private async appendAudit(
    scope: {
      repository: Awaited<ReturnType<AuthStorageService['getRepository']>>;
      tenantId: string;
      actorUserId: string;
      actorEmail: string;
    },
    input: {
      eventType: AuditEventType;
      summary: string;
    },
  ) {
    await scope.repository.appendAuditEvent({
      tenantId: scope.tenantId,
      actorUserId: scope.actorUserId,
      actorEmail: scope.actorEmail,
      eventType: input.eventType,
      summary: input.summary,
    });
  }
}
