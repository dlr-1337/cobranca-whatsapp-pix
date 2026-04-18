import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { TenantSettingsController } from './tenant-settings.controller';

@Module({
  imports: [AuthModule],
  controllers: [TenantSettingsController],
})
export class TenantSettingsModule {}
