# 🛍️ Sistema de Catálogos de Productos Avanzado

Este documento presenta una investigación sobre cómo las principales plataformas de delivery manejan los catálogos de productos, complementos, modificadores, paquetes y sugerencias, junto con una propuesta de implementación para Localia.

---

## 📊 Resumen Ejecutivo

Las plataformas de delivery modernas (Uber Eats, Rappi, DoorDash, etc.) han desarrollado sistemas sofisticados para manejar:

1. **Identificación de tipo de producto** (alimento vs. no alimento)
2. **Modificadores y complementos** (obligatorios y opcionales con costos extras)
3. **Paquetes y combinaciones** (combos con productos de diferentes cantidades)
4. **Cross-selling y sugerencias** (recomendaciones inteligentes basadas en selección)
5. **Productos especiales** (farmacia, productos perecederos, etc.)

Este documento analiza estas prácticas y propone una implementación para Localia que sea flexible, escalable y compatible con el sistema existente.

---

## 🔍 Investigación: Prácticas de la Industria

### 1. Identificación de Tipo de Producto

#### Uber Eats / DoorDash / Rappi

**Práctica:**
- Los productos tienen un campo `product_type` o `item_type` que identifica:
  - `food` - Alimento
  - `beverage` - Bebida
  - `medicine` - Medicamento (farmacia)
  - `grocery` - Abarrotes
  - `non_food` - No alimenticio

**Razón:**
- **Regulaciones:** Los medicamentos requieren validación especial
- **Almacenamiento:** Alimentos vs. no alimentos tienen diferentes requisitos de temperatura
- **Sugerencias:** El sistema puede sugerir productos complementarios (comida → bebidas)
- **Filtros:** Los usuarios pueden filtrar por tipo de producto

**Ejemplo:**
```json
{
  "id": "prod-123",
  "name": "Hamburguesa Clásica",
  "product_type": "food",
  "category": "Hamburguesas",
  "requires_temperature_control": true,
  "is_perishable": true
}
```

### 2. Modificadores y Complementos

#### Estructura Típica

**Uber Eats / DoorDash:**
- **Modifiers Groups** (Grupos de modificadores)
  - Cada grupo tiene un nombre (ej: "Tamaño", "Extras", "Salsas")
  - Puede ser **obligatorio** o **opcional**
  - Puede tener **selección única** o **múltiple**
  - Cada opción tiene un **precio adicional** (puede ser 0)

**Ejemplo Estructura:**
```json
{
  "product_id": "prod-123",
  "modifier_groups": [
    {
      "id": "mg-1",
      "name": "Tamaño",
      "required": true,
      "selection_type": "single", // single o multiple
      "options": [
        {
          "id": "opt-1",
          "name": "Pequeño",
          "price_adjustment": 0.00
        },
        {
          "id": "opt-2",
          "name": "Mediano",
          "price_adjustment": 5.00
        },
        {
          "id": "opt-3",
          "name": "Grande",
          "price_adjustment": 10.00
        }
      ]
    },
    {
      "id": "mg-2",
      "name": "Extras",
      "required": false,
      "selection_type": "multiple",
      "max_selections": 5,
      "options": [
        {
          "id": "opt-4",
          "name": "Queso Extra",
          "price_adjustment": 15.00
        },
        {
          "id": "opt-5",
          "name": "Tocino",
          "price_adjustment": 20.00
        },
        {
          "id": "opt-6",
          "name": "Aguacate",
          "price_adjustment": 10.00
        }
      ]
    }
  ]
}
```

**Rappi:**
- Similar estructura pero con campos adicionales:
  - `min_selections` - Mínimo de opciones a seleccionar
  - `max_selections` - Máximo de opciones a seleccionar
  - `display_order` - Orden de visualización

### 3. Paquetes y Combinaciones

#### Problema Identificado

**Escenario Real:**
- **Producto Individual:** "Orden de Papas" → 200g de papas → $50
- **Combo:** "Hamburguesa con Papas" → 1 Hamburguesa + 100g de papas → $120

**Problema:**
- Si el combo se trata como "1 Hamburguesa + 1 Orden de Papas", el precio sería $150 (Hamburguesa $100 + Papas $50)
- Pero el combo tiene un precio especial de $120
- Y la cantidad de papas en el combo es menor (100g vs 200g)

#### Soluciones de la Industria

