import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { dbPool } from '../../config/database.config';
import { AssignUserDto, BusinessRole } from './dto/assign-user.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';

@Injectable()
export class BusinessUsersService {
  /**
   * Obtener todas las tiendas del superadmin
   */
  async getSuperadminBusinesses(superadminId: string) {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    try {
      const result = await dbPool.query(
        `SELECT * FROM core.get_superadmin_businesses($1)`,
        [superadminId]
      );
      return result.rows;
    } catch (error: any) {
      console.error('Error obteniendo tiendas del superadmin:', error);
      throw new BadRequestException(`Error al obtener tiendas: ${error.message}`);
    }
  }

  /**
   * Obtener todos los usuarios de un negocio
   */
  async getBusinessUsers(businessId: string) {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    try {
      // Usar la función SQL que creamos
      const result = await dbPool.query(
        `SELECT * FROM core.get_business_users($1)`,
        [businessId]
      );
      
      // También obtener el ID de business_users para tener el registro completo
      const businessUsersResult = await dbPool.query(
        `SELECT bu.id, bu.business_id, bu.user_id, bu.role, bu.permissions, bu.is_active, bu.created_at, bu.updated_at
         FROM core.business_users bu
         WHERE bu.business_id = $1 AND bu.is_active = TRUE`,
        [businessId]
      );
      
      // Combinar datos de ambas consultas
      return result.rows.map((row) => {
        const businessUser = businessUsersResult.rows.find(bu => bu.user_id === row.user_id);
        return {
          id: businessUser?.id || row.user_id, // ID de business_users o user_id como fallback
          business_id: businessId,
          user_id: row.user_id,
          user_email: row.user_email,
          first_name: row.first_name,
          last_name: row.last_name,
          role: row.role,
          permissions: businessUser?.permissions || {},
          is_active: row.is_active,
          created_at: row.created_at,
        };
      });
    } catch (error: any) {
      console.error('Error obteniendo usuarios del negocio:', error);
      throw new BadRequestException(`Error al obtener usuarios: ${error.message}`);
    }
  }

  /**
   * Obtener usuarios disponibles para asignar
   */
  async getAvailableUsers(businessId: string, searchTerm?: string) {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    try {
      const result = await dbPool.query(
        `SELECT * FROM core.get_available_users_for_business($1, $2)`,
        [businessId, searchTerm || null]
      );
      return result.rows;
    } catch (error: any) {
      console.error('Error obteniendo usuarios disponibles:', error);
      throw new BadRequestException(`Error al obtener usuarios disponibles: ${error.message}`);
    }
  }

  /**
   * Asignar usuario a un negocio
   */
  async assignUserToBusiness(
    businessId: string,
    superadminId: string,
    assignDto: AssignUserDto
  ) {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    try {
      const permissions = assignDto.permissions || {};
      const result = await dbPool.query(
        `SELECT core.assign_user_to_business($1, $2, $3, $4, $5) as assignment_id`,
        [
          superadminId,
          businessId,
          assignDto.user_id,
          assignDto.role,
          JSON.stringify(permissions),
        ]
      );

      // Obtener el usuario asignado usando la función SQL
      const userResult = await dbPool.query(
        `SELECT * FROM core.get_business_users($1) WHERE user_id = $2`,
        [businessId, assignDto.user_id]
      );

      if (userResult.rows.length === 0) {
        throw new NotFoundException('Usuario asignado no encontrado');
      }

      const user = userResult.rows[0];
      
      // Obtener el ID de business_users y permisos
      const businessUserResult = await dbPool.query(
        `SELECT id, permissions FROM core.business_users WHERE business_id = $1 AND user_id = $2`,
        [businessId, assignDto.user_id]
      );
      
      return {
        id: businessUserResult.rows[0]?.id || user.user_id,
        business_id: businessId,
        user_id: user.user_id,
        user_email: user.user_email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
        permissions: businessUserResult.rows[0]?.permissions || assignDto.permissions || {},
        is_active: user.is_active,
        created_at: user.created_at,
      };
    } catch (error: any) {
      console.error('Error asignando usuario:', error);
      
      // Manejar errores específicos de la función SQL
      if (error.message?.includes('Solo el superadmin')) {
        throw new ForbiddenException(error.message);
      }
      if (error.message?.includes('Solo puede haber un superadmin')) {
        throw new BadRequestException(error.message);
      }
      
      throw new BadRequestException(`Error al asignar usuario: ${error.message}`);
    }
  }

