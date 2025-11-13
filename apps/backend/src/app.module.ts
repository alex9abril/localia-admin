import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';
import { SupabaseAuthGuard } from './common/guards/supabase-auth.guard';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { ApiLoggingInterceptor } from './common/interceptors/api-logging.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { AuthModule } from './modules/auth/auth.module';
import { HealthModule } from './modules/health/health.module';
import { ApiKeysModule } from './modules/api-keys/api-keys.module';
import { ApiKeysService } from './modules/api-keys/api-keys.service';

@Module({
  imports: [
    AuthModule,
    HealthModule,
    ApiKeysModule,
    // Otros módulos se agregarán aquí
    // OrdersModule,
    // UsersModule,
    // BusinessesModule,
    // etc.
  ],
  controllers: [],
  providers: [
    // Guard global: Todos los endpoints requieren autenticación por defecto
    {
      provide: APP_GUARD,
      useClass: SupabaseAuthGuard,
    },
    // Interceptor global: Transforma todas las respuestas
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
    // Interceptor global: Registra todas las peticiones a la API
    {
      provide: APP_INTERCEPTOR,
      useClass: ApiLoggingInterceptor,
    },
    // Filtro global: Maneja todas las excepciones
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule {}
