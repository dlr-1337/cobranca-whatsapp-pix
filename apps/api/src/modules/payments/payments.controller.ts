import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';

import { readSessionCookie } from '../auth/auth-cookie';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(@Inject(PaymentsService) private readonly paymentsService: PaymentsService) {}

  @Post('charges/:chargeId/pix')
  @HttpCode(HttpStatus.CREATED)
  createPixForCharge(@Req() request: Request, @Param('chargeId') chargeId: string) {
    return this.paymentsService.createPixForCharge(
      readSessionCookie(request),
      chargeId,
    );
  }

  @Get('charges/:chargeId')
  getChargePayment(@Req() request: Request, @Param('chargeId') chargeId: string) {
    return this.paymentsService.getChargePayment(readSessionCookie(request), chargeId);
  }

  @Get('current')
  getCurrentOperations(@Req() request: Request) {
    return this.paymentsService.getCurrentOperations(readSessionCookie(request));
  }

  @Post('webhooks/asaas')
  @HttpCode(HttpStatus.OK)
  receiveAsaasWebhook(
    @Headers('asaas-access-token') asaasAccessToken: string | undefined,
    @Body() payload: Record<string, unknown>,
  ) {
    return this.paymentsService.receiveAsaasWebhook(asaasAccessToken, payload);
  }

  @Post('reconciliation/manual')
  @HttpCode(HttpStatus.CREATED)
  runManualReconciliation(@Req() request: Request) {
    return this.paymentsService.runManualReconciliation(readSessionCookie(request));
  }

  @Post('provider-events/:providerEventId/replay')
  @HttpCode(HttpStatus.ACCEPTED)
  replayProviderEvent(
    @Req() request: Request,
    @Param('providerEventId') providerEventId: string,
  ) {
    return this.paymentsService.replayProviderEvent(
      readSessionCookie(request),
      providerEventId,
    );
  }

  @Get('reconciliation/runs')
  listReconciliationRuns(@Req() request: Request) {
    return this.paymentsService.listReconciliationRuns(readSessionCookie(request));
  }
}
