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
          *,
          (location)[0] as longitude,
          (location)[1] as latitude
        FROM core.businesses WHERE id = $1`,
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
}

