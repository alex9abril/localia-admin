import { Injectable, UnauthorizedException, ServiceUnavailableException } from '@nestjs/common';
import { SupabaseClient, User } from '@supabase/supabase-js';
import { supabase, supabaseAdmin } from '../../config/supabase.config';

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
}

