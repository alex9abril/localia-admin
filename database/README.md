# 📊 Base de Datos LOCALIA

Este directorio contiene el esquema de base de datos para la plataforma LOCALIA.

## 📁 Archivos

- **`schema.sql`**: Script SQL completo con todas las tablas, índices, triggers y funciones del sistema.

## 🗄️ Estructura de la Base de Datos

### Tecnología
- **SGBD:** PostgreSQL 12+
- **Extensiones:** `uuid-ossp` (UUIDs), `postgis` (geolocalización)

### Características Principales

✅ **Normalización:** Base de datos completamente normalizada (3NF)  
✅ **Integridad Referencial:** Constraints y foreign keys en todas las relaciones  
✅ **Índices Optimizados:** Índices estratégicos para consultas frecuentes  
✅ **Geolocalización:** Soporte para consultas espaciales con PostGIS  
✅ **Triggers Automáticos:** Actualización de timestamps y métricas  
✅ **Escalabilidad:** Diseño preparado para crecimiento  

## 📋 Tablas Principales

### Usuarios y Autenticación
- `users` - Usuarios del sistema (clientes, repartidores, locales, admins)
- `addresses` - Direcciones de usuarios con geolocalización

### Negocios y Productos
- `businesses` - Locales/negocios registrados
- `products` - Productos del menú de cada local

### Pedidos y Entregas
- `orders` - Pedidos realizados por clientes
- `order_items` - Items individuales dentro de un pedido
- `deliveries` - Entregas asignadas a repartidores
- `repartidores` - Información específica de repartidores

### Evaluaciones y Propinas
- `reviews` - Evaluaciones y reseñas
- `tips` - Propinas dadas a repartidores

### Comunicación
- `notifications` - Notificaciones push del sistema
- `messages` - Mensajes de chat entre usuarios

### Monetización
- `promotions` - Promociones y ofertas
- `promotion_uses` - Historial de uso de promociones
- `subscriptions` - Suscripciones premium
- `ads` - Publicidad interna de locales

### Red Social Ecológica
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

### Crear la Base de Datos

```bash
# Conectar a PostgreSQL
psql -U postgres

# Crear base de datos
CREATE DATABASE localia_db;

# Conectar a la base de datos
\c localia_db

# Ejecutar el schema
\i database/schema.sql
```

### Verificar Instalación

```sql
-- Ver todas las tablas
\dt

-- Ver estructura de una tabla
\d users

-- Ver índices
\di

-- Ver triggers
\dy
```

## 📊 Diagrama de Relaciones

### Entidades Principales

```
users (1) ──┬── (N) addresses
            ├── (1) repartidores
            ├── (N) orders (como client_id)
            └── (N) social_posts

businesses (1) ──┬── (N) products
                 ├── (N) orders
                 ├── (N) promotions
                 └── (N) ads

orders (1) ──┬── (N) order_items
             ├── (1) deliveries
             ├── (1) reviews
             └── (1) tips

repartidores (1) ──┬── (N) deliveries
                   └── (N) tips

social_posts (1) ──┬── (N) social_likes
                   └── (N) social_comments
```

## 🔍 Consultas Útiles

### Usuarios Activos por Rol
```sql
SELECT role, COUNT(*) as total
FROM users
WHERE is_active = TRUE
GROUP BY role;
```

### Pedidos por Estado
```sql
SELECT status, COUNT(*) as total
FROM orders
GROUP BY status
ORDER BY total DESC;
```

### Top Locales por Calificación
```sql
SELECT name, rating_average, total_reviews
FROM businesses
WHERE is_active = TRUE
ORDER BY rating_average DESC
LIMIT 10;
```

### Repartidores Disponibles en Radio
```sql
SELECT r.id, u.first_name, u.last_name, r.current_location
FROM repartidores r
JOIN users u ON r.user_id = u.id
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
FROM social_posts sp
JOIN users u ON sp.user_id = u.id
WHERE sp.is_visible = TRUE
ORDER BY sp.likes_count DESC
LIMIT 10;
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

## 🔗 Referencias

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [PostGIS Documentation](https://postgis.net/documentation/)
- [UUID Extension](https://www.postgresql.org/docs/current/uuid-ossp.html)

---

**Última actualización:** Noviembre 2024  
**Versión del Schema:** 1.0

