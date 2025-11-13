-- ============================================================================
-- CREAR USUARIOS DE PRUEBA EN SUPABASE AUTH
-- ============================================================================
-- Descripción: Función para crear usuarios en auth.users para testing
-- 
-- ⚠️ ADVERTENCIA: Este script requiere permisos de service_role o superusuario.
--    En Supabase, normalmente NO puedes insertar directamente en auth.users.
--    Usa el Dashboard o la API de Supabase en su lugar.
-- ============================================================================
-- Versión: 2.0
-- Fecha: 2024-11-18
-- ============================================================================

-- Configurar search_path
SET search_path TO public, auth;

-- ============================================================================
-- FUNCIÓN PARA CREAR USUARIO DE PRUEBA
-- ============================================================================

CREATE OR REPLACE FUNCTION create_test_user(
    p_email TEXT,
    p_password TEXT DEFAULT 'password123',
    p_user_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_instance_id UUID;
    v_user_id UUID;
    v_encrypted_password TEXT;
BEGIN
    -- Obtener instance_id
    SELECT id INTO v_instance_id FROM auth.instances LIMIT 1;
    
    IF v_instance_id IS NULL THEN
        RAISE EXCEPTION 'No se encontró instance_id en auth.instances';
    END IF;
    
    -- Usar el ID proporcionado o generar uno nuevo
    IF p_user_id IS NULL THEN
        v_user_id := gen_random_uuid();
    ELSE
        v_user_id := p_user_id;
    END IF;
    
    -- Encriptar password
    v_encrypted_password := crypt(p_password, gen_salt('bf'));
    
    -- Intentar insertar usuario
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
        v_user_id,
        v_instance_id,
        p_email,
        v_encrypted_password,
        NOW(),
        NOW(),
        NOW(),
        '{"provider": "email", "providers": ["email"]}',
        '{}',
        FALSE,
        'authenticated',
        'authenticated'
    ) ON CONFLICT (id) DO NOTHING
    RETURNING id INTO v_user_id;
    
    -- Si no se insertó (conflicto), obtener el ID existente
    IF v_user_id IS NULL THEN
        SELECT id INTO v_user_id FROM auth.users WHERE email = p_email LIMIT 1;
        RAISE NOTICE 'Usuario % ya existe con ID: %', p_email, v_user_id;
    ELSE
        RAISE NOTICE 'Usuario % creado con ID: %', p_email, v_user_id;
    END IF;
    
    RETURN v_user_id;
EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Error creando usuario %: %', p_email, SQLERRM;
END;
$$;

-- ============================================================================
-- CREAR LOS 3 USUARIOS DE PRUEBA
-- ============================================================================

-- Ejecutar la función para crear cada usuario
SELECT create_test_user('cliente@example.com', 'password123');
SELECT create_test_user('repartidor@example.com', 'password123');
SELECT create_test_user('local@example.com', 'password123');

-- ============================================================================
-- VERIFICAR QUE LOS USUARIOS SE CREARON
-- ============================================================================

SELECT 
    id, 
    email, 
    email_confirmed_at IS NOT NULL as email_verified,
    created_at
FROM auth.users 
WHERE email IN (
    'cliente@example.com',
    'repartidor@example.com',
    'local@example.com'
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

