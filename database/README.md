# 📊 Base de Datos LOCALIA

Este directorio contiene el esquema de base de datos para la plataforma LOCALIA.

## 📁 Archivos

- **`schema.sql`**: Script SQL con la estructura completa de la base de datos (tablas, índices, triggers, funciones)
- **`seed_catalog.sql`**: Script para poblar datos de catálogo (categorías globales de ejemplo)
- **`seed_delivery_cycle.sql`**: Script completo con un ciclo de delivery de ejemplo (usuarios, negocio, productos, pedido, entrega, evaluación, propina)

## 🗄️ Estructura de la Base de Datos

### Tecnología
- **SGBD:** PostgreSQL 12+
- **Extensiones:** `uuid-ossp` (UUIDs), `postgis` (geolocalización)
- **Organización:** Schemas por dominio funcional

### Características Principales

✅ **Normalización:** Base de datos completamente normalizada (3NF)  
✅ **Organización por Schemas:** Tablas agrupadas en 7 schemas lógicos  
✅ **Integridad Referencial:** Constraints y foreign keys en todas las relaciones  
✅ **Índices Optimizados:** Índices estratégicos para consultas frecuentes  
✅ **Geolocalización:** Soporte para consultas espaciales con PostGIS  
✅ **Triggers Automáticos:** Actualización de timestamps y métricas  
✅ **Escalabilidad:** Diseño preparado para crecimiento

### Schemas (Organización por Dominio)

La base de datos está organizada en **7 schemas** para mejor mantenibilidad:

1. **`core`** - Entidades principales: usuarios, negocios, repartidores, direcciones
2. **`catalog`** - Catálogo: productos, categorías, colecciones
3. **`orders`** - Pedidos: órdenes, items, entregas
4. **`reviews`** - Evaluaciones: reseñas, propinas
5. **`communication`** - Comunicación: notificaciones, mensajes
6. **`commerce`** - Comercio: promociones, suscripciones, publicidad
7. **`social`** - Red social ecológica: posts, likes, comentarios, perfiles  

## 📋 Tablas Principales

### Schema: `core`
- `users` - Usuarios del sistema (clientes, repartidores, locales, admins)
- `addresses` - Direcciones de usuarios con geolocalización
- `businesses` - Locales/negocios registrados
- `repartidores` - Información específica de repartidores

### Schema: `catalog`
- `product_categories` - Categorías de productos (normalizadas, con jerarquía)
- `products` - Productos del menú de cada local
- `collections` - Colecciones de productos (combos, menús del día, paquetes)
- `collection_products` - Relación muchos-a-muchos entre colecciones y productos

### Schema: `orders`
- `orders` - Pedidos realizados por clientes
- `order_items` - Items individuales dentro de un pedido
- `deliveries` - Entregas asignadas a repartidores

### Schema: `reviews`
- `reviews` - Evaluaciones y reseñas
- `tips` - Propinas dadas a repartidores

### Schema: `communication`
- `notifications` - Notificaciones push del sistema
- `messages` - Mensajes de chat entre usuarios

### Schema: `commerce`
- `promotions` - Promociones y ofertas
- `promotion_uses` - Historial de uso de promociones
- `subscriptions` - Suscripciones premium
- `ads` - Publicidad interna de locales

### Schema: `social`
- `social_posts` - Publicaciones en la red social ecológica
- `social_likes` - Likes en publicaciones
- `social_comments` - Comentarios en publicaciones
- `social_follows` - Relaciones de seguimiento
- `user_eco_profile` - Perfil ecológico y métricas de impacto

## 🔗 Integración con Wallet

El sistema de **Wallet (LocalCoins)** es un proyecto separado. Este schema incluye referencias externas mediante campos UUID:

- `users.wallet_user_id` - ID del usuario en el Wallet
- `businesses.wallet_business_id` - ID del negocio en el Wallet
- `repartidores.wallet_repartidor_id` - ID del repartidor en el Wallet
- `orders.wallet_transaction_id` - ID de transacción en el Wallet
- `tips.wallet_transaction_id` - ID de transacción en el Wallet
- `subscriptions.wallet_subscription_id` - ID de suscripción en el Wallet

Estas referencias permiten la integración mediante APIs sin duplicar datos.

