import {
  appendCustomerConsentEventInputSchema,
  billingPlanFiltersSchema,
  createBillingPlanInputSchema,
  createCustomerInputSchema,
  createSubscriptionInputSchema,
  customerConsentFiltersSchema,
  customerFiltersSchema,
  subscriptionEventFiltersSchema,
  subscriptionFiltersSchema,
  subscriptionLifecycleCommandSchema,
  updateBillingPlanInputSchema,
  updateCustomerInputSchema,
  updateSubscriptionInputSchema,
  type AuditEventType,
  type BillingPlanFiltersInput,
  type CreateBillingPlanInput,
  type CreateCustomerInput,
  type CreateSubscriptionInput,
  type CustomerConsentFiltersInput,
  type CustomerFiltersInput,
  type SubscriptionEventFiltersInput,
  type SubscriptionFiltersInput,
  type SubscriptionLifecycleCommandInput,
  type UpdateBillingPlanInput,
  type UpdateCustomerInput,
  type UpdateSubscriptionInput,
} from '@cobrazap/domain';
import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { TenantContextService } from '../../common/tenant/tenant-context.service';
import { AuthStorageService } from '../auth/auth-storage.service';

@Injectable()
export class WalletService {
  constructor(
    @Inject(AuthStorageService)
    private readonly authStorage: AuthStorageService,
    @Inject(TenantContextService)
    private readonly tenantContext: TenantContextService,
  ) {}

  async getCurrent(sessionToken: string | null) {
    const { repository, tenantId } = await this.resolveWalletScope(sessionToken);

    return repository.getWalletOverview({
      tenantId,
    });
  }

  async listCustomers(sessionToken: string | null, filters: CustomerFiltersInput) {
    const { repository, tenantId } = await this.resolveWalletScope(sessionToken);
    const parsed = customerFiltersSchema.parse(filters);

    return repository.listCustomers({
      ...parsed,
      tenantId,
    });
  }

  async createCustomer(sessionToken: string | null, input: CreateCustomerInput) {
    const scope = await this.resolveWalletScope(sessionToken);
    const parsed = createCustomerInputSchema.parse(input);

    try {
      const customer = await scope.repository.createCustomer({
        ...parsed,
        tenantId: scope.tenantId,
      });

      if (!customer) {
        throw new Error('Failed to create customer.');
      }

      await this.appendAudit(scope, {
        eventType: 'customer.created',
        summary: `Cliente ${customer.name} criado na carteira.`,
      });

      return customer;
    } catch (error) {
      this.rethrowWalletError(error);
    }
  }

  async updateCustomer(
    sessionToken: string | null,
    customerId: string,
    input: UpdateCustomerInput,
  ) {
    const scope = await this.resolveWalletScope(sessionToken);
    const parsed = updateCustomerInputSchema.parse(input);

    try {
      const customer = await scope.repository.updateCustomer({
        ...parsed,
        tenantId: scope.tenantId,
        customerId,
      });

      if (!customer) {
        throw new NotFoundException('Cliente nao encontrado.');
      }

      await this.appendAudit(scope, {
        eventType: 'customer.updated',
        summary: `Cliente ${customer.name} atualizado na carteira.`,
      });

      return customer;
    } catch (error) {
      this.rethrowWalletError(error);
    }
  }

  async listCustomerConsentEvents(
    sessionToken: string | null,
    customerId: string,
    filters: CustomerConsentFiltersInput,
  ) {
    const { repository, tenantId } = await this.resolveWalletScope(sessionToken);
    const parsed = customerConsentFiltersSchema.parse(filters);

    return repository.listCustomerConsentEvents({
      ...parsed,
      tenantId,
      customerId,
    });
  }

  async appendCustomerConsentEvent(
    sessionToken: string | null,
    customerId: string,
    input: {
      channel: string;
      status: string;
      evidence: string;
      effectiveAt: string;
    },
  ) {
    const scope = await this.resolveWalletScope(sessionToken);
    const parsed = appendCustomerConsentEventInputSchema.parse({
      ...input,
      tenantId: scope.tenantId,
      customerId,
      actorUserId: scope.actorUserId,
      actorEmail: scope.actorEmail,
    });

    const event = await scope.repository.appendCustomerConsentEvent(parsed);

    if (!event) {
      throw new Error('Failed to append consent event.');
    }

    await this.appendAudit(scope, {
      eventType: 'customer.consent_recorded',
      summary: `Consentimento ${event.channel}:${event.status} registrado para cliente ${event.customerId}.`,
    });

    return event;
  }

  async listConsentEvents(sessionToken: string | null, filters: CustomerConsentFiltersInput) {
    const { repository, tenantId } = await this.resolveWalletScope(sessionToken);
    const parsed = customerConsentFiltersSchema.parse(filters);

    if (parsed.customerId) {
      return repository.listCustomerConsentEvents({
        ...parsed,
        tenantId,
        customerId: parsed.customerId,
      });
    }

    return repository.listConsentEvents({
      tenantId,
    });
  }

