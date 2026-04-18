import { Module } from '@nestjs/common';

import { TenantContextModule } from '../../common/tenant/tenant-context.module';
import { AuthModule } from '../auth/auth.module';
import { MessagingModule } from '../messaging/messaging.module';
import { ChargesController } from './charges.controller';
import { ChargesService } from './charges.service';

@Module({
  imports: [AuthModule, TenantContextModule, MessagingModule],
  controllers: [ChargesController],
  providers: [ChargesService],
})
export class ChargesModule {}
