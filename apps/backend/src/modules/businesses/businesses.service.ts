import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  BadRequestException,
} from '@nestjs/common';
import { supabaseAdmin } from '../../config/supabase.config';
import { dbPool } from '../../config/database.config';
import { ListBusinessesDto } from './dto/list-businesses.dto';
import { UpdateBusinessStatusDto } from './dto/update-business-status.dto';
import { CreateBusinessDto } from './dto/create-business.dto';

@Injectable()
export class BusinessesService {
  /**
   * Método de prueba para diagnosticar problemas de conexión
   */
  async testConnection() {
    if (!supabaseAdmin) {
      return { error: 'Supabase client no configurado' };
    }

    const results: any = {};

    // Probar diferentes variaciones del nombre de tabla
    const tableNames = ['businesses', 'core.businesses', 'public.businesses'];

    // Probar con formato 'core.table'
    try {
      const { data, error, count } = await supabaseAdmin
        .from('core.businesses')
        .select('*', { count: 'exact', head: true });

      results['core.businesses'] = {
        success: !error,
        error: error ? {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        } : null,
        count: count || 0,
      };
    } catch (e: any) {
      results['core.businesses'] = {
        success: false,
        error: {
          message: e.message,
          stack: e.stack,
        },
      };
    }

    for (const tableName of tableNames) {
      try {
        const { data, error, count } = await supabaseAdmin
          .from(tableName)
          .select('*', { count: 'exact', head: true });

        results[tableName] = {
          success: !error,
          error: error ? {
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint,
          } : null,
          count: count || 0,
        };
      } catch (e: any) {
        results[tableName] = {
          success: false,
          error: {
            message: e.message,
            stack: e.stack,
          },
        };
      }
    }

    // También probar user_profiles para comparar
    try {
      const { data, error } = await supabaseAdmin
        .from('core.user_profiles')
        .select('*', { count: 'exact', head: true });

      results['user_profiles'] = {
        success: !error,
        error: error ? {
          message: error.message,
          code: error.code,
        } : null,
        count: data ? 1 : 0,
      };
    } catch (e: any) {
      results['user_profiles'] = {
        success: false,
        error: { message: e.message },
      };
    }

    return results;
  }

  /**
   * Listar negocios con filtros y paginación
   */
  async findAll(query: ListBusinessesDto) {
    if (!supabaseAdmin) {
      throw new ServiceUnavailableException('Servicio de base de datos no configurado');
    }

    const {
      page = 1,
      limit = 20,
      isActive,
      category,
      search,
      sortBy = 'created_at',
      sortOrder = 'desc',
    } = query;

    const offset = (page - 1) * limit;

    // Construir query base
    // IMPORTANTE: Si las tablas están en el schema 'core', Supabase PostgREST necesita
    // estar configurado para exponer ese schema, o usar el formato 'core.table'
    // Por ahora, intentamos primero sin schema prefix, luego con 'core.'
    console.log('🔍 Querying businesses with filters:', {
      page,
      limit,
      isActive,
      category,
      search,
      sortBy,
      sortOrder,
    });

    // IMPORTANTE: Las tablas están en el schema 'core'
    // PostgREST no expone schemas personalizados por defecto, así que usamos conexión directa a PostgreSQL
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada. Configura DATABASE_URL o SUPABASE_DB_URL en .env');
    }

    // TypeScript type guard: después de la verificación, dbPool no es null
    const pool = dbPool;

    // Construir query SQL directa
    let whereConditions: string[] = [];
    let queryParams: any[] = [];
    let paramIndex = 1;

    if (isActive !== undefined) {
      whereConditions.push(`is_active = $${paramIndex}`);
      queryParams.push(isActive);
      paramIndex++;
    }

    if (category) {
      whereConditions.push(`category = $${paramIndex}`);
      queryParams.push(category);
      paramIndex++;
    }