  async listBillingPlans(
    sessionToken: string | null,
    filters: BillingPlanFiltersInput,
  ) {
    const { repository, tenantId } = await this.resolveWalletScope(sessionToken);
    const parsed = billingPlanFiltersSchema.parse(filters);

    return repository.listBillingPlans({
      ...parsed,
      tenantId,
    });
  }

  async createBillingPlan(sessionToken: string | null, input: CreateBillingPlanInput) {
    const scope = await this.resolveWalletScope(sessionToken);
    const parsed = createBillingPlanInputSchema.parse(input);
    const plan = await scope.repository.createBillingPlan({
      ...parsed,
      tenantId: scope.tenantId,
    });

    if (!plan) {
      throw new Error('Failed to create billing plan.');
    }

    await this.appendAudit(scope, {
      eventType: 'plan.created',
      summary: `Plano ${plan.name} criado com intervalo ${plan.billingInterval}.`,
    });

    return plan;
  }

  async updateBillingPlan(
    sessionToken: string | null,
    planId: string,
    input: UpdateBillingPlanInput,
  ) {
    const scope = await this.resolveWalletScope(sessionToken);
    const parsed = updateBillingPlanInputSchema.parse(input);
    const plan = await scope.repository.updateBillingPlan({
      ...parsed,
      tenantId: scope.tenantId,
      planId,
    });

    if (!plan) {
      throw new NotFoundException('Plano nao encontrado.');
    }

    await this.appendAudit(scope, {
      eventType: 'plan.updated',
      summary: `Plano ${plan.name} atualizado para status ${plan.status}.`,
    });

    return plan;
  }

  async listSubscriptions(
    sessionToken: string | null,
    filters: SubscriptionFiltersInput,
  ) {
    const { repository, tenantId } = await this.resolveWalletScope(sessionToken);
    const parsed = subscriptionFiltersSchema.parse(filters);

    return repository.listSubscriptions({
      ...parsed,
      tenantId,
    });
  }

  async createSubscription(
    sessionToken: string | null,
    input: CreateSubscriptionInput,
  ) {
    const scope = await this.resolveWalletScope(sessionToken);
    const parsed = createSubscriptionInputSchema.parse(input);
    const subscription = await scope.repository.createSubscription({
      ...parsed,
      tenantId: scope.tenantId,
      actorUserId: scope.actorUserId,
      actorEmail: scope.actorEmail,
    });

    await this.appendAudit(scope, {
      eventType: 'subscription.created',
      summary: `Assinatura ${subscription.id} criada para cliente ${subscription.customerId}.`,
    });

    return subscription;
  }

  async updateSubscription(
    sessionToken: string | null,
    subscriptionId: string,
    input:
      | (UpdateSubscriptionInput & { action?: undefined })
      | ({ action: 'pause' | 'reactivate' | 'cancel' } & SubscriptionLifecycleCommandInput),
  ) {
    const scope = await this.resolveWalletScope(sessionToken);

    if ('action' in input && input.action) {
      const parsed = subscriptionLifecycleCommandSchema.parse(input);
      const operation = {
        pause: scope.repository.pauseSubscription.bind(scope.repository),
        reactivate: scope.repository.reactivateSubscription.bind(scope.repository),
        cancel: scope.repository.cancelSubscription.bind(scope.repository),
      }[input.action];

      const subscription = await operation({
        ...parsed,
        tenantId: scope.tenantId,
        subscriptionId,
        actorUserId: scope.actorUserId,
        actorEmail: scope.actorEmail,
      });

      if (!subscription) {
        throw new NotFoundException('Assinatura nao encontrada.');
      }

      const auditEventByAction: Record<
        'pause' | 'reactivate' | 'cancel',
        AuditEventType
      > = {
        pause: 'subscription.paused',
        reactivate: 'subscription.reactivated',
        cancel: 'subscription.canceled',
      };

      await this.appendAudit(scope, {
        eventType: auditEventByAction[input.action],
        summary: `Assinatura ${subscription.id} marcada como ${subscription.status}.`,
      });

      return subscription;
    }

    const parsed = updateSubscriptionInputSchema.parse(input);
    const subscription = await scope.repository.updateSubscription({
      ...parsed,
      tenantId: scope.tenantId,
      subscriptionId,
    });

    if (!subscription) {
      throw new NotFoundException('Assinatura nao encontrada.');
    }

    return subscription;
  }

  async listSubscriptionEvents(
    sessionToken: string | null,
    subscriptionId: string,
    filters: SubscriptionEventFiltersInput,
  ) {
    const { repository, tenantId } = await this.resolveWalletScope(sessionToken);
    const parsed = subscriptionEventFiltersSchema.parse(filters);

    return repository.listSubscriptionEvents({
      ...parsed,
      tenantId,
      subscriptionId,
    });
  }

  private async resolveWalletScope(sessionToken: string | null) {
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

  private rethrowWalletError(error: unknown): never {
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === 'DUPLICATE_CUSTOMER_PHONE'
    ) {
      throw new ConflictException({
        code: 'DUPLICATE_CUSTOMER_PHONE',
        message: 'Ja existe um cliente com este telefone neste tenant.',
      });
    }

    throw error;
  }
}
