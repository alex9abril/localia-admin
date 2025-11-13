import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // CORS
  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',') || '*',
    credentials: true,
  });

  // Global prefix
  app.setGlobalPrefix('api');

  // Swagger Configuration
  const config = new DocumentBuilder()
    .setTitle('LOCALIA API')
    .setDescription('API REST para la plataforma de delivery hiperlocal LOCALIA')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth', // This name here is important for matching up with @ApiBearerAuth() in your controller!
    )
    .addTag('auth', 'Endpoints de autenticación')
    .addTag('health', 'Health checks y monitoreo')
    .addTag('orders', 'Gestión de pedidos')
    .addTag('users', 'Gestión de usuarios')
    .addTag('businesses', 'Gestión de negocios')
    .addTag('products', 'Catálogo de productos')
    .addTag('repartidores', 'Gestión de repartidores')
    .addServer('http://localhost:3000', 'Servidor de desarrollo')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true, // Mantiene el token en sesión
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);
  
  console.log(`🚀 LOCALIA Backend running on http://localhost:${port}/api`);
  console.log(`📚 Swagger documentation available at http://localhost:${port}/api/docs`);
}

bootstrap();