## 🚀 Uso

### Estructura de Scripts

Los scripts están organizados en tres archivos:

1. **`schema.sql`**: Estructura de la base de datos (tablas, índices, triggers, funciones)
   - Debe ejecutarse primero
   - Crea todos los schemas, tablas y relaciones

2. **`seed_catalog.sql`**: Datos de catálogo básicos
   - Categorías globales de ejemplo
   - Útil para tener categorías base sin datos de negocio

3. **`seed_delivery_cycle.sql`**: Ciclo completo de delivery
   - Usuarios (cliente, repartidor, dueño de local)
   - Negocio completo con productos y colecciones
   - Pedido completo con items
   - Entrega realizada
   - Evaluación y propina
   - **Recomendado para pruebas y desarrollo**

### Crear la Base de Datos

```bash
# Conectar a PostgreSQL
psql -U postgres

# Crear base de datos
CREATE DATABASE delivery_ecosystem;

# Conectar a la base de datos
\c delivery_ecosystem

# Ejecutar el schema (estructura)
\i database/schema.sql

# (Opcional) Poblar datos de ejemplo
# Opción 1: Solo catálogo básico
\i database/seed_catalog.sql

# Opción 2: Ciclo completo de delivery (recomendado para pruebas)
\i database/seed_delivery_cycle.sql
```

### Verificar Instalación

```sql
-- Ver todos los schemas
\dn

-- Ver todas las tablas (por schema)
\dt core.*
\dt catalog.*
\dt orders.*
\dt reviews.*
\dt communication.*
\dt commerce.*
\dt social.*

-- Ver estructura de una tabla
\d core.users
\d catalog.products
\d orders.orders

-- Ver índices
\di

-- Ver triggers
\dy

-- Ver todas las tablas en todos los schemas
SELECT table_schema, table_name
FROM information_schema.tables
WHERE table_schema IN ('core', 'catalog', 'orders', 'reviews', 'communication', 'commerce', 'social')
ORDER BY table_schema, table_name;
```

## 📊 Diagrama de Relaciones

### Entidades Principales (por Schema)

```
SCHEMA: core
├── users (1) ──┬── (N) addresses
│               ├── (1) repartidores
│               ├── (N) orders (como client_id)
│               └── (N) social_posts
│
├── businesses (1) ──┬── (N) product_categories
│                    ├── (N) products
│                    ├── (N) collections
│                    ├── (N) orders
│                    ├── (N) promotions
│                    └── (N) ads
│
└── repartidores (1) ──┬── (N) deliveries
                       └── (N) tips

SCHEMA: catalog
├── product_categories (1) ──┬── (N) products
│                             └── (1) parent_category (auto-referencia)
│
├── products (1) ──┬── (N) collection_products
│                  └── (N) order_items
│
└── collections (1) ──┬── (N) collection_products
                       └── (N) order_items

SCHEMA: orders
├── orders (1) ──┬── (N) order_items (productos o colecciones)
│                ├── (1) deliveries
│                ├── (1) reviews
│                └── (1) tips
│
└── deliveries (1) ── (N) repartidores

SCHEMA: reviews
├── reviews (1) ── (1) orders
└── tips (1) ──┬── (1) orders
               └── (1) repartidores

SCHEMA: communication
├── notifications (1) ── (N) users
└── messages (1) ──┬── (1) sender (users)
                   └── (1) recipient (users)

SCHEMA: commerce
├── promotions (1) ──┬── (N) promotion_uses
│                    └── (N) businesses
├── subscriptions (1) ── (N) users
└── ads (1) ── (N) businesses

SCHEMA: social
├── social_posts (1) ──┬── (N) social_likes
│                      ├── (N) social_comments
│                      └── (1) users
│
├── social_follows (1) ──┬── (1) follower (users)
│                        └── (1) following (users)
│
└── user_eco_profile (1) ── (1) users
```

## 📦 Sistema de Categorías y Colecciones

### Categorías de Productos

El sistema de categorías está **normalizado** y soporta:

- ✅ **Categorías globales**: Categorías compartidas por todos los negocios (ej: "Entradas", "Bebidas")
- ✅ **Categorías por negocio**: Categorías específicas de un local (ej: "Especialidades de la casa")
- ✅ **Jerarquía**: Categorías padre/hijo para subcategorías (ej: "Bebidas" → "Bebidas frías" → "Jugos")
- ✅ **Orden personalizado**: Control del orden de visualización

