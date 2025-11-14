import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '@supabase/supabase-js';
import { BusinessesService } from './businesses.service';
import { ListBusinessesDto } from './dto/list-businesses.dto';
import { UpdateBusinessStatusDto } from './dto/update-business-status.dto';

@ApiTags('businesses')
@Controller('businesses')
@UseGuards(SupabaseAuthGuard)
export class BusinessesController {
  constructor(private readonly businessesService: BusinessesService) {}

  @Get()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Listar todos los negocios con filtros y paginación' })
  @ApiResponse({ status: 200, description: 'Lista de negocios obtenida exitosamente' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 400, description: 'Parámetros inválidos' })
  async findAll(@Query() query: ListBusinessesDto, @CurrentUser() user: User) {
    return this.businessesService.findAll(query);
  }

  @Get('test')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Endpoint de prueba para diagnosticar problemas de conexión' })
  @ApiResponse({ status: 200, description: 'Resultado de la prueba' })
  async testConnection(@CurrentUser() user: User) {
    return this.businessesService.testConnection();
  }

  @Get('statistics')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Obtener estadísticas de negocios' })
  @ApiResponse({ status: 200, description: 'Estadísticas obtenidas exitosamente' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  async getStatistics(@CurrentUser() user: User) {
    return this.businessesService.getStatistics();
  }

  @Get(':id')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Obtener un negocio por ID' })
  @ApiParam({ name: 'id', description: 'ID del negocio', type: String })
  @ApiResponse({ status: 200, description: 'Negocio obtenido exitosamente' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 404, description: 'Negocio no encontrado' })
  async findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.businessesService.findOne(id);
  }

  @Patch(':id/status')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Actualizar estado de un negocio (activar/desactivar)' })
  @ApiParam({ name: 'id', description: 'ID del negocio', type: String })
  @ApiResponse({ status: 200, description: 'Estado actualizado exitosamente' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 404, description: 'Negocio no encontrado' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  async updateStatus(
    @Param('id') id: string,
    @Body() updateDto: UpdateBusinessStatusDto,
    @CurrentUser() user: User,
  ) {
    return this.businessesService.updateStatus(id, updateDto);
  }
}

