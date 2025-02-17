import { Module, NestModule, MiddlewareConsumer  } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AuthorizeMiddleware } from '../../middlewares/authorize.middleware';

@Module({
  controllers: [AdminController], 
  providers: [AdminService],
  imports: []
})
export class AdminModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuthorizeMiddleware).forRoutes("admin"); // Applies to all routes
  }
}
