import { Injectable, ServiceUnavailableException, NotFoundException, BadRequestException } from '@nestjs/common';
import { ListProductsDto } from './dto/list-products.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { dbPool } from '../../../config/database.config';

@Injectable()
export class ProductsService {
  /**
   * Listar productos con filtros y paginación
   */
  async findAll(query: ListProductsDto) {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    const {
      page = 1,
      limit = 20,
      businessId,
      categoryId,
      isAvailable,
      isFeatured,
      search,
      sortBy = 'display_order',
      sortOrder = 'asc',
    } = query;

    const offset = (page - 1) * limit;
    const pool = dbPool;

    // Construir query SQL
    let whereConditions: string[] = [];
    let queryParams: any[] = [];
    let paramIndex = 1;

    if (businessId) {
      whereConditions.push(`p.business_id = $${paramIndex}`);
      queryParams.push(businessId);
      paramIndex++;
    }

    if (categoryId) {
      whereConditions.push(`p.category_id = $${paramIndex}`);
      queryParams.push(categoryId);
      paramIndex++;
    }

    if (isAvailable !== undefined) {
      whereConditions.push(`p.is_available = $${paramIndex}`);
      queryParams.push(isAvailable);
      paramIndex++;
    }

    if (isFeatured !== undefined) {
      whereConditions.push(`p.is_featured = $${paramIndex}`);
      queryParams.push(isFeatured);
      paramIndex++;
    }

    if (search) {
      whereConditions.push(`(p.name ILIKE $${paramIndex} OR p.description ILIKE $${paramIndex})`);
      queryParams.push(`%${search}%`, `%${search}%`);
      paramIndex += 2;
    }

    const whereClause = whereConditions.length > 0
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';

    // Obtener total para paginación
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM catalog.products p
      ${whereClause}
    `;
    const countResult = await pool.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total, 10);

    // Query principal
    const orderBy = sortBy || 'display_order';
    const orderDirection = sortOrder === 'asc' ? 'ASC' : 'DESC';
    
    const sortByMap: { [key: string]: string } = {
      'display_order': 'p.display_order',
      'name': 'p.name',
      'price': 'p.price',
      'created_at': 'p.created_at',
    };
    const orderByColumn = sortByMap[orderBy] || 'p.display_order';
    
    queryParams.push(limit, offset);

    const sqlQuery = `
      SELECT 
        p.*,
        b.name as business_name,
        pc.name as category_name,
        pc.business_id as category_business_id
      FROM catalog.products p
      LEFT JOIN core.businesses b ON p.business_id = b.id
      LEFT JOIN catalog.product_categories pc ON p.category_id = pc.id
      ${whereClause}
      ORDER BY ${orderByColumn} ${orderDirection}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    try {
      const result = await pool.query(sqlQuery, queryParams);
      const data = result.rows || [];

      return {
        data: data.map(row => ({
          id: row.id,
          business_id: row.business_id,
          business_name: row.business_name,
          name: row.name,
          description: row.description,
          image_url: row.image_url,
          price: parseFloat(row.price),
          category_id: row.category_id,
          category_name: row.category_name,
          is_available: row.is_available,
          is_featured: row.is_featured,
          variants: row.variants,
          nutritional_info: row.nutritional_info,
          allergens: row.allergens || [],
          display_order: row.display_order,
          created_at: row.created_at,
          updated_at: row.updated_at,
        })),
        pagination: {
          page,
          limit,
          total: total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error: any) {
      console.error('❌ Error ejecutando query de productos:', {
        message: error.message,
        code: error.code,
        detail: error.detail,
      });
      throw new ServiceUnavailableException('Error al obtener productos');
    }
  }

  /**
   * Obtener un producto por ID
   */
  async findOne(id: string) {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    const pool = dbPool;

    const sqlQuery = `
      SELECT 
        p.*,
        b.name as business_name,
        pc.name as category_name,
        pc.business_id as category_business_id
      FROM catalog.products p
      LEFT JOIN core.businesses b ON p.business_id = b.id
      LEFT JOIN catalog.product_categories pc ON p.category_id = pc.id
      WHERE p.id = $1
    `;

    try {
      const result = await pool.query(sqlQuery, [id]);
      
      if (result.rows.length === 0) {
        throw new NotFoundException('Producto no encontrado');
      }

      const row = result.rows[0];

      return {
        id: row.id,
        business_id: row.business_id,
        business_name: row.business_name,
        name: row.name,
        description: row.description,
        image_url: row.image_url,
        price: parseFloat(row.price),
        category_id: row.category_id,
        category_name: row.category_name,
        is_available: row.is_available,
        is_featured: row.is_featured,
        variants: row.variants,
        nutritional_info: row.nutritional_info,
        allergens: row.allergens || [],
        display_order: row.display_order,
        created_at: row.created_at,
        updated_at: row.updated_at,
      };
    } catch (error: any) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      console.error('❌ Error ejecutando query de producto:', {
        message: error.message,
        code: error.code,
      });
      throw new ServiceUnavailableException('Error al obtener producto');
    }
  }

  /**
   * Crear un nuevo producto
   */
  async create(createProductDto: CreateProductDto) {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    const pool = dbPool;

    // Validar que el negocio existe
    const businessCheck = await pool.query(
      'SELECT id FROM core.businesses WHERE id = $1',
      [createProductDto.business_id]
    );
    if (businessCheck.rows.length === 0) {
      throw new BadRequestException('El negocio especificado no existe');
    }

    // Validar que la categoría existe si se proporciona
    if (createProductDto.category_id) {
      const categoryCheck = await pool.query(
        'SELECT id FROM catalog.product_categories WHERE id = $1',
        [createProductDto.category_id]
      );
      if (categoryCheck.rows.length === 0) {
        throw new BadRequestException('La categoría especificada no existe');
      }
    }

    const sqlQuery = `
      INSERT INTO catalog.products (
        business_id, name, description, image_url, price, category_id,
        is_available, is_featured, variants, nutritional_info, allergens,
        display_order
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
      ) RETURNING *
    `;

    try {
      const result = await pool.query(sqlQuery, [
        createProductDto.business_id,
        createProductDto.name,
        createProductDto.description || null,
        createProductDto.image_url || null,
        createProductDto.price,
        createProductDto.category_id || null,
        createProductDto.is_available !== undefined ? createProductDto.is_available : true,
        createProductDto.is_featured !== undefined ? createProductDto.is_featured : false,
        createProductDto.variants ? JSON.stringify(createProductDto.variants) : null,
        createProductDto.nutritional_info ? JSON.stringify(createProductDto.nutritional_info) : null,
        createProductDto.allergens || null,
        createProductDto.display_order || 0,
      ]);

      return this.findOne(result.rows[0].id);
    } catch (error: any) {
      console.error('❌ Error creando producto:', {
        message: error.message,
        code: error.code,
      });
      throw new ServiceUnavailableException('Error al crear producto');
    }
  }

  /**
   * Actualizar un producto
   */
  async update(id: string, updateProductDto: UpdateProductDto) {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    const pool = dbPool;

    // Verificar que el producto existe
    const existing = await this.findOne(id);

    // Validar que la categoría existe si se proporciona
    if (updateProductDto.category_id) {
      const categoryCheck = await pool.query(
        'SELECT id FROM catalog.product_categories WHERE id = $1',
        [updateProductDto.category_id]
      );
      if (categoryCheck.rows.length === 0) {
        throw new BadRequestException('La categoría especificada no existe');
      }
    }

    // Construir query de actualización dinámicamente
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramIndex = 1;

    if (updateProductDto.name !== undefined) {
      updateFields.push(`name = $${paramIndex}`);
      updateValues.push(updateProductDto.name);
      paramIndex++;
    }

    if (updateProductDto.description !== undefined) {
      updateFields.push(`description = $${paramIndex}`);
      updateValues.push(updateProductDto.description);
      paramIndex++;
    }

    if (updateProductDto.image_url !== undefined) {
      updateFields.push(`image_url = $${paramIndex}`);
      updateValues.push(updateProductDto.image_url);
      paramIndex++;
    }

    if (updateProductDto.price !== undefined) {
      updateFields.push(`price = $${paramIndex}`);
      updateValues.push(updateProductDto.price);
      paramIndex++;
    }

    if (updateProductDto.category_id !== undefined) {
      updateFields.push(`category_id = $${paramIndex}`);
      updateValues.push(updateProductDto.category_id || null);
      paramIndex++;
    }

    if (updateProductDto.is_available !== undefined) {
      updateFields.push(`is_available = $${paramIndex}`);
      updateValues.push(updateProductDto.is_available);
      paramIndex++;
    }

    if (updateProductDto.is_featured !== undefined) {
      updateFields.push(`is_featured = $${paramIndex}`);
      updateValues.push(updateProductDto.is_featured);
      paramIndex++;
    }

    if (updateProductDto.variants !== undefined) {
      updateFields.push(`variants = $${paramIndex}`);
      updateValues.push(updateProductDto.variants ? JSON.stringify(updateProductDto.variants) : null);
      paramIndex++;
    }

    if (updateProductDto.nutritional_info !== undefined) {
      updateFields.push(`nutritional_info = $${paramIndex}`);
      updateValues.push(updateProductDto.nutritional_info ? JSON.stringify(updateProductDto.nutritional_info) : null);
      paramIndex++;
    }

    if (updateProductDto.allergens !== undefined) {
      updateFields.push(`allergens = $${paramIndex}`);
      updateValues.push(updateProductDto.allergens);
      paramIndex++;
    }

    if (updateProductDto.display_order !== undefined) {
      updateFields.push(`display_order = $${paramIndex}`);
      updateValues.push(updateProductDto.display_order);
      paramIndex++;
    }

    if (updateFields.length === 0) {
      return existing;
    }

    // Agregar updated_at
    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);

    updateValues.push(id);

    const sqlQuery = `
      UPDATE catalog.products
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    try {
      await pool.query(sqlQuery, updateValues);
      return this.findOne(id);
    } catch (error: any) {
      console.error('❌ Error actualizando producto:', {
        message: error.message,
        code: error.code,
      });
      throw new ServiceUnavailableException('Error al actualizar producto');
    }
  }

  /**
   * Eliminar lógicamente un producto (marcar como no disponible)
   */
  async remove(id: string) {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    const pool = dbPool;

    // Verificar que el producto existe
    const existing = await this.findOne(id);

    // Verificar si está en pedidos activos o entregados recientemente
    const ordersCheck = await pool.query(
      `SELECT COUNT(*) as count 
       FROM orders.order_items oi
       JOIN orders.orders o ON oi.order_id = o.id
       WHERE oi.product_id = $1 
       AND o.status NOT IN ('cancelled', 'refunded')
       AND o.created_at > CURRENT_DATE - INTERVAL '30 days'`,
      [id]
    );
    const orderCount = parseInt(ordersCheck.rows[0].count, 10);

    // Eliminación lógica: marcar como no disponible
    const sqlQuery = `
      UPDATE catalog.products
      SET is_available = FALSE, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;

    try {
      await pool.query(sqlQuery, [id]);
      return { 
        message: 'Producto desactivado exitosamente',
        warning: orderCount > 0 ? `Este producto tiene ${orderCount} pedido(s) en los últimos 30 días` : undefined
      };
    } catch (error: any) {
      console.error('❌ Error eliminando producto:', {
        message: error.message,
        code: error.code,
      });
      throw new ServiceUnavailableException('Error al eliminar producto');
    }
  }
}

