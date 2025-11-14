import {
  Injectable,
  UnauthorizedException,
  ServiceUnavailableException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { SupabaseClient, User, AuthResponse } from '@supabase/supabase-js';
import { supabase, supabaseAdmin } from '../../config/supabase.config';
import { dbPool } from '../../config/database.config';
import { SignUpDto } from './dto/signup.dto';
import { SignInDto } from './dto/signin.dto';

/**
 * Servicio de autenticación usando Supabase
 */
@Injectable()
export class AuthService {
  /**
   * Obtiene el usuario actual desde el token
   */
  async getUserFromToken(token: string): Promise<User> {
    if (!supabase) {
      throw new ServiceUnavailableException('Servicio de autenticación no configurado');
    }

    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      throw new UnauthorizedException('Token inválido o expirado');
    }

    return user;
  }

  /**
   * Verifica si un usuario tiene un rol específico
   */
  async hasRole(userId: string, role: string): Promise<boolean> {
    if (!dbPool) {
      return false;
    }

    const result = await dbPool.query(
      'SELECT role FROM core.user_profiles WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return false;
    }

    return result.rows[0].role === role;
  }

  /**
   * Obtiene el perfil completo del usuario (incluyendo datos de user_profiles)
   */
  async getUserProfile(userId: string) {
    // Usar conexión directa a PostgreSQL porque la tabla está en el schema 'core'
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    try {
      console.log('🔍 Buscando perfil para userId:', userId);
      let result = await dbPool.query(
        'SELECT * FROM core.user_profiles WHERE id = $1',
        [userId]
      );

      console.log('📊 Resultado de la consulta:', {
        rowCount: result.rows.length,
        hasData: result.rows.length > 0,
      });

      // Si no existe el perfil, intentar obtener información del usuario desde auth.users
      // y crear el perfil automáticamente
      if (result.rows.length === 0) {
        console.warn('⚠️  No se encontró perfil para userId:', userId);
        console.log('🔄 Intentando crear perfil automáticamente...');
        
        // Obtener información del usuario desde Supabase Auth
        if (!supabaseAdmin) {
          throw new ServiceUnavailableException('Servicio de autenticación no configurado');
        }

        const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(userId);
        
        if (authError || !authUser?.user) {
          console.error('❌ No se pudo obtener usuario de auth.users:', authError?.message);
          throw new UnauthorizedException('Usuario no encontrado en el sistema de autenticación');
        }

        const user = authUser.user;
        console.log('✅ Usuario encontrado en auth.users:', user.email);

        // Crear perfil con información básica
        // Intentar extraer nombre del user_metadata
        const firstName = user.user_metadata?.first_name || user.user_metadata?.firstName || null;
        const lastName = user.user_metadata?.last_name || user.user_metadata?.lastName || null;
        let phone = user.user_metadata?.phone || user.phone || null;
        
        // Validar y limpiar el teléfono si existe
        if (phone) {
          // Verificar si el teléfono ya existe en otro perfil
          const phoneCheck = await dbPool.query(
            'SELECT id FROM core.user_profiles WHERE phone = $1 AND id != $2',
            [phone, userId]
          );
          if (phoneCheck.rows.length > 0) {
            console.warn('⚠️  Teléfono ya existe en otro perfil, estableciendo a null');
            phone = null; // Evitar constraint violation
          }
        }
        
        // Determinar el rol (por defecto 'client', pero puede estar en metadata)
        // Validar que el rol sea uno de los permitidos
        const validRoles = ['client', 'repartidor', 'local', 'admin'];
        let role = user.user_metadata?.role || 'client';
        if (!validRoles.includes(role)) {
          console.warn(`⚠️  Rol inválido '${role}', usando 'client' por defecto`);
          role = 'client';
        }

        try {
          console.log('📝 Intentando insertar perfil con datos:', {
            userId,
            role,
            firstName,
            lastName,
            phone,
          });

          const insertResult = await dbPool.query(
            `INSERT INTO core.user_profiles (id, role, first_name, last_name, phone, phone_verified, is_active)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING *`,
            [
              userId,
              role,
              firstName,
              lastName,
              phone,
              false,
              true,
            ]
          );

          console.log('✅ Perfil creado automáticamente para userId:', userId);
          return insertResult.rows[0];
        } catch (insertError: any) {
          console.error('❌ Error al crear perfil automáticamente:', {
            message: insertError.message,
            code: insertError.code,
            detail: insertError.detail,
            hint: insertError.hint,
            constraint: insertError.constraint,
            table: insertError.table,
            column: insertError.column,
            stack: insertError.stack,
          });
          
          // Si es un error de constraint (por ejemplo, foreign key), proporcionar más información
          if (insertError.code === '23503') {
            throw new UnauthorizedException(
              `No se pudo crear el perfil: El usuario no existe en auth.users o hay un problema de referencia. Detalle: ${insertError.detail || insertError.message}`
            );
          }
          
          // Si es un error de constraint único (duplicado)
          if (insertError.code === '23505') {
            // El perfil ya existe, intentar obtenerlo nuevamente
            console.log('⚠️  Perfil ya existe (posible race condition), obteniendo nuevamente...');
            const retryResult = await dbPool.query(
              'SELECT * FROM core.user_profiles WHERE id = $1',
              [userId]
            );
            if (retryResult.rows.length > 0) {
              console.log('✅ Perfil encontrado después de retry');
              return retryResult.rows[0];
            }
          }
          
          // Si falla la inserción, lanzar el error con más detalles
          throw new UnauthorizedException(
            `Perfil de usuario no encontrado y no se pudo crear automáticamente: ${insertError.message || insertError.detail || 'Error desconocido'}`
          );
        }
      }

      return result.rows[0];
    } catch (error: any) {
      console.error('❌ Error en getUserProfile:', {
        message: error.message,
        code: error.code,
        detail: error.detail,
        hint: error.hint,
        stack: error.stack,
      });
      
      // Si es un error de conexión o de base de datos, lanzar ServiceUnavailableException
      if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT' || error.code?.startsWith('28')) {
        throw new ServiceUnavailableException(`Error de conexión a la base de datos: ${error.message}`);
      }
      
      // Si es un error de autenticación de PostgreSQL
      if (error.code === '28P01') {
        throw new ServiceUnavailableException('Error de autenticación con la base de datos. Verifica DATABASE_URL');
      }
      
      // Si es un error de schema o tabla no encontrada
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        throw new ServiceUnavailableException(`Tabla o schema no encontrado: ${error.message}`);
      }
      
      // Si es UnauthorizedException, re-lanzarlo tal cual
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      
      // Para otros errores, re-lanzar como BadRequestException con más detalles
      throw new BadRequestException(`Error al obtener perfil: ${error.message}`);
    }
  }

  /**
   * Registra un nuevo usuario
   */
  async signUp(signUpDto: SignUpDto) {
    // Debug: Verificar estado de Supabase
    console.log('🔍 Debug signUp:');
    console.log('  supabase client:', supabase ? '✅ Inicializado' : '❌ NULL');
    console.log('  supabaseAdmin client:', supabaseAdmin ? '✅ Inicializado' : '❌ NULL');
    
    if (!supabase) {
      console.error('❌ ERROR: supabase client es NULL');
      console.error('  SUPABASE_URL:', process.env.SUPABASE_URL ? 'Configurado' : 'Faltante');
      console.error('  SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? 'Configurado' : 'Faltante');
      throw new ServiceUnavailableException('Servicio de autenticación no configurado');
    }

    console.log('✅ Cliente Supabase disponible, intentando registro...');

    // Registrar usuario en Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: signUpDto.email,
      password: signUpDto.password,
      options: {
        data: {
          first_name: signUpDto.firstName,
          last_name: signUpDto.lastName,
          phone: signUpDto.phone,
        },
      },
    });

    if (authError) {
      console.error('❌ Error en Supabase Auth:', authError);
      // Si el usuario ya existe
      if (authError.message.includes('already registered') || authError.message.includes('already exists')) {
        throw new ConflictException('El email ya está registrado');
      }
      throw new BadRequestException(`Error al registrar usuario: ${authError.message}`);
    }

    if (!authData.user) {
      console.error('❌ ERROR: authData.user es null');
      console.error('  authData:', JSON.stringify(authData, null, 2));
      throw new BadRequestException('No se pudo crear el usuario');
    }

    console.log('✅ Usuario creado en Supabase Auth:', authData.user.id);

    // Crear perfil en core.user_profiles usando conexión directa
    if (dbPool) {
      console.log('✅ Creando perfil en core.user_profiles...');
      try {
        await dbPool.query(
          `INSERT INTO core.user_profiles (id, role, first_name, last_name, phone, phone_verified, is_active)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            authData.user.id,
            signUpDto.role || 'client',
            signUpDto.firstName,
            signUpDto.lastName,
            signUpDto.phone,
            false,
            true,
          ]
        );
        console.log('✅ Perfil creado exitosamente en core.user_profiles');
      } catch (profileError: any) {
        console.error('❌ Error creando perfil de usuario:', profileError);
        console.error('  Detalles:', profileError.message);
        // No lanzamos error aquí para no bloquear el registro
      }
    } else {
      console.warn('⚠️  dbPool no está disponible, no se creará perfil en core.user_profiles');
    }

    return {
      user: authData.user,
      session: authData.session,
      message: 'Usuario registrado exitosamente. Verifica tu email para confirmar tu cuenta.',
    };
  }

  /**
   * Inicia sesión con email y contraseña
   */
  async signIn(signInDto: SignInDto) {
    if (!supabase) {
      throw new ServiceUnavailableException('Servicio de autenticación no configurado');
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: signInDto.email,
      password: signInDto.password,
    });

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        throw new UnauthorizedException('Credenciales inválidas');
      }
      if (error.message.includes('Email not confirmed')) {
        throw new UnauthorizedException('Por favor verifica tu email antes de iniciar sesión');
      }
      throw new UnauthorizedException(`Error al iniciar sesión: ${error.message}`);
    }

    if (!data.user || !data.session) {
      throw new UnauthorizedException('No se pudo iniciar sesión');
    }

    // Obtener perfil del usuario usando conexión directa
    let profile = null;
    if (dbPool) {
      try {
        const profileResult = await dbPool.query(
          'SELECT * FROM core.user_profiles WHERE id = $1',
          [data.user.id]
        );
        profile = profileResult.rows[0] || null;
      } catch (e) {
        console.error('Error obteniendo perfil en signIn:', e);
      }
    }

    return {
      user: {
        ...data.user,
        profile,
      },
      session: data.session,
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
    };
  }

  /**
   * Solicita un email de recuperación de contraseña
   */
  async requestPasswordReset(email: string) {
    if (!supabase) {
      throw new ServiceUnavailableException('Servicio de autenticación no configurado');
    }

    // Obtener la URL base desde las variables de entorno o usar una por defecto
    const redirectTo = process.env.PASSWORD_RESET_REDIRECT_URL || 'http://localhost:3000/reset-password';

    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    if (error) {
      throw new BadRequestException(`Error al solicitar recuperación: ${error.message}`);
    }

    // Supabase siempre retorna éxito por seguridad (no revela si el email existe)
    return {
      message: 'Si el email existe, recibirás un enlace para recuperar tu contraseña',
      success: true,
    };
  }

  /**
   * Actualiza la contraseña usando el token de recuperación
   * Nota: En Supabase, el token viene en el hash de la URL de recuperación
   * El usuario debe hacer clic en el enlace del email, y luego Supabase
   * maneja la sesión automáticamente. Este endpoint actualiza la contraseña
   * para el usuario autenticado en la sesión actual.
   */
  async updatePassword(token: string, newPassword: string) {
    if (!supabase) {
      throw new ServiceUnavailableException('Servicio de autenticación no configurado');
    }

    // Nota: En Supabase, cuando el usuario hace clic en el enlace de recuperación,
    // Supabase establece una sesión temporal. Aquí asumimos que el usuario
    // ya está autenticado con esa sesión temporal.
    // Alternativamente, podríamos usar supabaseAdmin para forzar el cambio,
    // pero requiere el user_id.
    
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      if (error.message.includes('token') || error.message.includes('expired') || error.message.includes('session')) {
        throw new UnauthorizedException('Token inválido o expirado. Por favor solicita un nuevo enlace de recuperación.');
      }
      throw new BadRequestException(`Error al actualizar contraseña: ${error.message}`);
    }

    if (!data.user) {
      throw new BadRequestException('No se pudo actualizar la contraseña');
    }

    return {
      message: 'Contraseña actualizada exitosamente',
      success: true,
    };
  }

  /**
   * Cierra la sesión del usuario actual
   */
  async signOut(token?: string) {
    if (!supabase) {
      throw new ServiceUnavailableException('Servicio de autenticación no configurado');
    }

    const { error } = await supabase.auth.signOut();

    if (error) {
      throw new BadRequestException(`Error al cerrar sesión: ${error.message}`);
    }

    return {
      message: 'Sesión cerrada exitosamente',
      success: true,
    };
  }

  /**
   * Refresca el token de acceso usando el refresh token
   */
  async refreshToken(refreshToken: string) {
    if (!supabase) {
      throw new ServiceUnavailableException('Servicio de autenticación no configurado');
    }

    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (error) {
      throw new UnauthorizedException(`Error al refrescar token: ${error.message}`);
    }

    if (!data.session) {
      throw new UnauthorizedException('No se pudo refrescar la sesión');
    }

    return {
      session: data.session,
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
    };
  }
}