  /**
   * Cambiar rol de usuario en un negocio
   */
  async changeUserRole(
    businessId: string,
    userId: string,
    superadminId: string,
    updateDto: UpdateUserRoleDto
  ) {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    try {
      await dbPool.query(
        `SELECT core.change_user_role_in_business($1, $2, $3, $4)`,
        [superadminId, businessId, userId, updateDto.role]
      );

      // Obtener el usuario actualizado
      const userResult = await dbPool.query(
        `SELECT * FROM core.get_business_users($1) WHERE user_id = $2`,
        [businessId, userId]
      );

      if (userResult.rows.length === 0) {
        throw new NotFoundException('Usuario no encontrado');
      }

      const user = userResult.rows[0];
      
      // Obtener el ID de business_users
      const businessUserResult = await dbPool.query(
        `SELECT id, permissions FROM core.business_users WHERE business_id = $1 AND user_id = $2`,
        [businessId, userId]
      );
      
      return {
        id: businessUserResult.rows[0]?.id || user.user_id,
        business_id: businessId,
        user_id: user.user_id,
        user_email: user.user_email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
        permissions: businessUserResult.rows[0]?.permissions || updateDto.permissions || {},
        is_active: user.is_active,
        created_at: user.created_at,
      };
    } catch (error: any) {
      console.error('Error cambiando rol:', error);
      
      if (error.message?.includes('Solo el superadmin')) {
        throw new ForbiddenException(error.message);
      }
      if (error.message?.includes('Solo puede haber un superadmin')) {
        throw new BadRequestException(error.message);
      }
      
      throw new BadRequestException(`Error al cambiar rol: ${error.message}`);
    }
  }

  /**
   * Remover usuario de un negocio
   */
  async removeUserFromBusiness(
    businessId: string,
    userId: string,
    superadminId: string
  ) {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    try {
      await dbPool.query(
        `SELECT core.remove_user_from_business($1, $2, $3)`,
        [superadminId, businessId, userId]
      );
      return { success: true, message: 'Usuario removido exitosamente' };
    } catch (error: any) {
      console.error('Error removiendo usuario:', error);
      
      if (error.message?.includes('Solo el superadmin')) {
        throw new ForbiddenException(error.message);
      }
      if (error.message?.includes('No se puede remover al superadmin')) {
        throw new BadRequestException(error.message);
      }
      
      throw new BadRequestException(`Error al remover usuario: ${error.message}`);
    }
  }

  /**
   * Obtener resumen de permisos de un usuario
   */
  async getUserBusinessesSummary(userId: string) {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    try {
      const result = await dbPool.query(
        `SELECT * FROM core.get_user_businesses_summary($1)`,
        [userId]
      );
      return result.rows;
    } catch (error: any) {
      console.error('Error obteniendo resumen de permisos:', error);
      throw new BadRequestException(`Error al obtener resumen: ${error.message}`);
    }
  }

  /**
   * Verificar si un usuario es superadmin de un negocio
   */
  async isSuperadminOfBusiness(userId: string, businessId: string): Promise<boolean> {
    if (!dbPool) {
      return false;
    }

    try {
      const result = await dbPool.query(
        `SELECT core.user_has_business_role($1, $2, 'superadmin') as is_superadmin`,
        [userId, businessId]
      );
      return result.rows[0]?.is_superadmin || false;
    } catch (error: any) {
      console.error('Error verificando rol superadmin:', error);
      return false;
    }
  }

