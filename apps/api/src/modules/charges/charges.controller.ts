import type {
  ChargeEventFiltersInput,
  ChargeFiltersInput,
  CreateManualChargeInput,
  GenerateRecurringChargesInput,
  TransitionChargeInput,
} from '@cobrazap/domain';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';

import { readSessionCookie } from '../auth/auth-cookie';
import { ChargesService } from './charges.service';

@Controller('charges')
export class ChargesController {
  constructor(@Inject(ChargesService) private readonly chargesService: ChargesService) {}

  @Get('current')
  getCurrent(@Req() request: Request) {
    return this.chargesService.getCurrent(readSessionCookie(request));
  }

  @Get()
  listCharges(@Req() request: Request, @Query() query: ChargeFiltersInput) {
    return this.chargesService.listCharges(readSessionCookie(request), query);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  createManualCharge(@Req() request: Request, @Body() body: CreateManualChargeInput) {
    return this.chargesService.createManualCharge(readSessionCookie(request), body);
  }

  @Post('generate-recurring')
  @HttpCode(HttpStatus.CREATED)
  generateRecurringCharges(
    @Req() request: Request,
    @Body() body: GenerateRecurringChargesInput,
  ) {
    return this.chargesService.generateRecurringCharges(
      readSessionCookie(request),
      body,
    );
  }

  @Patch(':chargeId')
  updateCharge(
    @Req() request: Request,
    @Param('chargeId') chargeId: string,
    @Body() body: TransitionChargeInput,
  ) {
    return this.chargesService.updateCharge(
      readSessionCookie(request),
      chargeId,
      body,
    );
  }

  @Get(':chargeId/events')
  listChargeEvents(
    @Req() request: Request,
    @Param('chargeId') chargeId: string,
    @Query() query: ChargeEventFiltersInput,
  ) {
    return this.chargesService.listChargeEvents(
      readSessionCookie(request),
      chargeId,
      query,
    );
  }
}