**Opción A: Producto Virtual (Uber Eats)**
- El combo es un **producto separado** con su propio ID
- Tiene una lista de **componentes** con cantidades específicas
- Cada componente puede tener un **precio override** (precio diferente al producto individual)
- El precio del combo es **independiente** de la suma de componentes

**Ejemplo:**
```json
{
  "id": "combo-1",
  "name": "Combo Hamburguesa con Papas",
  "type": "bundle",
  "price": 120.00,
  "original_price": 150.00, // Precio si compraras por separado
  "components": [
    {
      "product_id": "prod-hamburger",
      "quantity": 1,
      "price_override": 100.00, // Precio en el combo (puede ser diferente)
      "display_name": "Hamburguesa Clásica"
    },
    {
      "product_id": "prod-fries",
      "quantity": 0.5, // Media orden de papas
      "price_override": 20.00, // Precio en el combo
      "display_name": "Papas (porción combo)"
    }
  ]
}
```

**Opción B: Productos Agrupados (DoorDash)**
- Similar pero con **cantidades fraccionarias** más explícitas
- Permite definir **unidades personalizadas** (ej: "porción combo" vs "orden completa")

**Opción C: Variantes de Producto (Rappi)**
- El combo es una **variante** del producto base
- Usa el campo `variants` JSONB existente
- Menos flexible pero más simple

### 4. Cross-Selling y Sugerencias

#### Prácticas Comunes

**1. Sugerencias Basadas en Categoría:**
- Si agregas un producto de "Hamburguesas", sugerir "Bebidas Frías"
- Si agregas "Comida", sugerir "Postres"

**2. Sugerencias Basadas en Producto:**
- Si agregas "Hamburguesa", sugerir "Papas" y "Refresco"
- Si agregas "Pizza", sugerir "Bebida" y "Postre"

**3. Sugerencias Basadas en Reglas:**
- Si el pedido tiene comida salada, sugerir bebidas
- Si el pedido tiene comida caliente, sugerir bebidas frías
- Si el pedido tiene comida fría, sugerir bebidas calientes

**4. Sugerencias Basadas en Comportamiento:**
- "Otros clientes también compraron..."
- Basado en análisis de pedidos previos

**Implementación Típica:**
```json
{
  "product_id": "prod-123",
  "suggestions": {
    "category_based": [
      {
        "category_id": "cat-beverages-cold",
        "message": "¿Quieres agregar una bebida fría?",
        "priority": 1
      }
    ],
    "product_based": [
      {
        "product_id": "prod-fries",
        "message": "Papas fritas van perfecto con esto",
        "priority": 2
      }
    ],
    "rule_based": [
      {
        "rule": "if_food_then_suggest_beverage",
        "category_id": "cat-beverages",
        "message": "Completa tu pedido con una bebida"
      }
    ]
  }
}
```

### 5. Productos de Farmacia

#### Requisitos Especiales

**Regulaciones:**
- Algunos medicamentos requieren **receta médica**
- Algunos tienen **restricciones de edad**
- Algunos tienen **límites de cantidad por pedido**
- Algunos requieren **validación de farmacéutico**

**Estructura Típica:**
```json
{
  "id": "prod-med-1",
  "name": "Paracetamol 500mg",
  "product_type": "medicine",
  "category": "Analgésicos",
  "requires_prescription": false,
  "age_restriction": null,
  "max_quantity_per_order": 3,
  "requires_pharmacist_validation": false,
  "storage_requirements": {
    "temperature": "room",
    "humidity": "normal"
  }
}
```

---

## 📋 Análisis del Sistema Actual de Localia

### Estructura Existente

#### 1. Tabla `catalog.products`

**Campos Actuales:**
- `id`, `business_id`, `name`, `description`, `image_url`
- `price`, `category_id`
- `is_available`, `is_featured`
- `variants` (JSONB) - **Ya existe pero no está estructurado**
- `nutritional_info` (JSONB)
- `allergens` (TEXT[])

**Lo que falta:**
- ❌ Campo para identificar tipo de producto (alimento vs. no alimento)
- ❌ Estructura formal para modificadores/complementos
- ❌ Campo para productos de farmacia

#### 2. Tabla `catalog.collections`

**Campos Actuales:**
- `id`, `business_id`, `name`, `description`, `image_url`
- `type` (ENUM: combo, menu_del_dia, paquete, promocion_bundle)
- `price`, `original_price`
- `is_available`, `is_featured`
- `valid_from`, `valid_until`

