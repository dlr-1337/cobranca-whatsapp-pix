import { type AuditFiltersInput } from '@cobrazap/domain';
import { Controller, Get, Inject, Query, Req } from '@nestjs/common';
import type { Request } from 'express';

import { readSessionCookie } from '../auth/auth-cookie';
import { AuditService } from './audit.service';

@Controller('audit-events')
export class AuditController {
  constructor(@Inject(AuditService) private readonly auditService: AuditService) {}

  @Get()
  listEvents(
    @Req() request: Request,
    @Query() query: AuditFiltersInput,
  ) {
    return this.auditService.listEvents(readSessionCookie(request), query);
  }
}
