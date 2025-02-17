import { Controller, Get } from '@nestjs/common';
import { StripeService } from './payment.service';

@Controller('payment')
export class StripeController {
  constructor(private readonly stripeService: StripeService) {}

  @Get('checkout')
  async getCheckoutUrl() {
    const url = await this.stripeService.createCheckoutSession();
    return { url };
  }
}
