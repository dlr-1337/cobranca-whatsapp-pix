import {
  type ConfirmEmailInput,
  type ForgotPasswordInput,
  type LoginInput,
  type ResetPasswordInput,
  type SignupRequestInput,
} from '@cobrazap/domain';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';

import { clearSessionCookie, readSessionCookie, setSessionCookie } from './auth-cookie';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {}

  @Post('signup')
  @HttpCode(HttpStatus.CREATED)
  signup(@Body() body: SignupRequestInput) {
    return this.authService.signup(body);
  }

  @Post('confirm-email')
  @HttpCode(HttpStatus.OK)
  confirmEmail(@Body() body: ConfirmEmailInput) {
    return this.authService.confirmEmail(body);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() body: LoginInput,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.login(body, {
      ipAddress: request.ip,
      userAgent: request.get('user-agent') ?? null,
    });

    setSessionCookie(response, result.sessionToken);
    return result.payload;
  }

  @Get('session')
  getSession(@Req() request: Request) {
    return this.authService.getSession(readSessionCookie(request));
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.authService.logout(readSessionCookie(request));
    clearSessionCookie(response);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.ACCEPTED)
  forgotPassword(@Body() body: ForgotPasswordInput) {
    return this.authService.forgotPassword(body);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  resetPassword(@Body() body: ResetPasswordInput) {
    return this.authService.resetPassword(body);
  }
}
