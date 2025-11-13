-- ============================================================================
-- DELIVERY ECOSYSTEM - Seed Data: Ciclo Completo de Delivery
-- ============================================================================
-- Descripción: Datos de ejemplo para un ciclo completo de delivery:
--              - Usuarios (cliente, repartidor, local)
--              - Negocio con productos y colecciones
--              - Pedido completo
--              - Entrega
--              - Evaluación y propina
-- 
-- Uso: Ejecutar después de schema.sql para poblar datos de ejemplo
-- ============================================================================
-- Versión: 1.0
-- Fecha: 2024-11-18
-- ============================================================================

-- Configurar search_path
SET search_path TO core, catalog, orders, reviews, communication, commerce, social, public;

-- ============================================================================
-- LIMPIAR DATOS EXISTENTES (OPCIONAL - Descomentar si necesitas resetear)
-- ============================================================================
/*
DELETE FROM reviews.tips WHERE order_id IN (SELECT id FROM orders.orders WHERE business_id = '11111111-1111-1111-1111-111111111111');
DELETE FROM reviews.reviews WHERE order_id IN (SELECT id FROM orders.orders WHERE business_id = '11111111-1111-1111-1111-111111111111');
DELETE FROM orders.order_items WHERE order_id IN (SELECT id FROM orders.orders WHERE business_id = '11111111-1111-1111-1111-111111111111');
DELETE FROM orders.deliveries WHERE order_id IN (SELECT id FROM orders.orders WHERE business_id = '11111111-1111-1111-1111-111111111111');
DELETE FROM orders.orders WHERE business_id = '11111111-1111-1111-1111-111111111111';
DELETE FROM catalog.collection_products WHERE collection_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
DELETE FROM catalog.collections WHERE business_id = '11111111-1111-1111-1111-111111111111';
DELETE FROM catalog.products WHERE business_id = '11111111-1111-1111-1111-111111111111';
DELETE FROM catalog.product_categories WHERE business_id = '11111111-1111-1111-1111-111111111111';
DELETE FROM core.businesses WHERE id = '11111111-1111-1111-1111-111111111111';
DELETE FROM core.addresses WHERE user_id IN ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111');
DELETE FROM core.repartidores WHERE user_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
DELETE FROM core.users WHERE id IN ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111');
*/

-- ============================================================================
-- 1. USUARIOS
-- ============================================================================

-- Cliente
INSERT INTO core.users (
    id, email, phone, password_hash, role, first_name, last_name,
    email_verified, phone_verified, is_active, wallet_user_id
) VALUES (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'cliente@example.com',
    '+525512345678',
    '$2b$10$example_hashed_password_here', -- En producción usar hash real
    'client',
    'Juan',
    'Pérez',
    TRUE,
    TRUE,
    TRUE,
    'wallet-user-cliente-001' -- Referencia externa al Wallet
) ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name;

-- Repartidor
INSERT INTO core.users (
    id, email, phone, password_hash, role, first_name, last_name,
    email_verified, phone_verified, is_active, wallet_user_id
) VALUES (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'repartidor@example.com',
    '+525598765432',
    '$2b$10$example_hashed_password_here',
    'repartidor',
    'Carlos',
    'González',
    TRUE,
    TRUE,
    TRUE,
    'wallet-user-repartidor-001'
) ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name;

-- Dueño del Local
INSERT INTO core.users (
    id, email, phone, password_hash, role, first_name, last_name,
    email_verified, phone_verified, is_active, wallet_user_id
) VALUES (
    '11111111-1111-1111-1111-111111111111',
    'local@example.com',
    '+525555555555',
    '$2b$10$example_hashed_password_here',
    'local',
    'María',
    'Rodríguez',
    TRUE,
    TRUE,
    TRUE,
    'wallet-user-local-001'
) ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name;

-- ============================================================================
-- 2. DIRECCIONES
-- ============================================================================

-- Dirección del Cliente (La Roma, CDMX)
INSERT INTO core.addresses (
    id, user_id, label, street, street_number, neighborhood,
    city, state, postal_code, country, location, is_default, is_active
) VALUES (
    'aaaa0000-0000-0000-0000-000000000001',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'Casa',
    'Calle Orizaba',
    '123',
    'Roma Norte',
    'Ciudad de México',
    'CDMX',
    '06700',
    'México',
    ST_MakePoint(-99.1619, 19.4230), -- Coordenadas La Roma
    TRUE,
    TRUE
) ON CONFLICT (id) DO NOTHING;