**Lo que funciona bien:**
- ✅ Soporta diferentes tipos de colecciones
- ✅ Precio independiente con `original_price` para mostrar descuento
- ✅ Fechas de validez

**Lo que falta:**
- ❌ No hay forma explícita de manejar cantidades fraccionarias en componentes
- ❌ El campo `price_override` en `collection_products` existe pero no se usa para el problema de "papas del combo vs papas individuales"

#### 3. Tabla `catalog.collection_products`

**Campos Actuales:**
- `collection_id`, `product_id`
- `quantity` (INTEGER) - **Solo enteros, no fracciones**
- `price_override` (DECIMAL) - **Existe pero no está bien documentado**
- `display_order`

**Problema identificado:**
- `quantity` es INTEGER, no permite fracciones (0.5 para media orden)
- No hay campo para "unidad personalizada" (ej: "porción combo" vs "orden completa")

#### 4. Tabla `orders.order_items`

**Campos Actuales:**
- `product_id` o `collection_id`
- `item_name`, `item_price`, `quantity`
- `variant_selection` (JSONB) - **Para variantes pero no para modificadores**
- `item_subtotal`, `special_instructions`

**Lo que falta:**
- ❌ No hay campo para almacenar selección de modificadores/complementos
- ❌ No hay forma de rastrear precios adicionales de modificadores

---

## 🎯 Propuesta de Implementación

### Fase 1: Identificación de Tipo de Producto

#### 1.1 Agregar Campo `product_type` a `catalog.products`

```sql
-- Agregar ENUM para tipos de producto
CREATE TYPE catalog.product_type AS ENUM (
    'food',           -- Alimento
    'beverage',       -- Bebida
    'medicine',       -- Medicamento (farmacia)
    'grocery',        -- Abarrotes
    'non_food'        -- No alimenticio
);

-- Agregar columna a la tabla
ALTER TABLE catalog.products
ADD COLUMN product_type catalog.product_type DEFAULT 'food';

-- Agregar índice
CREATE INDEX idx_products_product_type ON catalog.products(product_type);

-- Agregar comentario
COMMENT ON COLUMN catalog.products.product_type IS 'Tipo de producto para filtros, sugerencias y regulaciones';
```

#### 1.2 Agregar Campos para Farmacia (Opcional)

```sql
-- Agregar campos para productos de farmacia
ALTER TABLE catalog.products
ADD COLUMN requires_prescription BOOLEAN DEFAULT FALSE,
ADD COLUMN age_restriction INTEGER, -- Edad mínima requerida (NULL = sin restricción)
ADD COLUMN max_quantity_per_order INTEGER, -- Límite de cantidad por pedido (NULL = sin límite)
ADD COLUMN requires_pharmacist_validation BOOLEAN DEFAULT FALSE;

-- Agregar comentarios
COMMENT ON COLUMN catalog.products.requires_prescription IS 'Requiere receta médica';
COMMENT ON COLUMN catalog.products.age_restriction IS 'Edad mínima requerida para comprar';
COMMENT ON COLUMN catalog.products.max_quantity_per_order IS 'Cantidad máxima permitida por pedido';
COMMENT ON COLUMN catalog.products.requires_pharmacist_validation IS 'Requiere validación de farmacéutico antes de procesar';
```

### Fase 2: Sistema de Modificadores y Complementos

#### 2.1 Crear Tablas para Modificadores

```sql
-- Tabla de grupos de modificadores
CREATE TABLE catalog.modifier_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES catalog.products(id) ON DELETE CASCADE,
    
    -- Información del grupo
    name VARCHAR(100) NOT NULL, -- Ej: "Tamaño", "Extras", "Salsas"
    description TEXT,
    
    -- Configuración
    is_required BOOLEAN DEFAULT FALSE, -- ¿Es obligatorio seleccionar?
    selection_type VARCHAR(20) NOT NULL DEFAULT 'single' CHECK (selection_type IN ('single', 'multiple')),
    min_selections INTEGER DEFAULT 0 CHECK (min_selections >= 0),
    max_selections INTEGER, -- NULL = sin límite
    
    -- Orden de visualización
    display_order INTEGER DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraint: nombre único por producto
    UNIQUE(product_id, name)
);

CREATE INDEX idx_modifier_groups_product_id ON catalog.modifier_groups(product_id);
CREATE INDEX idx_modifier_groups_display_order ON catalog.modifier_groups(product_id, display_order);

-- Tabla de opciones de modificadores
CREATE TABLE catalog.modifier_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    modifier_group_id UUID NOT NULL REFERENCES catalog.modifier_groups(id) ON DELETE CASCADE,
    
    -- Información de la opción
    name VARCHAR(100) NOT NULL, -- Ej: "Queso Extra", "Tocino", "Mediano"
    description TEXT,
    
    -- Precio adicional (puede ser negativo para descuentos)
    price_adjustment DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    
    -- Disponibilidad
    is_available BOOLEAN DEFAULT TRUE,
    
    -- Orden de visualización
    display_order INTEGER DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraint: nombre único por grupo
    UNIQUE(modifier_group_id, name)
);

CREATE INDEX idx_modifier_options_group_id ON catalog.modifier_options(modifier_group_id);
CREATE INDEX idx_modifier_options_display_order ON catalog.modifier_options(modifier_group_id, display_order);
CREATE INDEX idx_modifier_options_is_available ON catalog.modifier_options(is_available) WHERE is_available = TRUE;
```

