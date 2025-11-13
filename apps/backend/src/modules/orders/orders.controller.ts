import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { User } from '@supabase/supabase-js';

/**
 * Controlador de ejemplo: Orders
 * 
 * Demuestra el uso de endpoints públicos y protegidos
 */
@ApiTags('orders')
@Controller('orders')
@UseGuards(SupabaseAuthGuard) // Todos los endpoints de este controller requieren auth
export class OrdersController {
  /**
   * Endpoint protegido: Listar pedidos del usuario autenticado
   */
  @Get()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Listar pedidos del usuario autenticado' })
  @ApiResponse({ status: 200, description: 'Lista de pedidos obtenida exitosamente' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  async getOrders(@CurrentUser() user: User) {
    // Este endpoint requiere autenticación
    return {
      message: `Pedidos del usuario ${user.email}`,
      userId: user.id,
      orders: [], // Aquí iría la lógica real
    };
  }

  /**
   * Endpoint protegido: Crear un nuevo pedido
   */
  @Post()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Crear un nuevo pedido' })
  @ApiBody({
    description: 'Datos del pedido',
    schema: {
      type: 'object',
      properties: {
        businessId: { type: 'string', example: '11111111-1111-1111-1111-111111111111' },
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              productId: { type: 'string' },
              quantity: { type: 'number' },
            },
          },
        },
        deliveryAddressId: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Pedido creado exitosamente' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  async createOrder(@CurrentUser() user: User, @Body() orderData: any) {
    // Este endpoint requiere autenticación
    return {
      message: 'Pedido creado',
      userId: user.id,
      order: orderData,
    };
  }

  /**
   * Endpoint público: Estadísticas generales (sin autenticación)
   */
  @Public()
  @Get('stats')
  @ApiOperation({ summary: 'Obtener estadísticas generales de pedidos (público)' })
  @ApiResponse({ status: 200, description: 'Estadísticas obtenidas exitosamente' })
  async getStats() {
    // Este endpoint NO requiere autenticación gracias a @Public()
    return {
      message: 'Estadísticas públicas',
      totalOrders: 0,
    };
  }
}

