import {
  chargeEventFiltersSchema,
  chargeFiltersSchema,
  createManualChargeInputSchema,
  generateRecurringChargesInputSchema,
  transitionChargeInputSchema,
  type AuditEventType,
  type ChargeEventFiltersInput,
  type ChargeFiltersInput,
  type CreateManualChargeInput,
  type GenerateRecurringChargesInput,
  type TransitionChargeInput,
} from '@cobrazap/domain';
import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { TenantContextService } from '../../common/tenant/tenant-context.service';
import { AuthStorageService } from '../auth/auth-storage.service';
import { MessagingService } from '../messaging/messaging.service';

@Injectable()
export class ChargesService {
  constructor(
    @Inject(AuthStorageService)
    private readonly authStorage: AuthStorageService,
    @Inject(TenantContextService)
    private readonly tenantContext: TenantContextService,
    @Inject(MessagingService)
    private readonly messagingService: MessagingService,
  ) {}

  async getCurrent(sessionToken: string | null) {
    const { repository, tenantId } = await this.resolveScope(sessionToken);

    return repository.getChargesOverview({
      tenantId,
    });
  }

  async listCharges(sessionToken: string | null, filters: ChargeFiltersInput) {
    const { repository, tenantId } = await this.resolveScope(sessionToken);
    const parsed = chargeFiltersSchema.parse(filters);

    return repository.listCharges({
      ...parsed,
      tenantId,
    });
  }

  async createManualCharge(
    sessionToken: string | null,
    input: CreateManualChargeInput,
  ) {
    const scope = await this.resolveScope(sessionToken);
    const parsed = createManualChargeInputSchema.parse(input);

    try {
      const charge = await scope.repository.createManualCharge({
        ...parsed,
        tenantId: scope.tenantId,
        actorUserId: scope.actorUserId,
        actorEmail: scope.actorEmail,
      });

      await this.appendAudit(scope, {
        eventType: 'charge.created',
        summary: `Cobranca manual ${charge.id} criada para cliente ${charge.customerId}.`,
      });

      return charge;
    } catch (error) {
      this.rethrowChargesError(error);
    }
  }

  async generateRecurringCharges(
    sessionToken: string | null,
    input: GenerateRecurringChargesInput,
  ) {
    const scope = await this.resolveScope(sessionToken);
    const parsed = generateRecurringChargesInputSchema.parse(input);

    try {
      const result = await scope.repository.generateRecurringCharges({
        ...parsed,
        tenantId: scope.tenantId,
        actorUserId: scope.actorUserId,
        actorEmail: scope.actorEmail,
      });

      await this.appendAudit(scope, {
        eventType: 'charge.recurring_generated',
        summary: `Geracao recorrente executada com ${result.generatedCount} cobrancas na referencia ${result.referenceDate.toISOString()}.`,
      });

      return result;
    } catch (error) {
      this.rethrowChargesError(error);
    }
  }

  async updateCharge(
    sessionToken: string | null,
    chargeId: string,
    input: TransitionChargeInput,
  ) {
    const scope = await this.resolveScope(sessionToken);
    const parsed = transitionChargeInputSchema.parse(input);

    try {
      if (parsed.action === 'mark-paid') {
        const charge = await scope.repository.markChargePaid({
          ...parsed,
          tenantId: scope.tenantId,
          chargeId,
          actorUserId: scope.actorUserId,
          actorEmail: scope.actorEmail,
        });

        if (!charge) {
          throw new NotFoundException('Cobranca nao encontrada.');
        }

        await this.appendAudit(scope, {
          eventType: 'charge.marked_paid',
          summary: `Cobranca ${charge.id} marcada como paga.`,
        });
        await this.messagingService.syncChargeRemindersAsync({
          tenantId: scope.tenantId,
          chargeId: charge.id,
        });

        return charge;
      }

      if (parsed.action === 'cancel') {
        const charge = await scope.repository.cancelCharge({
          ...parsed,
          tenantId: scope.tenantId,
          chargeId,
          actorUserId: scope.actorUserId,
          actorEmail: scope.actorEmail,
        });

        if (!charge) {
          throw new NotFoundException('Cobranca nao encontrada.');
        }

        await this.appendAudit(scope, {
          eventType: 'charge.canceled',
          summary: `Cobranca ${charge.id} cancelada.`,
        });
        await this.messagingService.syncChargeRemindersAsync({
          tenantId: scope.tenantId,
          chargeId: charge.id,
        });

        return charge;
      }

      const result = await scope.repository.replaceCharge({
        ...parsed,
        tenantId: scope.tenantId,
        chargeId,
        actorUserId: scope.actorUserId,
        actorEmail: scope.actorEmail,
      });

      if (!result) {
        throw new NotFoundException('Cobranca nao encontrada.');
      }

      await this.appendAudit(scope, {
        eventType: 'charge.replaced',
        summary: `Cobranca ${result.replacedCharge?.id ?? chargeId} substituida por ${result.replacementCharge.id}.`,
      });
      await this.messagingService.syncChargeRemindersAsync({
        tenantId: scope.tenantId,
        chargeId,
      });

      return result;
    } catch (error) {
      this.rethrowChargesError(error);
    }
  }

  async listChargeEvents(
    sessionToken: string | null,
    chargeId: string,
    filters: ChargeEventFiltersInput,
  ) {
    const { repository, tenantId } = await this.resolveScope(sessionToken);
    const parsed = chargeEventFiltersSchema.parse(filters);

    return repository.listChargeEvents({
      ...parsed,
      tenantId,
      chargeId,
    });
  }

  private async resolveScope(sessionToken: string | null) {
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

  private rethrowChargesError(error: unknown): never {
    if (error instanceof NotFoundException) {
      throw error;
    }

    if (
      error &&
      typeof error === 'object' &&
      'message' in error &&
      typeof error.message === 'string'
    ) {
      if (
        error.message.includes('Customer not found') ||
        error.message.includes('Billing plan not found')
      ) {
        throw new NotFoundException('Dependencia da cobranca nao encontrada.');
      }

      if (error.message.includes('Cannot ') && error.message.includes(' charge from status ')) {
        throw new ConflictException({
          code: 'CHARGE_STATE_CONFLICT',
          message: 'A cobranca nao esta aberta para esta operacao.',
        });
      }
    }

    throw error;
  }
}