#### 2.2 Actualizar `orders.order_items` para Modificadores

```sql
-- Agregar campo para almacenar selección de modificadores
ALTER TABLE orders.order_items
ADD COLUMN modifier_selections JSONB;

-- Agregar campo para precio adicional de modificadores
ALTER TABLE orders.order_items
ADD COLUMN modifier_price_adjustment DECIMAL(10,2) DEFAULT 0.00;

-- Comentarios
COMMENT ON COLUMN orders.order_items.modifier_selections IS 'JSON con selección de modificadores: {"group_id": ["option_id1", "option_id2"]}';
COMMENT ON COLUMN orders.order_items.modifier_price_adjustment IS 'Suma total de ajustes de precio de modificadores seleccionados';
```

**Estructura JSON esperada para `modifier_selections`:**
```json
{
  "mg-123": ["opt-456", "opt-789"],  // Grupo "Extras" con múltiples opciones
  "mg-124": ["opt-101"]              // Grupo "Tamaño" con una opción
}
```

### Fase 3: Mejora de Paquetes y Combinaciones

#### 3.1 Mejorar `catalog.collection_products` para Cantidades Fraccionarias

```sql
-- Cambiar quantity de INTEGER a DECIMAL para permitir fracciones
ALTER TABLE catalog.collection_products
ALTER COLUMN quantity TYPE DECIMAL(10,2);

-- Agregar campo para unidad personalizada
ALTER TABLE catalog.collection_products
ADD COLUMN unit_label VARCHAR(50); -- Ej: "porción combo", "orden completa", "media orden"

-- Agregar comentarios
COMMENT ON COLUMN catalog.collection_products.quantity IS 'Cantidad del producto en la colección (puede ser fraccionaria, ej: 0.5 para media orden)';
COMMENT ON COLUMN catalog.collection_products.unit_label IS 'Etiqueta de unidad personalizada para mostrar al cliente (ej: "porción combo")';
COMMENT ON COLUMN catalog.collection_products.price_override IS 'Precio específico de este producto en esta colección (si difiere del precio normal)';
```

**Ejemplo de uso:**
```sql
-- Combo Hamburguesa con Papas
INSERT INTO catalog.collection_products (
    collection_id, 
    product_id, 
    quantity, 
    unit_label, 
    price_override
) VALUES (
    'combo-1-id',
    'hamburger-id',
    1.0,
    '1 unidad',
    100.00
), (
    'combo-1-id',
    'fries-id',
    0.5,  -- Media orden de papas
    'porción combo',  -- Etiqueta personalizada
    20.00  -- Precio en el combo (menor que orden completa)
);
```

#### 3.2 Agregar Campo para Mostrar Componentes al Cliente

```sql
-- Agregar campo para mostrar detalles de componentes
ALTER TABLE catalog.collections
ADD COLUMN show_components BOOLEAN DEFAULT TRUE; -- ¿Mostrar lista de componentes al cliente?

COMMENT ON COLUMN catalog.collections.show_components IS 'Si es true, mostrar lista de componentes al cliente (ej: "Incluye: 1 Hamburguesa, Papas (porción combo)")';
```

### Fase 4: Sistema de Sugerencias y Cross-Selling

#### 4.1 Crear Tabla de Reglas de Sugerencia

