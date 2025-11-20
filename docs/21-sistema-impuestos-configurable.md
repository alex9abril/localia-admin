# 💰 Sistema de Impuestos Configurable

Este documento describe la implementación de un sistema de impuestos configurable para Localia, que permite a los administradores definir diferentes tipos de impuestos y a los negocios asignarlos a sus productos, con desglose transparente para los clientes.

---

## 📊 Resumen Ejecutivo

El sistema de impuestos configurable permite:

1. **Configuración centralizada** desde web-admin de diferentes tipos de impuestos (IVA, impuestos locales, etc.)
2. **Asignación flexible** de impuestos a productos desde web-local
3. **Cálculo automático** de impuestos en el checkout
4. **Desglose transparente** de impuestos en web-cliente
5. **Cumplimiento fiscal** según regulaciones locales

---

## 🔍 Investigación: Prácticas de la Industria

### Análisis de Plataformas de Delivery

#### Uber Eats / Rappi / DoorDash

**Práctica observada:**
- Los impuestos se muestran desglosados en el resumen del pedido
- Los impuestos se calculan sobre el subtotal de productos
- Se muestran como "Impuestos incluidos" o "Impuestos adicionales"
- En algunos casos, el precio mostrado ya incluye impuestos, pero se desglosan en el checkout

**Ejemplo de desglose típico:**
```
Subtotal de productos:     $100.00
IVA (16%):                  $16.00
Costo de envío:             $15.00
Propina:                    $10.00
─────────────────────────────
Total:                      $141.00
```

#### Mejores Prácticas Identificadas

1. **Transparencia total**: Los clientes deben ver exactamente qué están pagando
2. **Desglose claro**: Cada impuesto debe mostrarse por separado con su nombre y porcentaje
3. **Cálculo preciso**: Los impuestos deben calcularse correctamente según las reglas fiscales
4. **Configurabilidad**: El sistema debe permitir diferentes tipos de impuestos según la jurisdicción

---

## 🏗️ Arquitectura del Sistema

### Componentes Principales

1. **Catálogo de Tipos de Impuestos** (`catalog.tax_types`)
   - Definido por administradores en web-admin
   - Tipos globales disponibles para todos los negocios
   - Configuración de porcentaje, nombre, descripción

2. **Asignación de Impuestos a Productos** (`catalog.product_taxes`)
   - Relación muchos-a-muchos entre productos e impuestos
   - Permite múltiples impuestos por producto
   - Los negocios seleccionan qué impuestos aplicar

3. **Cálculo en Checkout**
   - Cálculo automático basado en impuestos asignados
   - Almacenamiento del desglose en `order_items.tax_breakdown`

4. **Visualización en Frontend**
   - Desglose detallado en web-cliente
   - Resumen en web-local y web-admin

---

## 📐 Esquema de Base de Datos

### 1. Tabla: `catalog.tax_types`

Catálogo global de tipos de impuestos configurados por administradores.

