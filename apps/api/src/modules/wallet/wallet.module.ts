import { Module } from '@nestjs/common';

import { TenantContextModule } from '../../common/tenant/tenant-context.module';
import { AuthModule } from '../auth/auth.module';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';

@Module({
  imports: [AuthModule, TenantContextModule],
  controllers: [WalletController],
  providers: [WalletService],
})
export class WalletModule {}