```sql
-- Tabla de reglas de sugerencia
CREATE TABLE catalog.suggestion_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES core.businesses(id) ON DELETE CASCADE, -- NULL = regla global
    
    -- Tipo de regla
    rule_type VARCHAR(50) NOT NULL CHECK (rule_type IN (
        'category_based',      -- Basada en categoría
        'product_based',       -- Basada en producto específico
        'rule_based',          -- Basada en regla lógica
        'behavior_based'       -- Basada en comportamiento (otros clientes compraron)
    )),
    
    -- Condición (trigger)
    trigger_category_id UUID REFERENCES catalog.product_categories(id) ON DELETE CASCADE,
    trigger_product_id UUID REFERENCES catalog.products(id) ON DELETE CASCADE,
    trigger_product_type catalog.product_type, -- Ej: si es 'food', sugerir 'beverage'
    
    -- Sugerencia
    suggested_category_id UUID REFERENCES catalog.product_categories(id) ON DELETE CASCADE,
    suggested_product_id UUID REFERENCES catalog.products(id) ON DELETE CASCADE,
    
    -- Mensaje
    message TEXT NOT NULL, -- Ej: "¿Quieres agregar una bebida fría?"
    
    -- Prioridad (mayor = más importante)
    priority INTEGER DEFAULT 1,
    
    -- Estado
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraint: debe tener al menos un trigger y una sugerencia
    CONSTRAINT suggestion_rules_trigger_check CHECK (
        (trigger_category_id IS NOT NULL) OR
        (trigger_product_id IS NOT NULL) OR
        (trigger_product_type IS NOT NULL)
    ),
    CONSTRAINT suggestion_rules_suggestion_check CHECK (
        (suggested_category_id IS NOT NULL) OR
        (suggested_product_id IS NOT NULL)
    )
);

CREATE INDEX idx_suggestion_rules_business_id ON catalog.suggestion_rules(business_id);
CREATE INDEX idx_suggestion_rules_trigger_category ON catalog.suggestion_rules(trigger_category_id);
CREATE INDEX idx_suggestion_rules_trigger_product ON catalog.suggestion_rules(trigger_product_id);
CREATE INDEX idx_suggestion_rules_trigger_type ON catalog.suggestion_rules(trigger_product_type);
CREATE INDEX idx_suggestion_rules_is_active ON catalog.suggestion_rules(is_active) WHERE is_active = TRUE;
```

#### 4.2 Ejemplos de Reglas de Sugerencia

```sql
-- Regla 1: Si agregas comida, sugerir bebidas frías
INSERT INTO catalog.suggestion_rules (
    rule_type,
    trigger_product_type,
    suggested_category_id,
    message,
    priority
) VALUES (
    'rule_based',
    'food',
    (SELECT id FROM catalog.product_categories WHERE name = 'Bebidas Frías' AND business_id IS NULL),
    '¿Quieres agregar una bebida fría?',
    1
);

-- Regla 2: Si agregas hamburguesa, sugerir papas
INSERT INTO catalog.suggestion_rules (
    business_id,
    rule_type,
    trigger_product_id,
    suggested_product_id,
    message,
    priority
) VALUES (
    'business-uuid',
    'product_based',
    (SELECT id FROM catalog.products WHERE name = 'Hamburguesa Clásica' AND business_id = 'business-uuid'),
    (SELECT id FROM catalog.products WHERE name = 'Papas Fritas' AND business_id = 'business-uuid'),
    'Papas fritas van perfecto con esto',
    2
);

-- Regla 3: Si agregas producto de categoría "Hamburguesas", sugerir categoría "Bebidas"
INSERT INTO catalog.suggestion_rules (
    business_id,
    rule_type,
    trigger_category_id,
    suggested_category_id,
    message,
    priority
) VALUES (
    'business-uuid',
    'category_based',
    (SELECT id FROM catalog.product_categories WHERE name = 'Hamburguesas' AND business_id = 'business-uuid'),
    (SELECT id FROM catalog.product_categories WHERE name = 'Bebidas' AND business_id IS NULL),
    'Completa tu pedido con una bebida',
    1
);
```

---

## 🔄 Flujo de Implementación Recomendado

### Prioridad Alta (MVP)

1. **Fase 1: Identificación de Tipo de Producto**
   - Agregar `product_type` a `catalog.products`
   - Actualizar formularios de creación/edición
   - Agregar filtros en frontend

2. **Fase 2: Modificadores Básicos**
   - Crear tablas `modifier_groups` y `modifier_options`
   - Implementar CRUD en backend
   - Crear UI para gestionar modificadores
   - Actualizar `order_items` para almacenar selecciones

