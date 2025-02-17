import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { ConfigModule } from '@nestjs/config';
import { TransactionsService } from '../transactions/transactions.service';
import { MiddlewareConsumer } from '@nestjs/common';
import { AuthorizeMiddleware } from '../../middlewares/authorize.middleware';
import { RefreshTokenMiddleware } from 'src/middlewares/refreshToken.middleware';

@Module({
  imports: [ConfigModule],
  providers: [OrdersService, TransactionsService],
  controllers: [OrdersController]
})
export class OrdersModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
    .apply(RefreshTokenMiddleware).forRoutes(OrdersController)
    .apply(AuthorizeMiddleware).forRoutes(OrdersController);
  }
}
