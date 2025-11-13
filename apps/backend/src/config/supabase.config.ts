import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Configuración de Supabase para el backend
 * 
 * Usa SUPABASE_SERVICE_ROLE_KEY para operaciones administrativas
 * que requieren permisos elevados (bypass RLS).
 */

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Validación más flexible: solo lanza error si se intenta usar sin configurar
// Esto permite que el servidor inicie sin las variables (útil para desarrollo)
if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.warn(
    '⚠️  WARNING: Missing Supabase environment variables.\n' +
    '   Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env file\n' +
    '   The server will start but Supabase features will not work.\n' +
    '   Copy env.example to .env and configure your credentials.'
  );
}

/**
 * Cliente de Supabase con permisos de service_role
 * 
 * ⚠️ ADVERTENCIA: Este cliente tiene acceso completo a la base de datos.
 * Úsalo solo en el backend, nunca en el frontend.
 */
export const supabaseAdmin: SupabaseClient | null = supabaseUrl && supabaseServiceRoleKey
  ? createClient(
      supabaseUrl,
      supabaseServiceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )
  : null;

/**
 * Cliente de Supabase con permisos anon (para operaciones públicas)
 * 
 * Usa este cliente cuando necesites respetar las políticas RLS (Row Level Security).
 */
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
export const supabase: SupabaseClient | null = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : supabaseAdmin;

/**
 * Configuración de la base de datos
 */
export const dbConfig = {
  url: process.env.DATABASE_URL,
  schema: 'public',
};

export default supabaseAdmin;