```sql
CREATE TABLE catalog.tax_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Información del impuesto
    name VARCHAR(100) NOT NULL UNIQUE, -- "IVA", "Impuesto Local CDMX", etc.
    description TEXT,
    code VARCHAR(50), -- Código fiscal (ej: "IVA", "ISR", "IEPS")
    
    -- Configuración del impuesto
    rate DECIMAL(5,4) NOT NULL CHECK (rate >= 0 AND rate <= 1), -- 0.16 = 16%
    rate_type VARCHAR(20) NOT NULL DEFAULT 'percentage', -- 'percentage' o 'fixed'
    fixed_amount DECIMAL(10,2), -- Si rate_type = 'fixed'
    
    -- Aplicación
    applies_to_subtotal BOOLEAN DEFAULT TRUE, -- Se aplica al subtotal
    applies_to_delivery BOOLEAN DEFAULT FALSE, -- Se aplica al costo de envío
    applies_to_tip BOOLEAN DEFAULT FALSE, -- Se aplica a la propina
    
    -- Reglas de exención (opcional, para futuras expansiones)
    exemption_rules JSONB, -- Reglas complejas de exención
    
    -- Estado
    is_active BOOLEAN DEFAULT TRUE,
    is_default BOOLEAN DEFAULT FALSE, -- Impuesto por defecto para nuevos productos
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Índices:**
```sql
CREATE INDEX idx_tax_types_is_active ON catalog.tax_types(is_active);
CREATE INDEX idx_tax_types_code ON catalog.tax_types(code);
```

### 2. Tabla: `catalog.product_taxes`

Relación muchos-a-muchos entre productos e impuestos.

```sql
CREATE TABLE catalog.product_taxes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES catalog.products(id) ON DELETE CASCADE,
    tax_type_id UUID NOT NULL REFERENCES catalog.tax_types(id) ON DELETE CASCADE,
    
    -- Override opcional del porcentaje para este producto específico
    override_rate DECIMAL(5,4), -- Si NULL, usa el rate del tax_type
    override_fixed_amount DECIMAL(10,2), -- Si rate_type = 'fixed'
    
    -- Orden de aplicación (para cuando hay múltiples impuestos)
    display_order INTEGER DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraint: un producto no puede tener el mismo impuesto dos veces
    UNIQUE(product_id, tax_type_id)
);
```

**Índices:**
```sql
CREATE INDEX idx_product_taxes_product_id ON catalog.product_taxes(product_id);
CREATE INDEX idx_product_taxes_tax_type_id ON catalog.product_taxes(tax_type_id);
```

### 3. Modificación: `orders.order_items`

Agregar campo para almacenar el desglose de impuestos calculado.

```sql
ALTER TABLE orders.order_items
ADD COLUMN tax_breakdown JSONB; -- Desglose de impuestos aplicados

-- Ejemplo de estructura JSONB:
-- {
--   "taxes": [
--     {
--       "tax_type_id": "uuid",
--       "tax_name": "IVA",
--       "rate": 0.16,
--       "amount": 16.00,
--       "applied_to": "subtotal"
--     }
--   ],
--   "total_tax": 16.00
-- }
```

---

## 🔄 Flujo de Trabajo

### 1. Configuración en web-admin

**Paso 1:** Administrador crea tipos de impuestos
- Accede a "Catálogos" → "Impuestos"
- Crea nuevos tipos (ej: "IVA 16%", "Impuesto Local CDMX 2%")
- Configura porcentajes y reglas de aplicación

**Paso 2:** Administrador marca impuestos por defecto
- Puede marcar un impuesto como "por defecto"
- Los nuevos productos automáticamente tendrán este impuesto

### 2. Asignación en web-local

**Paso 1:** Negocio crea/edita producto
- En el formulario de producto, sección "Impuestos"
- Ve lista de impuestos disponibles (desde `catalog.tax_types`)
- Selecciona qué impuestos aplicar al producto
- Opcionalmente puede override el porcentaje para ese producto específico

**Paso 2:** Guardar producto
- Se crean registros en `catalog.product_taxes`
- El producto queda asociado con sus impuestos

### 3. Cálculo en Checkout

**Paso 1:** Cliente agrega productos al carrito
- Cada producto tiene sus impuestos asociados

**Paso 2:** Cliente procede al checkout
- Se calculan los impuestos para cada item:
  ```javascript
  // Para cada item en el carrito
  item.tax_breakdown = calculateTaxes(item.product_id, item.subtotal);
  ```

**Paso 3:** Se calcula el total
- Subtotal de productos
- Suma de todos los impuestos
- Costo de envío
- Propina
- Total final

**Paso 4:** Se guarda el pedido
- `order_items.tax_breakdown` contiene el desglose calculado
- `orders.tax_amount` contiene la suma total de impuestos

### 4. Visualización en web-cliente

**En el carrito:**
```
Hamburguesa Clásica          $100.00
  IVA (16%)                  $16.00