### Prioridad Media

3. **Fase 3: Mejora de Paquetes**
   - Actualizar `collection_products` para cantidades fraccionarias
   - Actualizar UI para mostrar componentes correctamente
   - Documentar uso de `price_override`

4. **Fase 4: Sugerencias Básicas**
   - Crear tabla `suggestion_rules`
   - Implementar reglas simples (categoría → categoría)
   - Mostrar sugerencias en frontend

### Prioridad Baja (Futuro)

5. **Fase 5: Productos de Farmacia**
   - Agregar campos de farmacia a `catalog.products`
   - Implementar validaciones en backend
   - Crear UI para gestión de restricciones

6. **Fase 6: Sugerencias Avanzadas**
   - Implementar sugerencias basadas en comportamiento
   - Análisis de pedidos previos
   - Machine learning para recomendaciones

---

## 📝 Ejemplos de Uso

### Ejemplo 1: Producto con Modificadores

**Producto:** Hamburguesa Clásica

**Modificadores:**
1. **Grupo "Tamaño"** (obligatorio, selección única)
   - Pequeño (+$0)
   - Mediano (+$5)
   - Grande (+$10)

2. **Grupo "Extras"** (opcional, selección múltiple, máximo 3)
   - Queso Extra (+$15)
   - Tocino (+$20)
   - Aguacate (+$10)
   - Cebolla Caramelizada (+$8)

**Código SQL:**
```sql
-- Crear grupos de modificadores
INSERT INTO catalog.modifier_groups (product_id, name, is_required, selection_type, max_selections)
VALUES 
    ('hamburger-id', 'Tamaño', TRUE, 'single', 1),
    ('hamburger-id', 'Extras', FALSE, 'multiple', 3);

-- Crear opciones
INSERT INTO catalog.modifier_options (modifier_group_id, name, price_adjustment, display_order)
VALUES 
    -- Tamaño
    ((SELECT id FROM catalog.modifier_groups WHERE name = 'Tamaño' AND product_id = 'hamburger-id'), 'Pequeño', 0.00, 1),
    ((SELECT id FROM catalog.modifier_groups WHERE name = 'Tamaño' AND product_id = 'hamburger-id'), 'Mediano', 5.00, 2),
    ((SELECT id FROM catalog.modifier_groups WHERE name = 'Tamaño' AND product_id = 'hamburger-id'), 'Grande', 10.00, 3),
    -- Extras
    ((SELECT id FROM catalog.modifier_groups WHERE name = 'Extras' AND product_id = 'hamburger-id'), 'Queso Extra', 15.00, 1),
    ((SELECT id FROM catalog.modifier_groups WHERE name = 'Extras' AND product_id = 'hamburger-id'), 'Tocino', 20.00, 2),
    ((SELECT id FROM catalog.modifier_groups WHERE name = 'Extras' AND product_id = 'hamburger-id'), 'Aguacate', 10.00, 3),
    ((SELECT id FROM catalog.modifier_groups WHERE name = 'Extras' AND product_id = 'hamburger-id'), 'Cebolla Caramelizada', 8.00, 4);
```

### Ejemplo 2: Combo con Cantidades Fraccionarias

**Combo:** Hamburguesa con Papas

**Componentes:**
- 1 Hamburguesa Clásica (precio en combo: $100)
- 0.5 Orden de Papas (precio en combo: $20, etiqueta: "porción combo")

**Código SQL:**
```sql
-- Crear combo
INSERT INTO catalog.collections (business_id, name, type, price, original_price, show_components)
VALUES (
    'business-id',
    'Combo Hamburguesa con Papas',
    'combo',
    120.00,  -- Precio del combo
    150.00,  -- Precio si compraras por separado (Hamburguesa $100 + Papas $50)
    TRUE     -- Mostrar componentes
);

-- Agregar componentes
INSERT INTO catalog.collection_products (collection_id, product_id, quantity, unit_label, price_override, display_order)
VALUES 
    (
        (SELECT id FROM catalog.collections WHERE name = 'Combo Hamburguesa con Papas'),
        (SELECT id FROM catalog.products WHERE name = 'Hamburguesa Clásica'),
        1.0,
        '1 unidad',
        100.00,
        1
    ),
    (
        (SELECT id FROM catalog.collections WHERE name = 'Combo Hamburguesa con Papas'),
        (SELECT id FROM catalog.products WHERE name = 'Papas Fritas'),
        0.5,  -- Media orden
        'porción combo',
        20.00,  -- Precio menor que orden completa ($50)
        2
    );
```