  /**
   * Obtener todos los usuarios de la cuenta del superadmin (todas sus tiendas)
   */
  async getSuperadminAccountUsers(superadminId: string) {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    try {
      // Verificar si la función existe, si no, usar consulta directa
      const functionExists = await dbPool.query(
        `SELECT EXISTS (
          SELECT 1 
          FROM pg_proc p
          JOIN pg_namespace n ON p.pronamespace = n.oid
          WHERE n.nspname = 'core' 
          AND p.proname = 'get_superadmin_account_users'
        ) as exists`
      );

      if (functionExists.rows[0]?.exists) {
        // Usar la función SQL si existe
        const result = await dbPool.query(
          `SELECT * FROM core.get_superadmin_account_users($1)`,
          [superadminId]
        );
        return result.rows;
      } else {
        // Fallback: consulta directa si la función no existe
        console.warn('Función get_superadmin_account_users no existe, usando consulta directa');
        const result = await dbPool.query(
          `SELECT DISTINCT
            bu.user_id,
            au.email::TEXT as user_email,
            up.first_name,
            up.last_name,
            bu.role,
            bu.business_id,
            b.name AS business_name,
            bu.is_active,
            bu.created_at
          FROM core.business_users bu
          INNER JOIN core.businesses b ON bu.business_id = b.id
          INNER JOIN auth.users au ON bu.user_id = au.id
          LEFT JOIN core.user_profiles up ON bu.user_id = up.id
          WHERE bu.business_id IN (
            SELECT business_id
            FROM core.business_users
            WHERE user_id = $1
            AND role = 'superadmin'
            AND is_active = TRUE
          )
          AND bu.is_active = TRUE
          AND bu.user_id != $1
          ORDER BY bu.created_at DESC, b.name, 
            CASE bu.role
              WHEN 'superadmin' THEN 1
              WHEN 'admin' THEN 2
              WHEN 'operativo_aceptador' THEN 3
              WHEN 'operativo_cocina' THEN 4
            END`,
          [superadminId]
        );
        return result.rows;
      }
    } catch (error: any) {
      console.error('Error obteniendo usuarios de la cuenta:', error);
      // Si no hay usuarios, retornar array vacío en lugar de error
      if (error.message?.includes('does not exist') || error.message?.includes('no existe')) {
        console.warn('Función SQL no encontrada o sin usuarios, retornando array vacío');
        return [];
      }
      throw new BadRequestException(`Error al obtener usuarios: ${error.message}`);
    }
  }

  /**
   * Obtener usuarios disponibles para asignar a la cuenta del superadmin
   */
  async getAvailableUsersForSuperadminAccount(superadminId: string, searchTerm?: string) {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    try {
      // Verificar si la función existe
      const functionExists = await dbPool.query(
        `SELECT EXISTS (
          SELECT 1 
          FROM pg_proc p
          JOIN pg_namespace n ON p.pronamespace = n.oid
          WHERE n.nspname = 'core' 
          AND p.proname = 'get_available_users_for_superadmin_account'
        ) as exists`
      );

      if (functionExists.rows[0]?.exists) {
        const result = await dbPool.query(
          `SELECT * FROM core.get_available_users_for_superadmin_account($1, $2)`,
          [superadminId, searchTerm || null]
        );
        return result.rows;
      } else {
        // Fallback: consulta directa
        console.warn('Función get_available_users_for_superadmin_account no existe, usando consulta directa');
        const searchCondition = searchTerm 
          ? `AND (
            au.email ILIKE $2 OR 
            up.first_name ILIKE $2 OR 
            up.last_name ILIKE $2 OR
            up.phone ILIKE $2
          )`
          : '';
        const searchParam = searchTerm ? `%${searchTerm}%` : null;
        
        const result = await dbPool.query(
          `SELECT 
            au.id as user_id,
            au.email::TEXT as user_email,
            up.first_name,
            up.last_name,
            up.phone,
            EXISTS (
              SELECT 1
              FROM core.business_users bu
              WHERE bu.user_id = au.id
              AND bu.business_id IN (
                SELECT business_id
                FROM core.business_users
                WHERE user_id = $1
                AND role = 'superadmin'
                AND is_active = TRUE
              )
              AND bu.is_active = TRUE
            ) AS is_already_assigned,
            ARRAY(
              SELECT b.name
              FROM core.business_users bu
              INNER JOIN core.businesses b ON bu.business_id = b.id
              WHERE bu.user_id = au.id
              AND bu.business_id IN (
                SELECT business_id
                FROM core.business_users
                WHERE user_id = $1
                AND role = 'superadmin'
                AND is_active = TRUE
              )
              AND bu.is_active = TRUE
            ) AS assigned_businesses,
            ARRAY(
              SELECT bu.role::text
              FROM core.business_users bu
              WHERE bu.user_id = au.id
              AND bu.business_id IN (
                SELECT business_id
                FROM core.business_users
                WHERE user_id = $1
                AND role = 'superadmin'
                AND is_active = TRUE
              )
              AND bu.is_active = TRUE
            ) AS assigned_roles
          FROM auth.users au
          LEFT JOIN core.user_profiles up ON au.id = up.id
          WHERE au.id != $1
          ${searchCondition}
          ORDER BY 
            EXISTS (
              SELECT 1
              FROM core.business_users bu
              WHERE bu.user_id = au.id
              AND bu.business_id IN (
                SELECT business_id
                FROM core.business_users
                WHERE user_id = $1
                AND role = 'superadmin'
                AND is_active = TRUE
              )
              AND bu.is_active = TRUE
            ) DESC,
            au.email`,
          searchParam ? [superadminId, searchParam] : [superadminId]
        );
        return result.rows.map((row: any) => ({
          ...row,
          assigned_roles: row.assigned_roles || [],
        }));
      }
    } catch (error: any) {
      console.error('Error obteniendo usuarios disponibles:', error);
      // Si hay error, retornar array vacío
      if (error.message?.includes('does not exist') || error.message?.includes('no existe')) {
        console.warn('Función SQL no encontrada, retornando array vacío');
        return [];
      }
      throw new BadRequestException(`Error al obtener usuarios disponibles: ${error.message}`);
    }
  }