**Ejemplo de uso:**
```sql
-- Crear categoría global
INSERT INTO product_categories (name, description) 
VALUES ('Bebidas', 'Todas las bebidas disponibles');

-- Crear subcategoría
INSERT INTO product_categories (name, parent_category_id) 
VALUES ('Bebidas frías', (SELECT id FROM product_categories WHERE name = 'Bebidas'));

-- Asignar producto a categoría
UPDATE products SET category_id = (SELECT id FROM product_categories WHERE name = 'Bebidas')
WHERE id = 'uuid-del-producto';
```

### Colecciones de Productos

Las colecciones permiten agrupar productos en:

- 🍔 **Combos**: Paquetes fijos con precio especial (ej: "Combo Hamburguesa + Papas + Bebida")
- 📅 **Menús del día**: Menús especiales con validez por fecha
- 📦 **Paquetes**: Agrupaciones promocionales
- 🎁 **Bundles promocionales**: Paquetes con descuento

**Características:**
- Precio fijo para la colección (puede ser menor que la suma de productos individuales)
- Múltiples productos con cantidades específicas
- Precios override por producto (opcional)
- Validez por fechas (para menús temporales)
- Orden de visualización personalizado

**Ejemplo de uso:**
```sql
-- Crear combo
INSERT INTO collections (business_id, name, type, price, original_price)
VALUES (
    'uuid-del-negocio',
    'Combo Familiar',
    'combo',
    250.00,  -- Precio del combo
    320.00   -- Precio si se compraran los productos por separado
);

-- Agregar productos al combo
INSERT INTO collection_products (collection_id, product_id, quantity)
VALUES 
    ('uuid-del-combo', 'uuid-hamburguesa', 2),
    ('uuid-del-combo', 'uuid-papas', 2),
    ('uuid-del-combo', 'uuid-bebida', 2);
```

## 🔍 Consultas Útiles

### Usuarios Activos por Rol
```sql
SELECT role, COUNT(*) as total
FROM core.users
WHERE is_active = TRUE
GROUP BY role;
```

### Pedidos por Estado
```sql
SELECT status, COUNT(*) as total
FROM orders.orders
GROUP BY status
ORDER BY total DESC;
```

### Top Locales por Calificación
```sql
SELECT name, rating_average, total_reviews
FROM core.businesses
WHERE is_active = TRUE
ORDER BY rating_average DESC
LIMIT 10;
```

### Productos por Categoría
```sql
SELECT pc.name as categoria, COUNT(p.id) as total_productos
FROM catalog.product_categories pc
LEFT JOIN catalog.products p ON p.category_id = pc.id
WHERE pc.business_id = 'uuid-del-negocio'
GROUP BY pc.id, pc.name
ORDER BY total_productos DESC;
```

### Colecciones Disponibles de un Negocio
```sql
SELECT c.name, c.type, c.price, c.original_price,
       COUNT(cp.product_id) as productos_incluidos
FROM catalog.collections c
LEFT JOIN catalog.collection_products cp ON cp.collection_id = c.id
WHERE c.business_id = 'uuid-del-negocio'
  AND c.is_available = TRUE
  AND (c.valid_until IS NULL OR c.valid_until >= CURRENT_DATE)
GROUP BY c.id, c.name, c.type, c.price, c.original_price
ORDER BY c.display_order;
```

### Productos de una Colección
```sql
SELECT p.name, p.price, cp.quantity, cp.price_override
FROM catalog.collections c
JOIN catalog.collection_products cp ON cp.collection_id = c.id
JOIN catalog.products p ON p.id = cp.product_id
WHERE c.id = 'uuid-de-la-coleccion'
ORDER BY cp.display_order;
```

### Repartidores Disponibles en Radio
```sql
SELECT r.id, u.first_name, u.last_name, r.current_location
FROM core.repartidores r
JOIN core.users u ON r.user_id = u.id
WHERE r.is_available = TRUE
  AND ST_DWithin(
    r.current_location::geography,
    ST_MakePoint(-99.1332, 19.4326)::geography, -- Coordenadas ejemplo
    3000 -- 3 km en metros
  );
```

