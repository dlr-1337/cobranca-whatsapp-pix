import { loadWorkerEnv } from '@cobrazap/config';
import {
  buildChargeMessagePreview,
  buildWhatsappDeepLink,
  MESSAGING_QUEUE_NAME,
  manualSendChargeMessageInputSchema,
  previewChargeMessageInputSchema,
  SYNC_CHARGE_REMINDERS_JOB,
  syncChargeReminderDispatches,
  type AuditEventType,
  type ManualSendChargeMessageInput,
  type PreviewChargeMessageInput,
} from '@cobrazap/domain';
import { Queue } from 'bullmq';
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  OnModuleDestroy,
} from '@nestjs/common';

import { TenantContextService } from '../../common/tenant/tenant-context.service';
import { AuthStorageService } from '../auth/auth-storage.service';

@Injectable()
export class MessagingService implements OnModuleDestroy {
  private messagingQueue?: Queue;

  constructor(
    @Inject(AuthStorageService)
    private readonly authStorage: AuthStorageService,
    @Inject(TenantContextService)
    private readonly tenantContext: TenantContextService,
  ) {}

  async onModuleDestroy() {
    if (this.messagingQueue) {
      await this.messagingQueue.close();
    }
  }

  async getCurrent(sessionToken: string | null) {
    const scope = await this.resolveSessionScope(sessionToken);
    const dispatches = await scope.repository.listMessageDispatches({
      tenantId: scope.tenantId,
      limit: 100,
    });

    return {
      dispatches,
    };
  }

  async previewChargeMessage(
    sessionToken: string | null,
    chargeId: string,
    input: PreviewChargeMessageInput,
  ) {
    const scope = await this.resolveSessionScope(sessionToken);
    const parsed = previewChargeMessageInputSchema.parse(input);
    const context = await scope.repository.getChargeMessagingContext({
      tenantId: scope.tenantId,
      chargeId,
    });

    if (!context) {
      throw new NotFoundException('Cobranca nao encontrada para o preview.');
    }

    try {
      return buildChargeMessagePreview(context, parsed);
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Nao foi possivel renderizar o preview.',
      );
    }
  }

  async manualSendChargeMessage(
    sessionToken: string | null,
    chargeId: string,
    input: ManualSendChargeMessageInput,
  ) {
    const scope = await this.resolveSessionScope(sessionToken);
    const parsed = manualSendChargeMessageInputSchema.parse(input);
    const preview = await this.previewChargeMessage(sessionToken, chargeId, parsed);
    let dispatch;

    if (parsed.dispatchId) {
      const existing = await scope.repository.getMessageDispatchById({
        tenantId: scope.tenantId,
        dispatchId: parsed.dispatchId,
      });

      if (!existing || existing.chargeId !== chargeId) {
        throw new NotFoundException('Dispatch de reminder nao encontrado.');
      }

      dispatch = await scope.repository.markMessageDispatchOpened({
        tenantId: scope.tenantId,
        dispatchId: parsed.dispatchId,
        transportUrl: preview.transportUrl,
        openedAt: new Date(),
      });
    } else {
      dispatch = await scope.repository.createMessageDispatch({
        tenantId: scope.tenantId,
        chargeId,
        templateKind: parsed.templateKind,
        trigger: 'manual',
        reminderSlot: parsed.reminderSlot ?? null,
        dispatchKey: `manual:${chargeId}:${parsed.templateKind}:${Date.now()}`,
        status: 'opened',
        renderedMessage: preview.renderedMessage,
        templateSnapshot: preview.templateSnapshot,
        recipientWhatsappPhone: preview.recipientWhatsappPhone,
        transportUrl: preview.transportUrl,
        openedAt: new Date(),
      });
    }

    await this.appendAudit(scope, {
      eventType: 'message.dispatch_opened',
      summary: `Dispatch WhatsApp ${dispatch?.id ?? 'unknown'} aberto para cobranca ${chargeId}.`,
    });

    return {
      chargeId,
      templateKind: preview.templateKind,
      reminderSlot: preview.reminderSlot,
      status: dispatch?.status ?? 'opened',
      dispatchId: dispatch?.id ?? null,
      renderedMessage: preview.renderedMessage,
      transportUrl: preview.transportUrl,
      recipientWhatsappPhone: preview.recipientWhatsappPhone,
    };
  }

  async syncChargeRemindersAsync(input: { tenantId: string; chargeId: string }) {
    if (process.env.NODE_ENV === 'test') {
      const repository = await this.authStorage.getRepository();
      const result = await syncChargeReminderDispatches(repository, {
        tenantId: input.tenantId,
        chargeId: input.chargeId,
      });

      if (result.insertedCount > 0 || result.canceledCount > 0) {
        await repository.appendAuditEvent({
          tenantId: input.tenantId,
          actorEmail: 'messaging-sync',
          eventType: 'message.reminders_synced',
          summary: `Reminder sync ${result.mode} para cobranca ${input.chargeId}.`,
        });
      }

      return result;
    }

    return this.getMessagingQueue().add(
      SYNC_CHARGE_REMINDERS_JOB,
      {
        tenantId: input.tenantId,
        correlationId: input.chargeId,
        chargeId: input.chargeId,
      },
      {
        jobId: `${input.tenantId}:${input.chargeId}`,
        removeOnComplete: 1_000,
        removeOnFail: 1_000,
      },
    );
  }

  buildTransportUrl(recipientWhatsappPhone: string, renderedMessage: string) {
    return buildWhatsappDeepLink(recipientWhatsappPhone, renderedMessage);
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

  private getMessagingQueue() {
    if (!this.messagingQueue) {
      const env = loadWorkerEnv(process.env);
      this.messagingQueue = new Queue(MESSAGING_QUEUE_NAME, {
        connection: env.redisConnection,
      });
    }

    return this.messagingQueue;
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
