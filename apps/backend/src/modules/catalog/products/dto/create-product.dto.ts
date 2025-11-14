import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsInt, IsUUID, IsUrl, IsNumber, IsArray, Min, MaxLength, MinLength } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateProductDto {
  @ApiProperty({ description: 'ID del negocio', example: '11111111-1111-1111-1111-111111111111' })
  @IsUUID()
  business_id: string;

  @ApiProperty({ description: 'Nombre del producto', example: 'Hamburguesa Clásica' })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ description: 'Descripción del producto', example: 'Carne, lechuga, tomate, cebolla, queso' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'URL de la imagen', example: 'https://example.com/product.jpg' })
  @IsOptional()
  @IsUrl()
  image_url?: string;

  @ApiProperty({ description: 'Precio del producto', example: 120.00 })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  price: number;

  @ApiPropertyOptional({ description: 'ID de la categoría', example: '11111111-1111-1111-1111-111111111111' })
  @IsOptional()
  @IsUUID()
  category_id?: string;

  @ApiPropertyOptional({ description: 'Disponible', example: true, default: true })
  @IsOptional()
  @IsBoolean()
  is_available?: boolean = true;

  @ApiPropertyOptional({ description: 'Destacado', example: false, default: false })
  @IsOptional()
  @IsBoolean()
  is_featured?: boolean = false;

  @ApiPropertyOptional({ description: 'Variantes (JSON)', example: { size: ['pequeño', 'mediano', 'grande'] } })
  @IsOptional()
  variants?: any;

  @ApiPropertyOptional({ description: 'Información nutricional (JSON)', example: { calories: 500, protein: 25 } })
  @IsOptional()
  nutritional_info?: any;

  @ApiPropertyOptional({ description: 'Alérgenos', example: ['gluten', 'lactosa'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allergens?: string[];

  @ApiPropertyOptional({ description: 'Orden de visualización', example: 1, default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  display_order?: number = 0;
}

