import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as compression from 'compression';
import * as cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: 'https://alnubrasstudio.com', credentials: true });

  app.use(cookieParser());
  // somewhere in your initialization file
  app.use(compression());

  await app.listen(process.env.PORT ?? 3000);
}


bootstrap();
