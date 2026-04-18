import {
  auditFiltersSchema,
  type AuditFiltersInput,
} from '@cobrazap/domain';
import { Inject, Injectable } from '@nestjs/common';

import { TenantContextService } from '../../common/tenant/tenant-context.service';
import { AuthStorageService } from '../auth/auth-storage.service';

const PERIOD_TO_DAYS = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
} as const;

@Injectable()
export class AuditService {
  constructor(
    @Inject(AuthStorageService)
    private readonly authStorage: AuthStorageService,
    @Inject(TenantContextService)
    private readonly tenantContext: TenantContextService,
  ) {}

  async listEvents(sessionToken: string | null, filters: AuditFiltersInput) {
    const parsed = auditFiltersSchema.parse(filters);
    const context = await this.tenantContext.resolve(sessionToken);
    const repository = await this.authStorage.getRepository();
    const from = new Date();

    from.setDate(from.getDate() - PERIOD_TO_DAYS[parsed.period]);

    const items = await repository.listAuditEvents({
      tenantId: context.payload.tenant.id,
      from,
      actor: parsed.actor,
      type: parsed.type,
    });

    return {
      items,
    };
  }
}
