import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { Logger, ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api/v1');

  // 全局校验管道：所有带 DTO 的请求参数（body / query / param）在进入 controller 前
  // 都会按 DTO 上的 class-validator 装饰器校验，不通过直接返回 400
  app.useGlobalPipes(
    new ValidationPipe({
      // 自动剔除 DTO 中没有声明（没有任何校验装饰器）的字段
      whitelist: true,
      // 配合 whitelist：遇到多余字段不是静默剔除，而是直接报 400，便于前端发现传错字段
      forbidNonWhitelisted: true,
      // 把普通 JSON 对象转换成 DTO 类的实例，并按 TS 类型转换 @Param/@Query 的值
      transform: true,
      transformOptions: {
        // 根据 DTO 属性的 TS 类型隐式转换，例如 query 中的 "10" -> 10、"true" -> true
        enableImplicitConversion: true,
      },
    }),
  );

  // 允许跨域
  app.enableCors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') ?? 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });

  // swagger文档
  const config = new DocumentBuilder()
    .setTitle('API文档')
    .setDescription('API documentation for the application')
    .setVersion('1.0')
    .addTag('auth', 'Authentication related endpoints')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Refresh-JWT',
        description: 'Enter refresh JWT token',
        in: 'header',
      },
      'JWT-refresh',
    )
    .addServer('http://localhost:3000', 'dev server')
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, documentFactory, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
    customSiteTitle: 'API 文档',
    customfavIcon: 'https://nestjs.com/img/logo-small.svg',
  });

  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap().catch((error) => {
  Logger.error('服务启动失败: ', error);
  process.exit(1);
});
