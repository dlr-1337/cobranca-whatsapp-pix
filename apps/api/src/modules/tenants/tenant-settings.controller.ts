import { type TenantSettingsInput } from '@cobrazap/domain';
import { Body, Controller, Get, Inject, Patch, Req } from '@nestjs/common';
import type { Request } from 'express';

import { readSessionCookie } from '../auth/auth-cookie';
import { AuthService } from '../auth/auth.service';

@Controller('tenant-settings')
export class TenantSettingsController {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {}

  @Get('current')
  getCurrent(@Req() request: Request) {
    return this.authService.getTenantSettings(readSessionCookie(request));
  }

  @Patch('current')
  updateCurrent(@Req() request: Request, @Body() body: TenantSettingsInput) {
    return this.authService.updateTenantSettings(
      readSessionCookie(request),
      body,
    );
  }
}