-- Dirección del Local (La Roma, CDMX)
INSERT INTO core.addresses (
    id, user_id, label, street, street_number, neighborhood,
    city, state, postal_code, country, location, is_default, is_active
) VALUES (
    '11110000-0000-0000-0000-000000000001',
    '11111111-1111-1111-1111-111111111111',
    'Local',
    'Avenida Álvaro Obregón',
    '45',
    'Roma Norte',
    'Ciudad de México',
    'CDMX',
    '06700',
    'México',
    ST_MakePoint(-99.1600, 19.4220), -- Coordenadas cerca del cliente
    TRUE,
    TRUE
) ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 3. NEGOCIO
-- ============================================================================

INSERT INTO core.businesses (
    id, owner_id, name, legal_name, description, category,
    phone, email, address_id, location,
    is_active, is_verified, accepts_orders,
    commission_rate, uses_eco_packaging, packaging_type,
    opening_hours, rating_average, total_reviews, total_orders,
    wallet_business_id
) VALUES (
    '11111111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111111',
    'Restaurante La Roma',
    'Restaurante La Roma S.A. de C.V.',
    'Restaurante de comida mexicana e internacional en el corazón de La Roma',
    'Restaurante',
    '+525555555555',
    'contacto@restaurantelaroma.com',
    '11110000-0000-0000-0000-000000000001',
    ST_MakePoint(-99.1600, 19.4220),
    TRUE,
    TRUE,
    TRUE,
    15.00,
    TRUE,
    'biodegradable',
    '{"monday": {"open": "09:00", "close": "22:00"}, "tuesday": {"open": "09:00", "close": "22:00"}, "wednesday": {"open": "09:00", "close": "22:00"}, "thursday": {"open": "09:00", "close": "22:00"}, "friday": {"open": "09:00", "close": "23:00"}, "saturday": {"open": "10:00", "close": "23:00"}, "sunday": {"open": "10:00", "close": "21:00"}}'::jsonb,
    4.5,
    25,
    120,
    'wallet-business-001'
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    is_active = EXCLUDED.is_active;

-- ============================================================================
-- 4. CATEGORÍAS DE PRODUCTOS (Específicas del negocio)
-- ============================================================================

INSERT INTO catalog.product_categories (
    id, business_id, name, description, display_order, is_active
) VALUES
    ('cat00001-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Tacos', 'Tacos tradicionales y especiales', 1, TRUE),
    ('cat00001-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'Hamburguesas', 'Hamburguesas artesanales', 2, TRUE),
    ('cat00001-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'Bebidas', 'Refrescos, aguas, jugos', 3, TRUE),
    ('cat00001-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'Postres', 'Dulces y postres caseros', 4, TRUE)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 5. PRODUCTOS
-- ============================================================================

INSERT INTO catalog.products (
    id, business_id, name, description, price, category_id,
    is_available, is_featured, display_order
) VALUES
    -- Tacos
    ('prod0001-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 
     'Tacos al Pastor', 'Tacos tradicionales de pastor con piña', 35.00,
     'cat00001-0000-0000-0000-000000000001', TRUE, TRUE, 1),
    
    ('prod0001-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111',
     'Tacos de Suadero', 'Tacos de suadero bien dorados', 30.00,
     'cat00001-0000-0000-0000-000000000001', TRUE, FALSE, 2),
    
    -- Hamburguesas
    ('prod0001-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111',
     'Hamburguesa Clásica', 'Carne, lechuga, tomate, cebolla, queso', 120.00,
     'cat00001-0000-0000-0000-000000000002', TRUE, TRUE, 1),
    
    ('prod0001-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111',
     'Hamburguesa BBQ', 'Carne, tocino, queso, cebolla caramelizada, salsa BBQ', 150.00,
     'cat00001-0000-0000-0000-000000000002', TRUE, FALSE, 2),
    
    -- Bebidas
    ('prod0001-0000-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111',
     'Coca Cola 600ml', 'Refresco de cola', 25.00,
     'cat00001-0000-0000-0000-000000000003', TRUE, FALSE, 1),
    
    ('prod0001-0000-0000-0000-000000000006', '11111111-1111-1111-1111-111111111111',
     'Agua de Horchata', 'Agua fresca de horchata', 30.00,
     'cat00001-0000-0000-0000-000000000003', TRUE, TRUE, 2),
    
    -- Postres
    ('prod0001-0000-0000-0000-000000000007', '11111111-1111-1111-1111-111111111111',
     'Flan Napolitano', 'Flan casero con caramelo', 45.00,
     'cat00001-0000-0000-0000-000000000004', TRUE, FALSE, 1)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 6. COLECCIÓN (COMBO)
-- ============================================================================

INSERT INTO catalog.collections (
    id, business_id, name, description, type, price, original_price,
    is_available, is_featured, display_order
) VALUES (
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    '11111111-1111-1111-1111-111111111111',
    'Combo Familiar',
    '2 Hamburguesas Clásicas + 2 Bebidas + Papas',
    'combo',
    280.00,  -- Precio del combo
    340.00,  -- Precio si se compraran por separado (2x120 + 2x25 + 50)
    TRUE,
    TRUE,
    1
) ON CONFLICT (id) DO NOTHING;

-- Productos en la colección
INSERT INTO catalog.collection_products (
    id, collection_id, product_id, quantity, display_order
) VALUES
    ('collprod1-0000-0000-0000-000000000001', 'cccccccc-cccc-cccc-cccc-cccccccccccc',
     'prod0001-0000-0000-0000-000000000003', 2, 1), -- 2 Hamburguesas Clásicas
    ('collprod1-0000-0000-0000-000000000002', 'cccccccc-cccc-cccc-cccc-cccccccccccc',
     'prod0001-0000-0000-0000-000000000005', 2, 2)  -- 2 Coca Colas
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 7. REPARTIDOR
-- ============================================================================

INSERT INTO core.repartidores (
    id, user_id, vehicle_type, vehicle_description,
    is_available, is_verified, is_active,
    current_location, last_location_update,
    is_green_repartidor, wallet_repartidor_id
) VALUES (
    'repart0001-0000-0000-0000-000000000001',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'bicycle',
    'Bicicleta de montaña roja',
    TRUE,
    TRUE,
    TRUE,
    ST_MakePoint(-99.1590, 19.4215), -- Cerca del local
    CURRENT_TIMESTAMP,
    TRUE, -- Repartidor ecológico
    'wallet-repartidor-001'
) ON CONFLICT (id) DO UPDATE SET
    is_available = EXCLUDED.is_available,
    current_location = EXCLUDED.current_location;

-- ============================================================================
-- 8. PEDIDO
-- ============================================================================

INSERT INTO orders.orders (
    id, client_id, business_id, status,
    delivery_address_id, delivery_address_text, delivery_location,
    subtotal, tax_amount, delivery_fee, discount_amount, tip_amount, total_amount,
    payment_method, payment_status, payment_transaction_id,
    estimated_delivery_time, actual_delivery_time,
    packaging_type, wallet_transaction_id,
    created_at, confirmed_at, delivered_at
) VALUES (
    'order0001-0000-0000-0000-000000000001',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '11111111-1111-1111-1111-111111111111',
    'delivered',
    'aaaa0000-0000-0000-0000-000000000001',
    'Calle Orizaba 123, Roma Norte, CDMX, 06700',
    ST_MakePoint(-99.1619, 19.4230),
    280.00,  -- Subtotal (Combo Familiar)
    44.80,   -- IVA (16%)
    30.00,   -- Costo de envío
    0.00,    -- Sin descuento
    50.00,   -- Propina
    404.80,  -- Total
    'localcoins',
    'paid',
    'wallet-txn-order-001',
    25,      -- 25 minutos estimados
    22,      -- 22 minutos reales
    'biodegradable',
    'wallet-txn-order-001',
    CURRENT_TIMESTAMP - INTERVAL '1 hour',
    CURRENT_TIMESTAMP - INTERVAL '55 minutes',
    CURRENT_TIMESTAMP - INTERVAL '38 minutes'
) ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 9. ITEMS DEL PEDIDO
-- ============================================================================

-- Item 1: Combo Familiar (colección)
INSERT INTO orders.order_items (
    id, order_id, collection_id,
    item_name, item_price, quantity, item_subtotal
) VALUES (
    'item0001-0000-0000-0000-000000000001',
    'order0001-0000-0000-0000-000000000001',
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'Combo Familiar',
    280.00,
    1,
    280.00
) ON CONFLICT (id) DO NOTHING;

-- Item 2: Producto individual (Flan)
INSERT INTO orders.order_items (
    id, order_id, product_id,
    item_name, item_price, quantity, item_subtotal
) VALUES (
    'item0001-0000-0000-0000-000000000002',
    'order0001-0000-0000-0000-000000000001',
    'prod0001-0000-0000-0000-000000000007',
    'Flan Napolitano',
    45.00,
    1,
    45.00
) ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 10. ENTREGA
-- ============================================================================

INSERT INTO orders.deliveries (
    id, order_id, repartidor_id, status,
    pickup_location, delivery_location,
    distance_km, estimated_time_minutes, actual_time_minutes,
    assigned_at, picked_up_at, delivered_at
) VALUES (
    'deliv0001-0000-0000-0000-000000000001',
    'order0001-0000-0000-0000-000000000001',
    'repart0001-0000-0000-0000-000000000001',
    'delivered',
    ST_MakePoint(-99.1600, 19.4220), -- Ubicación del local
    ST_MakePoint(-99.1619, 19.4230), -- Ubicación del cliente
    0.8,  -- 0.8 km de distancia
    25,   -- 25 minutos estimados
    22,   -- 22 minutos reales
    CURRENT_TIMESTAMP - INTERVAL '50 minutes',
    CURRENT_TIMESTAMP - INTERVAL '45 minutes',
    CURRENT_TIMESTAMP - INTERVAL '38 minutes'
) ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 11. EVALUACIÓN / RESEÑA
-- ============================================================================

INSERT INTO reviews.reviews (
    id, order_id, reviewer_id,
    business_rating, repartidor_rating,
    business_comment, repartidor_comment
) VALUES (
    'review0001-0000-0000-0000-000000000001',
    'order0001-0000-0000-0000-000000000001',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    5,  -- 5 estrellas al negocio
    5,  -- 5 estrellas al repartidor
    'Excelente comida, muy rica y bien presentada. El empaque ecológico es un plus.',
    'Muy puntual y amable. Llegó en bicicleta, muy ecológico. Recomendado.'
) ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 12. PROPINA
-- ============================================================================

INSERT INTO reviews.tips (
    id, order_id, repartidor_id, client_id,
    amount, wallet_transaction_id
) VALUES (
    'tip00001-0000-0000-0000-000000000001',
    'order0001-0000-0000-0000-000000000001',
    'repart0001-0000-0000-0000-000000000001',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    50.00,
    'wallet-txn-tip-001'
) ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- VERIFICACIÓN DE DATOS INSERTADOS
-- ============================================================================

-- Verificar el ciclo completo
SELECT 
    'Ciclo de Delivery Completo' as verificacion,
    (SELECT COUNT(*) FROM core.users WHERE id IN ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111')) as usuarios,
    (SELECT COUNT(*) FROM core.businesses WHERE id = '11111111-1111-1111-1111-111111111111') as negocios,
    (SELECT COUNT(*) FROM catalog.products WHERE business_id = '11111111-1111-1111-1111-111111111111') as productos,
    (SELECT COUNT(*) FROM catalog.collections WHERE business_id = '11111111-1111-1111-1111-111111111111') as colecciones,
    (SELECT COUNT(*) FROM orders.orders WHERE id = 'order0001-0000-0000-0000-000000000001') as pedidos,
    (SELECT COUNT(*) FROM orders.order_items WHERE order_id = 'order0001-0000-0000-0000-000000000001') as items,
    (SELECT COUNT(*) FROM orders.deliveries WHERE order_id = 'order0001-0000-0000-0000-000000000001') as entregas,
    (SELECT COUNT(*) FROM reviews.reviews WHERE order_id = 'order0001-0000-0000-0000-000000000001') as evaluaciones,
    (SELECT COUNT(*) FROM reviews.tips WHERE order_id = 'order0001-0000-0000-0000-000000000001') as propinas;

-- ============================================================================
-- FIN DEL SCRIPT DE CICLO COMPLETO
-- ============================================================================

