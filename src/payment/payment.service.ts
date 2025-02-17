import { Injectable } from '@nestjs/common';
import { ConfigService } from 'src/config/config.service';
import Stripe from 'stripe';

@Injectable()
export class StripeService {

  private stripe: Stripe;

  constructor(private readonly configService: ConfigService) {}

  async init() {
    const stripeKey = await this.configService.getConfig('STRIPE_SECRET');
    this.stripe = new Stripe(stripeKey, { apiVersion: '2025-01-27.acacia' });
  }

  async createCheckoutSession() {
    if (!this.stripe) await this.init(); // Ensure Stripe is initialized
    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Sample Product',
            },
            unit_amount: 1000, // $10.00
          },
          quantity: 1,
        },
      ],
      success_url: 'https://localhot:3001/order/success',
      cancel_url: 'https://localhost:3001/order/cancel',
    });

    return session.url; // Secure Stripe-hosted payment page
  }
}
