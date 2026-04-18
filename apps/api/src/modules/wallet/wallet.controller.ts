import type {
  BillingPlanFiltersInput,
  CreateBillingPlanInput,
  CreateCustomerInput,
  CreateSubscriptionInput,
  CustomerConsentFiltersInput,
  CustomerFiltersInput,
  SubscriptionEventFiltersInput,
  SubscriptionFiltersInput,
  SubscriptionLifecycleCommandInput,
  UpdateBillingPlanInput,
  UpdateCustomerInput,
  UpdateSubscriptionInput,
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
import { WalletService } from './wallet.service';

@Controller('wallet')
export class WalletController {
  constructor(@Inject(WalletService) private readonly walletService: WalletService) {}

  @Get('current')
  getCurrent(@Req() request: Request) {
    return this.walletService.getCurrent(readSessionCookie(request));
  }

  @Get('customers')
  listCustomers(
    @Req() request: Request,
    @Query() query: CustomerFiltersInput,
  ) {
    return this.walletService.listCustomers(readSessionCookie(request), query);
  }

  @Post('customers')
  @HttpCode(HttpStatus.CREATED)
  createCustomer(@Req() request: Request, @Body() body: CreateCustomerInput) {
    return this.walletService.createCustomer(readSessionCookie(request), body);
  }

  @Patch('customers/:customerId')
  updateCustomer(
    @Req() request: Request,
    @Param('customerId') customerId: string,
    @Body() body: UpdateCustomerInput,
  ) {
    return this.walletService.updateCustomer(readSessionCookie(request), customerId, body);
  }

  @Get('customers/:customerId/consent-events')
  listCustomerConsentEvents(
    @Req() request: Request,
    @Param('customerId') customerId: string,
    @Query() query: CustomerConsentFiltersInput,
  ) {
    return this.walletService.listCustomerConsentEvents(
      readSessionCookie(request),
      customerId,
      query,
    );
  }

  @Post('customers/:customerId/consent-events')
  @HttpCode(HttpStatus.CREATED)
  appendCustomerConsentEvent(
    @Req() request: Request,
    @Param('customerId') customerId: string,
    @Body() body: CustomerConsentFiltersInput & {
      channel: string;
      status: string;
      evidence: string;
      effectiveAt: string;
    },
  ) {
    return this.walletService.appendCustomerConsentEvent(
      readSessionCookie(request),
      customerId,
      body,
    );
  }

  @Get('consent-events')
  listConsentEvents(
    @Req() request: Request,
    @Query() query: CustomerConsentFiltersInput,
  ) {
    return this.walletService.listConsentEvents(readSessionCookie(request), query);
  }

  @Get('plans')
  listBillingPlans(
    @Req() request: Request,
    @Query() query: BillingPlanFiltersInput,
  ) {
    return this.walletService.listBillingPlans(readSessionCookie(request), query);
  }

  @Post('plans')
  @HttpCode(HttpStatus.CREATED)
  createBillingPlan(@Req() request: Request, @Body() body: CreateBillingPlanInput) {
    return this.walletService.createBillingPlan(readSessionCookie(request), body);
  }

  @Patch('plans/:planId')
  updateBillingPlan(
    @Req() request: Request,
    @Param('planId') planId: string,
    @Body() body: UpdateBillingPlanInput,
  ) {
    return this.walletService.updateBillingPlan(readSessionCookie(request), planId, body);
  }

  @Get('subscriptions')
  listSubscriptions(
    @Req() request: Request,
    @Query() query: SubscriptionFiltersInput,
  ) {
    return this.walletService.listSubscriptions(readSessionCookie(request), query);
  }

  @Post('subscriptions')
  @HttpCode(HttpStatus.CREATED)
  createSubscription(
    @Req() request: Request,
    @Body() body: CreateSubscriptionInput,
  ) {
    return this.walletService.createSubscription(readSessionCookie(request), body);
  }

  @Patch('subscriptions/:subscriptionId')
  updateSubscription(
    @Req() request: Request,
    @Param('subscriptionId') subscriptionId: string,
    @Body()
    body:
      | (UpdateSubscriptionInput & { action?: undefined })
      | ({ action: 'pause' | 'reactivate' | 'cancel' } & SubscriptionLifecycleCommandInput),
  ) {
    return this.walletService.updateSubscription(
      readSessionCookie(request),
      subscriptionId,
      body,
    );
  }

  @Get('subscriptions/:subscriptionId/events')
  listSubscriptionEvents(
    @Req() request: Request,
    @Param('subscriptionId') subscriptionId: string,
    @Query() query: SubscriptionEventFiltersInput,
  ) {
    return this.walletService.listSubscriptionEvents(
      readSessionCookie(request),
      subscriptionId,
      query,
    );
  }
}
