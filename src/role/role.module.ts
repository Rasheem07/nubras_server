import { Module } from '@nestjs/common';
import { RoleController } from './role.controller';
import { MiddlewareConsumer } from '@nestjs/common';
import { AuthorizeMiddleware } from 'src/middlewares/authorize.middleware';
import { RefreshTokenMiddleware } from 'src/middlewares/refreshToken.middleware';

@Module({
  controllers: [RoleController],
})

export class RoleModule { 
  configure(consumer: MiddlewareConsumer) {
    consumer
    .apply(RefreshTokenMiddleware).forRoutes(RoleController)
    .apply(AuthorizeMiddleware).forRoutes(RoleController);
  }
}
