import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { TailorService } from './tailor.service';
import { TailorController } from './tailor.controller';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core'; 
import { RefreshTokenMiddleware } from 'src/middlewares/refreshToken.middleware';
import { AuthorizeMiddleware } from 'src/middlewares/authorize.middleware';
@Module({
  imports: [ConfigModule],
  providers: [TailorService],
  controllers: [TailorController]
})
export class TailorModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
    .apply(RefreshTokenMiddleware).forRoutes(TailorController)
    .apply(AuthorizeMiddleware).forRoutes(TailorController);
  }
}
