import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { User } from '@supabase/supabase-js';

/**
 * Controlador de autenticación
 * 
 * Endpoints para autenticación y gestión de sesión
 */
@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Endpoint público: Verificar estado del servicio de autenticación
   */
  @Public()
  @Get('health')
  @ApiOperation({ summary: 'Health check del servicio de autenticación' })
  @ApiResponse({ status: 200, description: 'Servicio funcionando correctamente' })
  healthCheck() {
    return {
      service: 'auth',
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Endpoint protegido: Obtener perfil del usuario autenticado
   * (No necesita @UseGuards porque el guard es global)
   */
  @Get('me')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Obtener perfil del usuario autenticado' })
  @ApiResponse({ status: 200, description: 'Perfil del usuario obtenido exitosamente' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  async getProfile(@CurrentUser() user: User) {
    const profile = await this.authService.getUserProfile(user.id);
    return {
      ...user,
      profile,
    };
  }

  /**
   * Endpoint protegido: Verificar si el usuario tiene un rol específico
   * (No necesita @UseGuards porque el guard es global)
   */
  @Get('check-role/:role')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Verificar si el usuario tiene un rol específico' })
  @ApiParam({ name: 'role', description: 'Rol a verificar', example: 'client' })
  @ApiResponse({ status: 200, description: 'Verificación de rol exitosa' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  async checkRole(
    @CurrentUser() user: User,
    @Param('role') role: string,
  ) {
    const hasRole = await this.authService.hasRole(user.id, role);
    return {
      userId: user.id,
      role,
      hasRole,
    };
  }
}

