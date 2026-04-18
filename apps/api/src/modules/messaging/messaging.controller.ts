import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import {
  type ManualSendChargeMessageInput,
  type PreviewChargeMessageInput,
} from '@cobrazap/domain';
import type { Request } from 'express';

import { readSessionCookie } from '../auth/auth-cookie';
import { MessagingService } from './messaging.service';

@Controller('messaging')
export class MessagingController {
  constructor(
    @Inject(MessagingService) private readonly messagingService: MessagingService,
  ) {}

  @Get('current')
  getCurrent(@Req() request: Request) {
    return this.messagingService.getCurrent(readSessionCookie(request));
  }

  @Get('charges/:chargeId/preview')
  previewChargeMessage(
    @Req() request: Request,
    @Param('chargeId') chargeId: string,
    @Query('templateKind') templateKind: string,
    @Query('reminderSlot') reminderSlot?: string,
  ) {
    return this.messagingService.previewChargeMessage(
      readSessionCookie(request),
      chargeId,
      {
        templateKind: templateKind as PreviewChargeMessageInput['templateKind'],
        reminderSlot: reminderSlot as PreviewChargeMessageInput['reminderSlot'],
      },
    );
  }

  @Post('charges/:chargeId/manual-send')
  @HttpCode(HttpStatus.CREATED)
  manualSendChargeMessage(
    @Req() request: Request,
    @Param('chargeId') chargeId: string,
    @Body()
    body: {
      templateKind: string;
      reminderSlot?: string;
      dispatchId?: string;
    },
  ) {
    return this.messagingService.manualSendChargeMessage(
      readSessionCookie(request),
      chargeId,
      body as ManualSendChargeMessageInput,
    );
  }
}
