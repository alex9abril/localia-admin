-- ============================================================================
-- CREAR USUARIOS DE PRUEBA EN SUPABASE AUTH
-- ============================================================================
-- Descripción: Intenta crear usuarios en auth.users para testing
-- 
-- ⚠️ ADVERTENCIA: Este script puede no funcionar en Supabase sin permisos
--    de service_role. Si falla, usa el Dashboard o la API de Supabase.
-- ============================================================================
-- Versión: 1.0
-- Fecha: 2024-11-18
-- ============================================================================

-- Configurar search_path
SET search_path TO public, auth;

-- ============================================================================
-- OPCIÓN 1: Usar función de Supabase (si está disponible)
-- ============================================================================
-- Supabase puede tener funciones helper para crear usuarios
-- Intenta esto primero:

DO $$
DECLARE
    instance_id_val UUID;
    user_id_1 UUID := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    user_id_2 UUID := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
    user_id_3 UUID := '11111111-1111-1111-1111-111111111111';
BEGIN
    -- Obtener instance_id
    SELECT id INTO instance_id_val FROM auth.instances LIMIT 1;
    
    -- Intentar crear usuario 1 (Cliente)
    BEGIN
        INSERT INTO auth.users (
            id,
            instance_id,
            email,
            encrypted_password,
            email_confirmed_at,
            created_at,
            updated_at,
            raw_app_meta_data,
            raw_user_meta_data,
            is_super_admin,
            role,
            aud
        ) VALUES (
            user_id_1,
            instance_id_val,
            'cliente@example.com',
            crypt('password123', gen_salt('bf')),
            NOW(),
            NOW(),
            NOW(),
            '{"provider": "email", "providers": ["email"]}',
            '{}',
            FALSE,
            'authenticated',
            'authenticated'
        ) ON CONFLICT (id) DO NOTHING;
        
        RAISE NOTICE 'Usuario cliente creado o ya existe';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Error creando usuario cliente: %', SQLERRM;
    END;
    
    -- Intentar crear usuario 2 (Repartidor)
    BEGIN
        INSERT INTO auth.users (
            id,
            instance_id,
            email,
            encrypted_password,
            email_confirmed_at,
            created_at,
            updated_at,
            raw_app_meta_data,
            raw_user_meta_data,
            is_super_admin,
            role,
            aud
        ) VALUES (
            user_id_2,
            instance_id_val,
            'repartidor@example.com',
            crypt('password123', gen_salt('bf')),
            NOW(),
            NOW(),
            NOW(),
            '{"provider": "email", "providers": ["email"]}',
            '{}',
            FALSE,
            'authenticated',
            'authenticated'
        ) ON CONFLICT (id) DO NOTHING;
        
        RAISE NOTICE 'Usuario repartidor creado o ya existe';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Error creando usuario repartidor: %', SQLERRM;
    END;
    
    -- Intentar crear usuario 3 (Local)
    BEGIN
        INSERT INTO auth.users (
            id,
            instance_id,
            email,
            encrypted_password,
            email_confirmed_at,
            created_at,
            updated_at,
            raw_app_meta_data,
            raw_user_meta_data,
            is_super_admin,
            role,
            aud
        ) VALUES (
            user_id_3,
            instance_id_val,
            'local@example.com',
            crypt('password123', gen_salt('bf')),
            NOW(),
            NOW(),
            NOW(),
            '{"provider": "email", "providers": ["email"]}',
            '{}',
            FALSE,
            'authenticated',
            'authenticated'
        ) ON CONFLICT (id) DO NOTHING;
        
        RAISE NOTICE 'Usuario local creado o ya existe';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Error creando usuario local: %', SQLERRM;
    END;
END $$;

-- ============================================================================
-- VERIFICAR QUE LOS USUARIOS SE CREARON
-- ============================================================================

SELECT 
    id, 
    email, 
    email_confirmed_at IS NOT NULL as email_verified,
    created_at
FROM auth.users 
WHERE id IN (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    '11111111-1111-1111-1111-111111111111'
)
ORDER BY email;

-- ============================================================================
-- NOTA: Si este script falla con error de permisos
-- ============================================================================
-- Usa una de estas alternativas:
--
-- 1. Supabase Dashboard:
--    - Ve a Authentication > Users > Add User
--    - Crea los 3 usuarios manualmente
--
-- 2. Supabase Management API (desde tu aplicación):
--    const { data, error } = await supabase.auth.admin.createUser({
--      email: 'cliente@example.com',
--      password: 'password123',
--      email_confirm: true
--    });
--
-- 3. Conectarte con service_role key (solo desarrollo):
--    Usa la clave service_role de tu proyecto Supabase
--
-- ============================================================================

