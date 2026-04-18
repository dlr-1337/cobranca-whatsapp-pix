import { Module } from '@nestjs/common';

import { AuthModule } from '../../modules/auth/auth.module';
import { TenantContextService } from './tenant-context.service';

@Module({
  imports: [AuthModule],
  providers: [TenantContextService],
  exports: [TenantContextService],
})
export class TenantContextModule {}
