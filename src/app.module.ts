import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './api/auth/auth.module';
import { AdminModule } from './api/admin/admin.module';
import { OrdersModule } from './api/orders/orders.module';
import { CustomersModule } from './api/customers/customers.module';
import { SalespersonController } from './api/salesperson/salesperson.controller';
import { SalespersonService } from './api/salesperson/salesperson.service';
import { SalespersonModule } from './api/salesperson/salesperson.module';
import { TransactionsService } from './api/transactions/transactions.service';
import { TransactionsModule } from './api/transactions/transactions.module';
import { TransactionsController } from './api/transactions/transactions.controller';
import { MeasurementModule } from './api/measurement/measurement.module';
import { InventoryController } from './api/inventory/inventory.controller';
import { InventoryService } from './api/inventory/inventory.service';
import { InventoryModule } from './api/inventory/inventory.module';
import { TailorModule } from './api/tailor/tailor.module';
import { AuthorizeMiddleware } from './middlewares/authorize.middleware';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';
import { RoleController } from './role/role.controller';
import { RoleModule } from './role/role.module';
import { RefreshTokenMiddleware } from './middlewares/refreshToken.middleware';
import { ServiceModule } from './api/service/service.module';
import { ServiceController } from './api/service/service.controller';
import { ServiceService } from './api/service/service.service';
import { OrderController } from './api/order/order.controller';
import { OrderService } from './api/order/order.service';
import { OrderModule } from './api/order/order.module';
import { PaymentModule } from './payment/payment.module';
import { StripeController } from './payment/payment.controller';
import { StripeService } from './payment/payment.service';
import { ConfigController } from './config/config.controller';
import { ConfigService } from './config/config.service';
import { ConfigModule } from './config/config.module';

@Module({
  imports: [AuthModule, AdminModule, OrdersModule, CustomersModule, SalespersonModule, TransactionsModule, MeasurementModule, InventoryModule, TailorModule,
    ServiceModule,
    ThrottlerModule.forRoot([{
      ttl: 30000, // Time-to-live in seconds (1 minute)
      limit: 20, // Max 10 requests per TTL per IP
    }]),
    RoleModule,
    OrderModule,
    PaymentModule,
    ConfigModule
  ],
  controllers: [AppController, SalespersonController, TransactionsController, InventoryController, RoleController, ServiceController, OrderController, StripeController, ConfigController],
  providers: [AppService, SalespersonService, TransactionsService, InventoryService, ServiceService, {provide: APP_GUARD, useClass: ThrottlerGuard}, OrderService, StripeService, ConfigService],

})
export class AppModule implements NestModule{
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RefreshTokenMiddleware).forRoutes('orders', 'inventory', 'service', 'salesperson', 'tailor', 'transactions', 'customers', 'role', 'config')
    consumer.apply(AuthorizeMiddleware).forRoutes('orders', 'inventory', 'service', 'salesperson', 'tailor', 'transactions', 'customers', 'role', 'config')
  }
}
