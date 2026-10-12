import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import morgan from 'morgan';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import cookieParser from 'cookie-parser';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as express from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = process.env.PORT ?? 3000;
  const appLogger = new Logger('App');

  app.use(cookieParser());
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strips out properties that do not have any decorators
      forbidNonWhitelisted: true, // Throws an error if non-whitelisted properties are passed
      transform: true, // Automatically transforms payloads to match DTO types
    }),
  );

  app.setGlobalPrefix('api');
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));
  app.use(
    morgan('combined', {
      stream: { write: (message: string) => appLogger.log(message.trim()) },
    }),
  );

  // configure Swagger UI
  const config = new DocumentBuilder()
    .setDescription('Multi-tenant sports club management API documentation')
    .setTitle('Pitchwork API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, documentFactory);

  await app.listen(port);
  appLogger.log('Server started on http://localhost:' + port);
}
bootstrap();