    if (search) {
      whereConditions.push(`(name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`);
      queryParams.push(`%${search}%`, `%${search}%`);
      paramIndex += 2;
    }

    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';

    // Obtener total para paginación
    const countQuery = `SELECT COUNT(*) as total FROM core.businesses ${whereClause}`;
    const countResult = await pool.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total, 10);

    // Query principal con paginación
    // Extraer coordenadas del POINT para facilitar el uso en el frontend
    const orderBy = sortBy || 'created_at';
    const orderDirection = sortOrder === 'asc' ? 'ASC' : 'DESC';
    
    queryParams.push(limit, offset);

    let result;
    let data: any[] = [];
    
    // Usar notación de array de PostgreSQL para POINT: (point)[0] para X, (point)[1] para Y
    // ST_X/ST_Y solo funcionan con geometry (PostGIS), no con POINT nativo
    const sqlQuery = `
      SELECT 
        *,
        (location)[0] as longitude,
        (location)[1] as latitude
      FROM core.businesses 
      ${whereClause}
      ORDER BY ${orderBy} ${orderDirection}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    try {
      result = await pool.query(sqlQuery, queryParams);
      data = result.rows || [];
    } catch (error: any) {
      console.error('❌ Error ejecutando query de businesses:', {
        message: error.message,
        code: error.code,
        detail: error.detail,
        hint: error.hint,
      });
      
      // Si falla, intentar sin extraer coordenadas y hacerlo manualmente
      console.log('🔄 Reintentando sin extraer coordenadas en SQL...');
      const fallbackQuery = `
        SELECT * FROM core.businesses 
        ${whereClause}
        ORDER BY ${orderBy} ${orderDirection}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      result = await pool.query(fallbackQuery, queryParams);
      data = result.rows || [];
      
      // Extraer coordenadas manualmente del campo location (POINT)
      if (data.length > 0 && data[0].location) {
        console.log('⚠️  Extrayendo coordenadas manualmente del campo location');
        for (const row of data) {
          if (row.location && typeof row.location === 'object') {
            // Si location es un objeto Point de PostgreSQL
            if (row.location.x !== undefined && row.location.y !== undefined) {
              row.longitude = row.location.x;
              row.latitude = row.location.y;
            }
          } else if (row.location && typeof row.location === 'string') {
            // Si location es un string en formato POINT(x y)
            const match = row.location.match(/POINT\(([^ ]+) ([^ ]+)\)/);
            if (match) {
              row.longitude = parseFloat(match[1]);
              row.latitude = parseFloat(match[2]);
            }
          }
        }
      }
    }

    console.log('✅ Businesses query result:', {
      count: total,
      dataLength: data?.length || 0,
      firstItem: data?.[0] ? { id: data[0].id, name: data[0].name } : null,
    });

    // Enriquecer datos con información del propietario usando conexión directa a PostgreSQL
    const enrichedData = await Promise.all(
      (data || []).map(async (business: any) => {
        if (business.owner_id) {
          try {
            const profileResult = await pool.query(
              'SELECT first_name, last_name, phone FROM core.user_profiles WHERE id = $1',
              [business.owner_id]
            );
            const profile = profileResult.rows[0] || null;
            return {
              ...business,
              owner: profile,
            };
          } catch (e) {
            console.error(`Error obteniendo owner para business ${business.id}:`, e);
            return { ...business, owner: null };
          }
        }
        return { ...business, owner: null };
      })
    );

    return {
      data: enrichedData,
      pagination: {
        page,
        limit,
        total: total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Obtener un negocio por ID
   */
  async findOne(id: string) {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    const pool = dbPool;
    
    // Usar notación de array de PostgreSQL para POINT: (point)[0] para X, (point)[1] para Y
    let result;
    try {
      result = await pool.query(
        `SELECT 
          b.*,
          (b.location)[0] as longitude,
          (b.location)[1] as latitude,
          bc.name as category_name,
          bc.description as category_description,
          bc.icon_url as category_icon_url
        FROM core.businesses b
        LEFT JOIN core.business_categories bc ON b.category_id = bc.id
        WHERE b.id = $1`,
        [id]
      );
    } catch (error: any) {
      console.error('❌ Error ejecutando findOne query:', {
        message: error.message,
        code: error.code,
      });
      
      // Si falla, intentar sin extraer coordenadas y hacerlo manualmente
      console.log('🔄 Reintentando findOne sin extraer coordenadas en SQL...');
      result = await pool.query(
        'SELECT * FROM core.businesses WHERE id = $1',
        [id]
      );
      
      // Extraer coordenadas manualmente del campo location (POINT)
      if (result.rows.length > 0 && result.rows[0].location) {
        const row = result.rows[0];
        if (row.location && typeof row.location === 'object') {
          if (row.location.x !== undefined && row.location.y !== undefined) {
            row.longitude = row.location.x;
            row.latitude = row.location.y;
          }
        } else if (row.location && typeof row.location === 'string') {
          const match = row.location.match(/POINT\(([^ ]+) ([^ ]+)\)/);
          if (match) {
            row.longitude = parseFloat(match[1]);
            row.latitude = parseFloat(match[2]);
          }
        }
      }
    }

    if (result.rows.length === 0) {
      throw new NotFoundException(`Negocio con ID ${id} no encontrado`);
    }

    const business = result.rows[0];

    // Enriquecer con información del propietario
    if (business.owner_id) {
      try {
        const profileResult = await pool.query(
          'SELECT first_name, last_name, phone FROM core.user_profiles WHERE id = $1',
          [business.owner_id]
        );
        return {
          ...business,
          owner: profileResult.rows[0] || null,
        };
      } catch (e) {
        console.error(`Error obteniendo owner para business ${id}:`, e);
        return { ...business, owner: null };
      }
    }

    return { ...business, owner: null };
  }

  /**
   * Actualizar estado de un negocio (activar/desactivar)
   */
  async updateStatus(id: string, updateDto: UpdateBusinessStatusDto) {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    const pool = dbPool;
    // Verificar que el negocio existe
    await this.findOne(id);

    // Actualizar estado
    const result = await pool.query(
      `UPDATE core.businesses 
       SET is_active = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2 
       RETURNING *`,
      [updateDto.isActive, id]
    );

    if (result.rows.length === 0) {
      throw new NotFoundException(`Negocio con ID ${id} no encontrado`);
    }

    return result.rows[0];
  }

  /**
   * Crear un nuevo negocio
   */
  async create(ownerId: string, createDto: CreateBusinessDto) {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    const pool = dbPool;

    // Verificar que el usuario no tenga ya un negocio
    const existingBusiness = await pool.query(
      'SELECT id FROM core.businesses WHERE owner_id = $1',
      [ownerId]
    );

    if (existingBusiness.rows.length > 0) {
      throw new BadRequestException('El usuario ya tiene un negocio registrado');
    }

    // Validar que la ubicación esté dentro de la región activa
    const locationValidation = await this.validateLocationInRegion(
      createDto.longitude,
      createDto.latitude
    );

    if (!locationValidation.isValid) {
      throw new BadRequestException(
        locationValidation.message || 'La ubicación del negocio está fuera de la zona de cobertura activa. Por el momento solo operamos en La Roma, CDMX.'
      );
    }

    // Resolver category_id si se proporciona category (nombre)
    let categoryId: string | null = null;
    if (createDto.category_id) {
      // Si se proporciona category_id directamente, validar que existe
      const categoryCheck = await pool.query(
        'SELECT id FROM core.business_categories WHERE id = $1 AND is_active = true',
        [createDto.category_id]
      );
      if (categoryCheck.rows.length === 0) {
        throw new BadRequestException('La categoría especificada no existe o está inactiva');
      }
      categoryId = createDto.category_id;
    } else if (createDto.category) {
      // Si se proporciona category (nombre), buscar el ID correspondiente
      const categoryCheck = await pool.query(
        'SELECT id FROM core.business_categories WHERE name = $1 AND is_active = true',
        [createDto.category]
      );
      if (categoryCheck.rows.length > 0) {
        categoryId = categoryCheck.rows[0].id;
      }
      // Si no se encuentra en el catálogo, categoryId será null pero category (nombre) se guardará
    }

    // Crear dirección si se proporciona información de dirección
    let addressId: string | null = null;
    if (createDto.address_line1 || createDto.city) {
      const addressResult = await pool.query(
        `INSERT INTO core.addresses (
          user_id, address_type, address_line1, address_line2, 
          city, state, postal_code, country, location, is_default, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, ST_MakePoint($9, $10)::point, $11, $12)
        RETURNING id`,
        [
          ownerId,
          'Local',
          createDto.address_line1 || null,
          createDto.address_line2 || null,
          createDto.city || null,
          createDto.state || null,
          createDto.postal_code || null,
          createDto.country || 'México',
          createDto.longitude,
          createDto.latitude,
          true,
          true,
        ]
      );
      addressId = addressResult.rows[0]?.id || null;
    }

    // Crear el negocio
    const businessResult = await pool.query(
      `INSERT INTO core.businesses (
        owner_id, name, legal_name, description, category, category_id, tags,
        phone, email, website_url, address_id, location,
        is_active, accepts_orders, uses_eco_packaging, opening_hours
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, ST_MakePoint($12, $13)::point, $14, $15, $16, $17)
      RETURNING *`,
      [
        ownerId,
        createDto.name,
        createDto.legal_name || null,
        createDto.description || null,
        createDto.category, // Mantener category (nombre) para compatibilidad
        categoryId, // category_id (FK al catálogo)
        createDto.tags || [],
        createDto.phone || null,
        createDto.email || null,
        createDto.website_url || null,
        addressId,
        createDto.longitude,
        createDto.latitude,
        true, // is_active
        true, // accepts_orders
        createDto.uses_eco_packaging || false,
        createDto.opening_hours ? JSON.stringify(createDto.opening_hours) : null,
      ]
    );

    const business = businessResult.rows[0];

    // Extraer coordenadas del POINT
    if (business.location) {
      if (typeof business.location === 'object' && business.location.x !== undefined) {
        business.longitude = business.location.x;
        business.latitude = business.location.y;
      } else if (typeof business.location === 'string') {
        const match = business.location.match(/POINT\(([^ ]+) ([^ ]+)\)/);
        if (match) {
          business.longitude = parseFloat(match[1]);
          business.latitude = parseFloat(match[2]);
        }
      }
    }

    return business;
  }

  /**
   * Obtener el negocio del usuario actual
   */
  async findByOwnerId(ownerId: string) {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    const pool = dbPool;
    const result = await pool.query(
      `SELECT 
        b.*,
        (b.location)[0] as longitude,
        (b.location)[1] as latitude,
        bc.name as category_name,
        bc.description as category_description,
        bc.icon_url as category_icon_url
      FROM core.businesses b
      LEFT JOIN core.business_categories bc ON b.category_id = bc.id
      WHERE b.owner_id = $1`,
      [ownerId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const business = result.rows[0];

    // Si no se pudieron extraer las coordenadas en SQL, hacerlo manualmente
    if (!business.longitude && business.location) {
      if (typeof business.location === 'object' && business.location.x !== undefined) {
        business.longitude = business.location.x;
        business.latitude = business.location.y;
      } else if (typeof business.location === 'string') {
        const match = business.location.match(/POINT\(([^ ]+) ([^ ]+)\)/);
        if (match) {
          business.longitude = parseFloat(match[1]);
          business.latitude = parseFloat(match[2]);
        }
      }
    }

    return business;
  }

  /**
   * Obtener estadísticas de negocios
   */
  async getStatistics() {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    const pool = dbPool;
    // Total de negocios
    const totalResult = await pool.query('SELECT COUNT(*) as total FROM core.businesses');
    const total = parseInt(totalResult.rows[0].total, 10);

    // Negocios activos
    const activeResult = await pool.query(
      'SELECT COUNT(*) as active FROM core.businesses WHERE is_active = true'
    );
    const active = parseInt(activeResult.rows[0].active, 10);

    // Negocios inactivos
    const inactive = total - active;

    // Categorías más comunes
    const categoriesResult = await pool.query(
      `SELECT category, COUNT(*) as count 
       FROM core.businesses 
       WHERE is_active = true 
       GROUP BY category 
       ORDER BY count DESC`
    );

    const categories = categoriesResult.rows.map((row) => ({
      name: row.category,
      count: parseInt(row.count, 10),
    }));

    return {
      total,
      active,
      inactive,
      categories,
    };
  }

  /**
   * Obtener la región activa de servicio
   */
  async getActiveRegion() {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    const pool = dbPool;
    
    try {
      // Intentar usar la función SQL si existe
      const result = await pool.query('SELECT * FROM core.get_active_region()');

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0];
    } catch (error: any) {
      // Si la función no existe (error 42883), intentar consulta directa
      if (error.code === '42883' || error.message?.includes('does not exist') || error.message?.includes('function')) {
        console.log('⚠️  Función get_active_region() no existe, usando consulta directa');
        
        try {
          // Consulta directa como fallback
          const result = await pool.query(
            `SELECT 
              sr.id,
              sr.name,
              sr.description,
              sr.city,
              sr.state,
              sr.country,
              (sr.center_point)[0]::DOUBLE PRECISION as center_longitude,
              (sr.center_point)[1]::DOUBLE PRECISION as center_latitude,
              sr.max_delivery_radius_meters,
              sr.min_order_amount,
              ST_AsGeoJSON(sr.coverage_area)::TEXT as coverage_area_geojson
            FROM core.service_regions sr
            WHERE sr.is_default = TRUE AND sr.is_active = TRUE
            LIMIT 1`
          );

          if (result.rows.length === 0) {
            return null;
          }

          return result.rows[0];
        } catch (fallbackError: any) {
          // Si la tabla tampoco existe, retornar null
          if (fallbackError.code === '42P01' || fallbackError.message?.includes('does not exist')) {
            console.log('⚠️  Tabla service_regions no existe. Ejecuta el script database/service_regions.sql');
            return null;
          }
          
          console.error('❌ Error obteniendo región activa:', {
            message: fallbackError.message,
            code: fallbackError.code,
            detail: fallbackError.detail,
          });
          throw new ServiceUnavailableException(`Error al obtener región activa: ${fallbackError.message}`);
        }
      }
      
      // Para otros errores, lanzar excepción
      console.error('❌ Error obteniendo región activa:', {
        message: error.message,
        code: error.code,
        detail: error.detail,
      });
      throw new ServiceUnavailableException(`Error al obtener región activa: ${error.message}`);
    }
  }

  /**
   * Validar si una ubicación está dentro de la región activa
   */
  async validateLocationInRegion(longitude: number, latitude: number): Promise<{
    isValid: boolean;
    region?: any;
    message?: string;
  }> {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    const pool = dbPool;
    
    try {
      // Obtener la región activa
      const region = await this.getActiveRegion();
      
      if (!region) {
        return {
          isValid: false,
          message: 'No hay región de servicio activa configurada. Por favor ejecuta el script database/service_regions.sql',
        };
      }

      // Intentar usar la función SQL si existe
      try {
        const validationResult = await pool.query(
          'SELECT core.is_location_in_region($1, $2) as is_valid',
          [longitude, latitude]
        );

        const isValid = validationResult.rows[0]?.is_valid || false;

        return {
          isValid,
          region: isValid ? region : null,
          message: isValid 
            ? 'La ubicación está dentro de la zona de cobertura'
            : 'La ubicación está fuera de la zona de cobertura activa (La Roma)',
        };
      } catch (funcError: any) {
        // Si la función no existe, usar validación directa con PostGIS
        if (funcError.code === '42883' || funcError.message?.includes('does not exist')) {
          console.log('⚠️  Función is_location_in_region() no existe, usando validación directa con PostGIS');
          
          try {
            // Validación directa usando ST_Within
            const point = `ST_SetSRID(ST_MakePoint($1, $2), 4326)`;
            const validationResult = await pool.query(
              `SELECT ST_Within(${point}, sr.coverage_area) as is_valid
               FROM core.service_regions sr
               WHERE sr.id = $3 AND sr.is_active = TRUE`,
              [longitude, latitude, region.id]
            );

            const isValid = validationResult.rows[0]?.is_valid || false;

            return {
              isValid,
              region: isValid ? region : null,
              message: isValid 
                ? 'La ubicación está dentro de la zona de cobertura'
                : 'La ubicación está fuera de la zona de cobertura activa (La Roma)',
            };
          } catch (postgisError: any) {
            console.error('❌ Error en validación PostGIS:', {
              message: postgisError.message,
              code: postgisError.code,
            });
            
            // Si PostGIS no está disponible, permitir la ubicación pero advertir
            return {
              isValid: true, // Permitir por defecto si no se puede validar
              region: region,
              message: 'No se pudo validar la ubicación. Asegúrate de que PostGIS esté habilitado.',
            };
          }
        }
        
        throw funcError;
      }
    } catch (error: any) {
      console.error('❌ Error validando ubicación:', {
        message: error.message,
        code: error.code,
        detail: error.detail,
      });
      
      // Si es un error de tabla no encontrada, retornar mensaje claro
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        return {
          isValid: false,
          message: 'Sistema de regiones no configurado. Ejecuta el script database/service_regions.sql',
        };
      }
      
      throw new ServiceUnavailableException(`Error al validar ubicación: ${error.message}`);
    }
  }

  /**
   * Obtener todas las categorías de negocios disponibles
   */
  async getBusinessCategories() {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    const pool = dbPool;
    
    // Intentar obtener de la tabla de catálogo si existe
    try {
      const result = await pool.query(
        `SELECT id, name, description, icon_url, display_order, is_active
         FROM core.business_categories
         WHERE is_active = true
         ORDER BY display_order ASC, name ASC`
      );
      
      if (result.rows.length > 0) {
        return result.rows;
      }
    } catch (error: any) {
      // Si la tabla no existe, retornar categorías por defecto
      console.log('⚠️  Tabla business_categories no existe, usando categorías por defecto');
    }

    // Categorías por defecto si no existe el catálogo
    return [
      { name: 'Restaurante', description: 'Restaurantes con menú completo' },
      { name: 'Cafetería', description: 'Cafeterías y lugares de café' },
      { name: 'Pizzería', description: 'Pizzerías y comida italiana' },
      { name: 'Taquería', description: 'Taquerías y comida mexicana tradicional' },
      { name: 'Panadería', description: 'Panaderías y pastelerías' },
      { name: 'Heladería', description: 'Heladerías y postrerías' },
      { name: 'Comida Rápida', description: 'Restaurantes de comida rápida' },
      { name: 'Asiático', description: 'Restaurantes de comida asiática' },
      { name: 'Saludable/Vegano', description: 'Restaurantes saludables, veganos y vegetarianos' },
      { name: 'Pollería', description: 'Pollerías y rosticerías' },
      { name: 'Sandwich Shop', description: 'Tiendas de sandwiches y delis' },
      { name: 'Repostería', description: 'Repostería fina y pastelerías gourmet' },
      { name: 'Otro', description: 'Otras categorías de negocios' },
    ];
  }
}

