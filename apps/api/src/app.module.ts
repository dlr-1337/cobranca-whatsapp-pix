import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuditModule } from './modules/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';
import { TenantSettingsModule } from './modules/tenants/tenant-settings.module';

@Module({
  imports: [AuthModule, TenantSettingsModule, AuditModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