  /**
   * Remover usuario de todas las tiendas de la cuenta del superadmin
   */
  async removeUserFromSuperadminAccount(superadminId: string, userId: string) {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    try {
      // Verificar si la función existe
      const functionExists = await dbPool.query(
        `SELECT EXISTS (
          SELECT 1 
          FROM pg_proc p
          JOIN pg_namespace n ON p.pronamespace = n.oid
          WHERE n.nspname = 'core' 
          AND p.proname = 'remove_user_from_superadmin_account'
        ) as exists`
      );

      if (functionExists.rows[0]?.exists) {
        const result = await dbPool.query(
          `SELECT core.remove_user_from_superadmin_account($1, $2) as removed_count`,
          [superadminId, userId]
        );
        const removedCount = result.rows[0]?.removed_count || 0;
        return { 
          success: true, 
          message: `Usuario removido de ${removedCount} tienda(s)`,
          removed_count: removedCount
        };
      } else {
        // Fallback: remover directamente
        console.warn('Función remove_user_from_superadmin_account no existe, usando consulta directa');
        
        // Verificar que el usuario es superadmin
        const isSuperadmin = await this.isSuperadminOfBusiness(superadminId, 
          (await dbPool.query(
            `SELECT business_id FROM core.business_users 
             WHERE user_id = $1 AND role = 'superadmin' AND is_active = TRUE LIMIT 1`,
            [superadminId]
          )).rows[0]?.business_id || ''
        );
        
        if (!isSuperadmin) {
          throw new ForbiddenException('Solo un superadmin puede remover usuarios de su cuenta');
        }
        
        if (userId === superadminId) {
          throw new BadRequestException('No puedes removerte a ti mismo de tu cuenta');
        }
        
        const result = await dbPool.query(
          `UPDATE core.business_users
           SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
           WHERE user_id = $1
           AND business_id IN (
             SELECT business_id
             FROM core.business_users
             WHERE user_id = $2
             AND role = 'superadmin'
             AND is_active = TRUE
           )
           AND is_active = TRUE
           RETURNING id`,
          [userId, superadminId]
        );
        
        return { 
          success: true, 
          message: `Usuario removido de ${result.rowCount} tienda(s)`,
          removed_count: result.rowCount
        };
      }
    } catch (error: any) {
      console.error('Error removiendo usuario de la cuenta:', error);
      
      if (error.message?.includes('Solo un superadmin')) {
        throw new ForbiddenException(error.message);
      }
      if (error.message?.includes('No puedes removerte')) {
        throw new BadRequestException(error.message);
      }
      
      throw new BadRequestException(`Error al remover usuario: ${error.message}`);
    }
  }

  /**
   * Obtener resumen de usuarios por tienda de la cuenta del superadmin
   */
  async getSuperadminAccountUsersSummary(superadminId: string) {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    try {
      const result = await dbPool.query(
        `SELECT * FROM core.get_superadmin_account_users_summary($1)`,
        [superadminId]
      );
      return result.rows;
    } catch (error: any) {
      console.error('Error obteniendo resumen de usuarios:', error);
      throw new BadRequestException(`Error al obtener resumen: ${error.message}`);
    }
  }
}