### Ejemplo 3: Sugerencias Automáticas

**Regla:** Si agregas comida, sugerir bebidas frías

**Código SQL:**
```sql
INSERT INTO catalog.suggestion_rules (
    rule_type,
    trigger_product_type,
    suggested_category_id,
    message,
    priority,
    is_active
) VALUES (
    'rule_based',
    'food',
    (SELECT id FROM catalog.product_categories WHERE name = 'Bebidas Frías' AND business_id IS NULL),
    '¿Quieres agregar una bebida fría?',
    1,
    TRUE
);
```

**Lógica en Backend:**
```typescript
// Cuando un usuario agrega un producto al carrito
async function getSuggestions(productId: string, businessId: string) {
  const product = await getProduct(productId);
  
  // Buscar reglas que apliquen
  const rules = await db.query(`
    SELECT * FROM catalog.suggestion_rules
    WHERE is_active = TRUE
    AND (
      trigger_product_id = $1 OR
      trigger_category_id = $2 OR
      trigger_product_type = $3
    )
    ORDER BY priority DESC
  `, [productId, product.category_id, product.product_type]);
  
  // Procesar sugerencias
  const suggestions = [];
  for (const rule of rules) {
    if (rule.suggested_product_id) {
      const suggestedProduct = await getProduct(rule.suggested_product_id);
      suggestions.push({
        type: 'product',
        product: suggestedProduct,
        message: rule.message,
        priority: rule.priority
      });
    } else if (rule.suggested_category_id) {
      const categoryProducts = await getProductsByCategory(rule.suggested_category_id);
      suggestions.push({
        type: 'category',
        category_id: rule.suggested_category_id,
        products: categoryProducts,
        message: rule.message,
        priority: rule.priority
      });
    }
  }
  
  return suggestions;
}
```

---

## 🔧 Cambios en Backend (NestJS)

### DTOs Nuevos

```typescript
// dto/create-modifier-group.dto.ts
export class CreateModifierGroupDto {
  @IsUUID()
  product_id: string;

  @IsString()
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsBoolean()
  @IsOptional()
  is_required?: boolean;

  @IsEnum(['single', 'multiple'])
  selection_type: 'single' | 'multiple';

  @IsInt()
  @Min(0)
  @IsOptional()
  min_selections?: number;

  @IsInt()
  @IsOptional()
  max_selections?: number;

  @IsInt()
  @IsOptional()
  display_order?: number;
}

// dto/create-modifier-option.dto.ts
export class CreateModifierOptionDto {
  @IsUUID()
  modifier_group_id: string;

  @IsString()
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  @Type(() => Number)
  price_adjustment: number;

  @IsBoolean()
  @IsOptional()
  is_available?: boolean;

  @IsInt()
  @IsOptional()
  display_order?: number;
}
```

### Servicios Nuevos

```typescript
// services/modifiers.service.ts
@Injectable()
export class ModifiersService {
  async getModifiersForProduct(productId: string) {
    // Obtener grupos de modificadores con sus opciones
  }

  async createModifierGroup(dto: CreateModifierGroupDto) {
    // Crear grupo de modificadores
  }

  async createModifierOption(dto: CreateModifierOptionDto) {
    // Crear opción de modificador
  }
}

// services/suggestions.service.ts
@Injectable()
export class SuggestionsService {
  async getSuggestionsForProduct(productId: string, businessId: string) {
    // Obtener sugerencias basadas en reglas
  }

  async getSuggestionsForCart(cartItems: CartItem[], businessId: string) {
    // Obtener sugerencias basadas en el carrito completo
  }
}
```

---

## 🎨 Cambios en Frontend

### Componentes Nuevos

1. **`ProductModifiersSelector.tsx`**
   - Componente para seleccionar modificadores
   - Muestra grupos y opciones
   - Calcula precio total con ajustes

2. **`ProductSuggestions.tsx`**
   - Componente para mostrar sugerencias
   - Basado en producto seleccionado o carrito
   - Permite agregar sugerencias con un click

3. **`ModifierGroupManager.tsx`**
   - UI para gestionar grupos de modificadores (admin)
   - Crear, editar, eliminar grupos y opciones

### Flujo de Usuario