─────────────────────────────
Subtotal                     $116.00
```

**En el checkout:**
```
Resumen del pedido
─────────────────────────────
Subtotal de productos        $100.00
IVA (16%)                     $16.00
Costo de envío                $15.00
Propina                       $10.00
─────────────────────────────
Total                         $141.00
```

---

## 💻 Implementación Técnica

### Backend: Cálculo de Impuestos

```typescript
// Función para calcular impuestos de un producto
async function calculateProductTaxes(
  productId: string,
  subtotal: number
): Promise<TaxBreakdown> {
  // 1. Obtener impuestos asignados al producto
  const productTaxes = await db.query(`
    SELECT 
      pt.*,
      tt.name,
      tt.rate,
      tt.rate_type,
      tt.fixed_amount,
      tt.applies_to_subtotal,
      tt.applies_to_delivery,
      tt.applies_to_tip
    FROM catalog.product_taxes pt
    INNER JOIN catalog.tax_types tt ON pt.tax_type_id = tt.id
    WHERE pt.product_id = $1 AND tt.is_active = TRUE
    ORDER BY pt.display_order
  `, [productId]);

  // 2. Calcular cada impuesto
  const taxes = productTaxes.rows.map(tax => {
    const rate = tax.override_rate ?? tax.rate;
    const amount = tax.rate_type === 'percentage'
      ? subtotal * rate
      : tax.override_fixed_amount ?? tax.fixed_amount ?? 0;

    return {
      tax_type_id: tax.tax_type_id,
      tax_name: tax.name,
      rate: rate,
      amount: Math.round(amount * 100) / 100, // Redondear a 2 decimales
      applied_to: 'subtotal'
    };
  });

  // 3. Calcular total
  const totalTax = taxes.reduce((sum, tax) => sum + tax.amount, 0);

  return {
    taxes,
    total_tax: Math.round(totalTax * 100) / 100
  };
}
```

### Frontend: Visualización

```typescript
// Componente de desglose de impuestos
function TaxBreakdown({ taxBreakdown }: { taxBreakdown: TaxBreakdown }) {
  return (
    <div className="tax-breakdown">
      {taxBreakdown.taxes.map(tax => (
        <div key={tax.tax_type_id} className="tax-item">
          <span>{tax.tax_name} ({tax.rate * 100}%)</span>
          <span>{formatCurrency(tax.amount)}</span>
        </div>
      ))}
      <div className="tax-total">
        <span>Total de impuestos</span>
        <span>{formatCurrency(taxBreakdown.total_tax)}</span>
      </div>
    </div>
  );
}
```

---

## 📋 Checklist de Implementación

### Fase 1: Base de Datos
- [x] Crear tabla `catalog.tax_types`
- [x] Crear tabla `catalog.product_taxes`
- [x] Modificar `orders.order_items` para agregar `tax_breakdown`
- [x] Crear índices necesarios
- [x] Crear script de migración

### Fase 2: Backend
- [ ] Crear módulo `taxes` en NestJS
- [ ] Endpoints CRUD para `tax_types` (solo admin)
- [ ] Endpoint para obtener impuestos disponibles
- [ ] Endpoint para asignar/desasignar impuestos a productos
- [ ] Función de cálculo de impuestos
- [ ] Integrar cálculo en `checkout` service
- [ ] Actualizar `order_items` con `tax_breakdown`

### Fase 3: web-admin
- [ ] Página de gestión de impuestos (`/catalog/taxes`)
- [ ] Formulario para crear/editar tipos de impuestos
- [ ] Lista de impuestos con acciones (editar, desactivar)
- [ ] Validación de porcentajes y reglas

### Fase 4: web-local
- [ ] Sección "Impuestos" en formulario de producto
- [ ] Selector múltiple de impuestos disponibles
- [ ] Opción de override de porcentaje por producto
- [ ] Visualización de impuestos asignados
- [ ] Validación y guardado

### Fase 5: web-cliente
- [ ] Mostrar impuestos en carrito (por producto)
- [ ] Desglose de impuestos en checkout
- [ ] Mostrar impuestos en detalle de pedido
- [ ] Indicar si impuestos están incluidos o no

### Fase 6: Testing y Documentación
- [ ] Tests unitarios para cálculo de impuestos
- [ ] Tests de integración para checkout
- [ ] Documentación de API
- [ ] Guía de usuario para administradores
- [ ] Guía de usuario para negocios

---

## 🎯 Casos de Uso

### Caso 1: IVA estándar en México (16%)

1. Admin crea impuesto "IVA" con rate 0.16 (16%)
2. Admin marca como "por defecto"
3. Negocio crea producto → automáticamente tiene IVA
4. Cliente compra → ve "IVA (16%): $16.00" en el desglose

### Caso 2: Impuesto local adicional (CDMX 2%)

1. Admin crea impuesto "Impuesto Local CDMX" con rate 0.02 (2%)
2. Negocio asigna este impuesto adicional a productos específicos
3. Cliente compra → ve ambos impuestos desglosados:
   - IVA (16%): $16.00
   - Impuesto Local CDMX (2%): $2.00

### Caso 3: Producto exento de impuestos

1. Negocio crea producto (ej: medicamento con receta)
2. No asigna ningún impuesto
3. Cliente compra → no se aplican impuestos

### Caso 4: Override de porcentaje por producto

1. Negocio tiene producto con precio especial
2. Asigna IVA pero con override a 8% (en lugar del 16% estándar)
3. Cliente compra → ve "IVA (8%): $8.00"

---

## 🔒 Consideraciones de Seguridad

1. **Solo administradores** pueden crear/modificar tipos de impuestos
2. **Validación de porcentajes**: No permitir valores negativos o mayores a 100%
3. **Auditoría**: Registrar cambios en tipos de impuestos
4. **Inmutabilidad**: Los `tax_breakdown` en `order_items` no deben modificarse después del checkout

---

## 📊 Métricas y Reportes

### Reportes Fiscales

El sistema debe permitir generar reportes para:
- Total de impuestos recaudados por tipo
- Impuestos por negocio
- Impuestos por período
- Exportación para contabilidad

---

## 🔄 Migraciones Futuras

### Posibles Expansiones

1. **Impuestos por región**: Diferentes impuestos según ubicación del cliente
2. **Impuestos por categoría de producto**: Alimentos vs. no alimentos
3. **Exenciones automáticas**: Reglas complejas de exención
4. **Integración con facturación electrónica**: Generación automática de CFDI

---

## 📝 Notas de Implementación

### Orden de Ejecución

1. **Primero**: Ejecutar migración de base de datos
2. **Segundo**: Implementar backend (endpoints y lógica)
3. **Tercero**: Implementar web-admin (gestión de impuestos)
4. **Cuarto**: Implementar web-local (asignación a productos)
5. **Quinto**: Actualizar checkout para calcular impuestos
6. **Sexto**: Implementar visualización en web-cliente

### Compatibilidad con Sistema Actual

- El sistema actual calcula `tax_amount = subtotal * 0.16` hardcodeado
- La nueva implementación reemplazará este cálculo
- Los pedidos antiguos mantendrán su `tax_amount` original
- Los nuevos pedidos usarán el sistema configurable

---

## 📚 Referencias

- [Regulaciones fiscales CDMX](https://regeneracion.mx/apps-de-comida-tendran-que-pagar-el-2-de-impuestos-en-la-cdmx/)
- [Mejores prácticas de facturación electrónica en México](https://www.sat.gob.mx/)
- [Análisis de plataformas de delivery](investigación propia)

---

**Versión:** 1.0  
**Fecha:** 2024-11-18  
**Autor:** Sistema Localia  
**Estado:** En implementación

