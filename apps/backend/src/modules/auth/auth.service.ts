import {
  Injectable,
  UnauthorizedException,
  ServiceUnavailableException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { SupabaseClient, User, AuthResponse } from '@supabase/supabase-js';
import { supabase, supabaseAdmin } from '../../config/supabase.config';
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
    if (!supabaseAdmin) {
      throw new ServiceUnavailableException('Servicio de base de datos no configurado');
    }

    // Aquí puedes implementar lógica para verificar roles
    // Por ejemplo, consultar la tabla user_profiles
    const { data, error } = await supabaseAdmin
      .from('user_profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (error || !data) {
      return false;
    }

    return data.role === role;
  }

  /**
   * Obtiene el perfil completo del usuario (incluyendo datos de user_profiles)
   */
  async getUserProfile(userId: string) {
    if (!supabaseAdmin) {
      throw new ServiceUnavailableException('Servicio de base de datos no configurado');
    }

    const { data, error } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !data) {
      throw new UnauthorizedException('Perfil de usuario no encontrado');
    }

    return data;
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

    // Crear perfil en core.user_profiles
    if (supabaseAdmin) {
      console.log('✅ Creando perfil en core.user_profiles...');
      const { error: profileError } = await supabaseAdmin
        .from('user_profiles')
        .insert({
          id: authData.user.id,
          role: signUpDto.role || 'client',
          first_name: signUpDto.firstName,
          last_name: signUpDto.lastName,
          phone: signUpDto.phone,
          phone_verified: false,
          is_active: true,
        });

      if (profileError) {
        // Si falla crear el perfil, intentar eliminar el usuario de auth
        // (opcional, depende de tu estrategia)
        console.error('❌ Error creando perfil de usuario:', profileError);
        console.error('  Detalles:', JSON.stringify(profileError, null, 2));
        // No lanzamos error aquí para no bloquear el registro
      } else {
        console.log('✅ Perfil creado exitosamente en core.user_profiles');
      }
    } else {
      console.warn('⚠️  supabaseAdmin no está disponible, no se creará perfil en core.user_profiles');
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

    // Obtener perfil del usuario
    let profile = null;
    if (supabaseAdmin) {
      const { data: profileData } = await supabaseAdmin
        .from('user_profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      profile = profileData;
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