1. **Agregar Producto al Carrito:**
   - Si tiene modificadores obligatorios, mostrar selector
   - Si tiene modificadores opcionales, mostrar opciones
   - Calcular precio total (producto + modificadores)
   - Mostrar sugerencias después de agregar

2. **Ver Carrito:**
   - Mostrar productos con modificadores seleccionados
   - Mostrar sugerencias basadas en carrito completo
   - Permitir editar modificadores

---

## 📊 Consideraciones de Rendimiento

### Índices Recomendados

```sql
-- Ya creados en las tablas, pero verificar:
CREATE INDEX idx_modifier_groups_product_id ON catalog.modifier_groups(product_id);
CREATE INDEX idx_modifier_options_group_id ON catalog.modifier_options(modifier_group_id);
CREATE INDEX idx_suggestion_rules_trigger_product ON catalog.suggestion_rules(trigger_product_id);
CREATE INDEX idx_suggestion_rules_trigger_category ON catalog.suggestion_rules(trigger_category_id);
CREATE INDEX idx_suggestion_rules_trigger_type ON catalog.suggestion_rules(trigger_product_type);
```

### Caching

- Cachear modificadores por producto (TTL: 1 hora)
- Cachear sugerencias por producto (TTL: 30 minutos)
- Invalidar cache cuando se actualicen modificadores o reglas

---

## 🧪 Testing

### Casos de Prueba

1. **Modificadores:**
   - Producto con modificadores obligatorios
   - Producto con modificadores opcionales
   - Modificadores con precios negativos (descuentos)
   - Múltiples selecciones en grupo "multiple"

2. **Paquetes:**
   - Combo con cantidades fraccionarias
   - Combo con price_override
   - Cálculo correcto de precio total

3. **Sugerencias:**
   - Sugerencias basadas en categoría
   - Sugerencias basadas en producto
   - Sugerencias basadas en tipo de producto
   - Prioridad de sugerencias

---

## 📚 Referencias

- **Schema Actual:** `database/schema.sql`
- **Análisis de Tipos de Negocios:** `docs/17-analisis-tipos-negocios-alimentos.md`
- **Gestión de Catálogos:** `docs/16-catalogos-gestion.md`
- **API de Productos:** `apps/backend/src/modules/catalog/products/`

---

## ✅ Checklist de Implementación

### Fase 1: Identificación de Tipo de Producto
- [ ] Crear ENUM `product_type`
- [ ] Agregar columna `product_type` a `catalog.products`
- [ ] Migrar datos existentes (todos como 'food' por defecto)
- [ ] Actualizar DTOs y servicios
- [ ] Actualizar formularios en frontend
- [ ] Agregar filtros por tipo de producto

### Fase 2: Modificadores
- [ ] Crear tablas `modifier_groups` y `modifier_options`
- [ ] Crear DTOs para modificadores
- [ ] Implementar servicios en backend
- [ ] Crear endpoints en controller
- [ ] Crear UI para gestionar modificadores (admin)
- [ ] Crear componente de selección de modificadores (cliente)
- [ ] Actualizar `order_items` para almacenar selecciones
- [ ] Actualizar cálculo de precios

### Fase 3: Paquetes Mejorados
- [ ] Actualizar `collection_products.quantity` a DECIMAL
- [ ] Agregar `unit_label` a `collection_products`
- [ ] Documentar uso de `price_override`
- [ ] Actualizar UI para mostrar componentes correctamente
- [ ] Actualizar cálculo de precios de combos

### Fase 4: Sugerencias
- [ ] Crear tabla `suggestion_rules`
- [ ] Implementar servicio de sugerencias
- [ ] Crear endpoint para obtener sugerencias
- [ ] Crear componente de sugerencias en frontend
- [ ] Implementar reglas básicas (categoría → categoría)
- [ ] Implementar reglas por tipo de producto

### Fase 5: Farmacia (Futuro)
- [ ] Agregar campos de farmacia a `catalog.products`
- [ ] Implementar validaciones en backend
- [ ] Crear UI para gestión de restricciones
- [ ] Implementar validación de recetas (si aplica)

---

**Anterior:** [Gestión de Zonas de Cobertura](./19-gestion-zonas-cobertura.md)  
**Siguiente:** [Próximo Documento]  
**Volver al inicio:** [README Principal](./README.md)

---

**Versión:** 1.0  
**Fecha:** 2024-12-XX  
**Autor:** Análisis basado en investigación de plataformas de delivery y estructura del sistema Localia

