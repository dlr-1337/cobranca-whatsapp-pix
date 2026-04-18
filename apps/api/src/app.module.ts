import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuditModule } from './modules/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';
import { ChargesModule } from './modules/charges/charges.module';
import { MessagingModule } from './modules/messaging/messaging.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { TenantSettingsModule } from './modules/tenants/tenant-settings.module';
import { WalletModule } from './modules/wallet/wallet.module';

@Module({
  imports: [AuthModule, TenantSettingsModule, AuditModule, WalletModule, ChargesModule, MessagingModule, PaymentsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
