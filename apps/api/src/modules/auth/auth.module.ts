import { Module } from '@nestjs/common';

import { AuthController } from './auth.controller';
import { AuthStorageService } from './auth-storage.service';
import { AuthService } from './auth.service';

@Module({
  controllers: [AuthController],
  providers: [AuthService, AuthStorageService],
  exports: [AuthService, AuthStorageService],
})
export class AuthModule {}
