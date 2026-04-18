import { Module } from '@nestjs/common';

import { TenantContextModule } from '../../common/tenant/tenant-context.module';
import { AuthModule } from '../auth/auth.module';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';

@Module({
  imports: [AuthModule, TenantContextModule],
  controllers: [AuditController],
  providers: [AuditService],
})
export class AuditModule {}