### Publicaciones Ecológicas Más Populares
```sql
SELECT sp.id, u.first_name, sp.co2_saved_kg, sp.likes_count
FROM social.social_posts sp
JOIN core.users u ON sp.user_id = u.id
WHERE sp.is_visible = TRUE
ORDER BY sp.likes_count DESC
LIMIT 10;
```

### Verificar Schemas Creados
```sql
-- Listar todos los schemas
SELECT schema_name 
FROM information_schema.schemata 
WHERE schema_name NOT IN ('pg_catalog', 'information_schema', 'pg_toast');

-- Ver tablas por schema
SELECT table_schema, table_name
FROM information_schema.tables
WHERE table_schema IN ('core', 'catalog', 'orders', 'reviews', 'communication', 'commerce', 'social')
ORDER BY table_schema, table_name;
```

## 🔐 Seguridad

- **Passwords:** Almacenados como hash (no en texto plano)
- **Tokens:** Tokens de verificación y reset con expiración
- **Soft Delete:** Campos `is_active`, `is_blocked` para desactivación sin eliminar
- **Constraints:** Validaciones a nivel de base de datos

## 📈 Optimizaciones

### Índices Estratégicos
- Índices en foreign keys para joins rápidos
- Índices en campos de búsqueda frecuente (email, phone, status)
- Índices GIST para consultas geográficas
- Índices GIN para arrays (tags, badges)

### Triggers Automáticos
- Actualización automática de `updated_at`
- Actualización de ratings promedio de negocios y repartidores
- Actualización de contadores de likes/comentarios en posts sociales

## 🔄 Migraciones Futuras

Para futuras modificaciones del schema, se recomienda:

1. Crear scripts de migración numerados: `migrations/001_add_column.sql`
2. Usar herramientas como `node-pg-migrate` o `knex.js`
3. Mantener versionado del schema
4. Documentar cambios en CHANGELOG.md

## 📝 Notas

- Todos los IDs son UUIDs para mejor distribución y seguridad
- Los timestamps usan `TIMESTAMP` (con timezone implícito)
- Los montos monetarios usan `DECIMAL(10,2)` para precisión
- Las coordenadas geográficas usan PostGIS `POINT` type
- Los arrays (tags, badges) usan tipos nativos de PostgreSQL

## 📝 Scripts de Seed Data

### seed_catalog.sql

Incluye categorías globales de ejemplo que pueden ser usadas por cualquier negocio:
- Entradas
- Platos Principales
- Bebidas (con subcategorías: Frías y Calientes)
- Postres
- Especialidades

**Uso:**
```sql
\i database/seed_catalog.sql
```

### seed_delivery_cycle.sql

Script completo que crea un ciclo de delivery de extremo a extremo:

**Incluye:**
- ✅ 3 usuarios: Cliente, Repartidor, Dueño de Local
- ✅ Direcciones con geolocalización (La Roma, CDMX)
- ✅ Negocio completo: "Restaurante La Roma"
- ✅ 4 categorías de productos específicas del negocio
- ✅ 7 productos: Tacos, Hamburguesas, Bebidas, Postres
- ✅ 1 colección: "Combo Familiar" con productos incluidos
- ✅ Repartidor ecológico (bicicleta)
- ✅ Pedido completo con estado "delivered"
- ✅ Items del pedido (combo + producto individual)
- ✅ Entrega completada (22 minutos, 0.8 km)
- ✅ Evaluación: 5 estrellas a negocio y repartidor
- ✅ Propina: $50 MXN

**Datos de ejemplo:**
- Cliente: `cliente@example.com`
- Repartidor: `repartidor@example.com`
- Local: `local@example.com`
- Pedido ID: `order0001-0000-0000-0000-000000000001`

**Uso:**
```sql
\i database/seed_delivery_cycle.sql
```

**Verificar datos insertados:**
El script incluye una consulta al final que muestra un resumen de todos los datos insertados.

## 🔗 Referencias

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [PostGIS Documentation](https://postgis.net/documentation/)
- [UUID Extension](https://www.postgresql.org/docs/current/uuid-ossp.html)

---

**Última actualización:** Noviembre 2024  
**Versión del Schema:** 1.1

