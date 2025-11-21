# 🎯 Alcance MVP - LOCALIA Admin

**Versión:** 1.0  
**Fecha:** Noviembre 2025  
**Audiencia:** Product Owner, Equipo Operativo, Stakeholders

---

## 📋 Resumen Ejecutivo

Este documento define el **alcance mínimo viable (MVP)** del sistema LOCALIA, una plataforma de delivery hiperlocal (radio 3 km) que conecta clientes, negocios locales y repartidores mediante un ecosistema de créditos digitales (LocalCoins).

### Objetivo del MVP

Entregar un sistema funcional end-to-end que permita:
- ✅ Clientes realicen pedidos y paguen con LocalCoins
- ✅ Negocios gestionen menú, reciban y procesen pedidos
- ✅ Repartidores acepten y entreguen pedidos
- ✅ Administradores gestionen el sistema y usuarios
- ✅ Integración con Wallet externo para transacciones financieras
- ✅ Integración con pasarela de pagos para compra de LocalCoins

---

## 👥 Roles y Actores del Sistema

### 1. **Cliente** (`client`)
- Usuario final que realiza pedidos
- Compra LocalCoins para pagar pedidos
- Rastrea entregas en tiempo real
- Deja reseñas y propinas

### 2. **Repartidor** (`repartidor`)
- Acepta/rechaza pedidos disponibles
- Actualiza estado de entregas
- Visualiza ganancias y historial

### 3. **Negocio Local** - Roles de Negocio

#### 3.1. **Superadmin** (`superadmin`)
- Acceso completo al negocio
- Gestiona usuarios y permisos
- Configuración del negocio

#### 3.2. **Admin** (`admin`)
- Gestión completa de productos y precios
- Gestión de promociones
- Gestión de órdenes
- Estadísticas y reportes

#### 3.3. **Operations Staff** (`operations_staff`)
- Panel operativo independiente
- Acepta pedidos (pending → confirmed)
- Actualiza estados (confirmed → preparing → ready)
- Gestiona entregas cuando llega repartidor

#### 3.4. **Kitchen Staff** (`kitchen_staff`) (opcional)
- Interfaz aislada para cocina
- Solo ve órdenes confirmadas
- Marca órdenes como "en preparación" y "listas"

### 4. **Administrador del Sistema** (`admin`)
- Panel de administración completo
- Gestión de usuarios y negocios
- Métricas y analytics globales
- Configuración del sistema
- Gestión de catálogos y categorías

---

## 🔄 Diagrama de Procesos Principal (BPMN 2.0)

### Flujo Completo: Cliente → Local → Repartidor

Este diagrama sigue el estándar **BPMN 2.0** (Business Process Model and Notation) con:
- **Pools (Piscinas)**: Representan participantes/organizaciones independientes
- **Lanes (Carriles)**: Representan roles dentro de un participante
- **Eventos**: Círculos (inicio/fin)
- **Tareas**: Rectángulos con esquinas redondeadas
- **Gateways**: Diamantes (decisiones)
- **Mensajes**: Líneas punteadas entre pools

```mermaid
graph TB
    subgraph PoolCliente["📱 POOL: CLIENTE"]
        direction TB
        Start([● Inicio<br/>Cliente inicia sesión])
        Browse[Explorar negocios disponibles]
        Select[Seleccionar negocio y productos]
        Cart[Agregar productos al carrito]
        Checkout[Iniciar proceso de checkout]
        Address[Seleccionar dirección de entrega]
        Delivery[Configurar entrega y propina]
        Payment[Seleccionar método de pago]
        Review[Dejar reseña y propina]
        End([● Fin<br/>Pedido entregado])
        
        Start --> Browse
        Browse --> Select
        Select --> Cart
        Cart --> Checkout
        Checkout --> Address
        Address --> Delivery
        Delivery --> Payment
    end
    
    subgraph PoolPasarela["💳 POOL: PASARELA DE PAGOS"]
        direction TB
        StartPasarela([● Inicio<br/>Solicitud de pago])
        CreatePaymentIntent[Crear intención de pago]
        ProcessCard[Procesar pago con tarjeta]
        ConfirmPayment[Confirmar pago exitoso]
        EndPasarela([● Fin<br/>Pago confirmado])
        
        StartPasarela --> CreatePaymentIntent
        CreatePaymentIntent --> ProcessCard
        ProcessCard --> ConfirmPayment
        ConfirmPayment --> EndPasarela
    end
    
    subgraph PoolWallet["💰 POOL: WALLET (Proyecto Externo)"]
        direction TB
        CheckBalance[Verificar balance de LocalCoins]
        CreditLC[Acreditar LocalCoins]
        DebitLC[Debitar LocalCoins del cliente]
        RefundLC[Reembolsar LocalCoins]
        PayLocal[Pagar al Local]
        PayRepartidor[Pagar al Repartidor]
        PayTip[Pagar propina]
    end
    
    subgraph PoolLocal["🏬 POOL: NEGOCIO LOCAL"]
        direction TB
        ReceiveOrder[Recibir notificación de pedido]
        ViewOrder[Ver pedido pendiente]
        AcceptDecision{◇ Gateway<br/>¿Acepta pedido?}
        CancelOrder[Cancelar pedido]
        ConfirmOrder[Confirmar pedido]
        NotifyClient[Notificar cliente]
        
        subgraph LaneOperations["┃ LANE: Operations Staff"]
            OperationsView[Ver orden en panel operativo]
            OperationsPrep[Poner en preparación]
            OperationsReady[Marcar como listo]
        end
        
        subgraph LaneKitchen["┃ LANE: Kitchen Staff (Opcional)"]
            KitchenView[Ver orden confirmada]
            StartPrep[Iniciar preparación]
            FinishPrep[Terminar preparación]
        end
        
        AssignRepartidor[Asignar a repartidor]
        MarkPickedUp[Marcar como recogido]
        MarkDelivered[Marcar como entregado]
        
        ReceiveOrder --> ViewOrder
        ViewOrder --> AcceptDecision
        AcceptDecision -->|No| CancelOrder
        AcceptDecision -->|Sí| ConfirmOrder
        ConfirmOrder --> NotifyClient
        ConfirmOrder --> OperationsView
        ConfirmOrder --> KitchenView
        OperationsView --> OperationsPrep
        KitchenView --> StartPrep
        StartPrep --> FinishPrep
        OperationsPrep --> OperationsReady
        FinishPrep --> OperationsReady
        OperationsReady --> AssignRepartidor
    end
    
    subgraph PoolRepartidor["🚴 POOL: REPARTIDOR"]
        direction TB
        ViewAvailable[Ver pedidos disponibles]
        AcceptDelivery{◇ Gateway<br/>¿Acepta entrega?}
        PickUp[Recoger pedido]
        InTransit[Actualizar: En camino]
        Deliver[Entregar pedido]
        
        ViewAvailable --> AcceptDelivery
        AcceptDelivery -->|No| ViewAvailable
        AcceptDelivery -->|Sí| PickUp
        PickUp --> InTransit
        InTransit --> Deliver
    end
    
    %% Flujo principal de pago
    Payment -.->|Mensaje: Solicitar verificación| CheckBalance
    CheckBalance -->|Balance insuficiente| StartPasarela
    StartPasarela -.->|Mensaje: Solicitar pago| Payment
    EndPasarela -.->|Mensaje: Pago confirmado| CreditLC
    CheckBalance -->|Balance suficiente| DebitLC
    CreditLC --> DebitLC
    
    %% Creación de pedido
    DebitLC -.->|Mensaje: Pedido creado| ReceiveOrder
    CancelOrder -.->|Mensaje: Cancelación| RefundLC
    RefundLC -.->|Mensaje: Reembolso| Payment
    
    %% Asignación a repartidor
    AssignRepartidor -.->|Mensaje: Pedido disponible| ViewAvailable
    PickUp -.->|Mensaje: Pedido recogido| MarkPickedUp
    Deliver -.->|Mensaje: Pedido entregado| MarkDelivered
    
    %% Pagos finales
    MarkDelivered -.->|Mensaje: Solicitar pago| PayLocal
    MarkDelivered -.->|Mensaje: Solicitar pago| PayRepartidor
    MarkDelivered -.->|Mensaje: Solicitar propina| PayTip
    
    %% Finalización
    PayLocal -.->|Mensaje: Pago completado| Review
    PayRepartidor -.->|Mensaje: Pago completado| Review
    PayTip -.->|Mensaje: Propina pagada| Review
    Review --> End
    
    %% Estilos BPMN
    style Start fill:#e1f5ff,stroke:#0066cc,stroke-width:3px
    style End fill:#d4edda,stroke:#28a745,stroke-width:3px
    style StartPasarela fill:#e1f5ff,stroke:#0066cc,stroke-width:3px
    style EndPasarela fill:#d4edda,stroke:#28a745,stroke-width:3px
    style AcceptDecision fill:#fff3cd,stroke:#ffc107,stroke-width:3px
    style AcceptDelivery fill:#fff3cd,stroke:#ffc107,stroke-width:3px
    style CheckBalance fill:#fff3cd,stroke:#ffc107,stroke-width:2px
    style PoolWallet fill:#fff9e6,stroke:#ffc107,stroke-width:4px
    style PoolPasarela fill:#e6f3ff,stroke:#0066cc,stroke-width:4px
    style PoolCliente fill:#e6f7ff,stroke:#0066cc,stroke-width:4px
    style PoolLocal fill:#e6ffe6,stroke:#28a745,stroke-width:4px
    style PoolRepartidor fill:#ffe6f0,stroke:#e91e63,stroke-width:4px
    style LaneOperations fill:#f0f8f0,stroke:#28a745,stroke-width:2px
    style LaneKitchen fill:#fff8e6,stroke:#ffc107,stroke-width:2px
```

---

## 🏗️ Funcionalidades del MVP

### 📱 **App Cliente (Web)**

#### Autenticación y Perfil
- ✅ Registro e inicio de sesión
- ✅ Gestión de perfil
- ✅ Gestión de direcciones de entrega

#### Catálogo y Pedidos
- ✅ Explorar negocios disponibles (radio 3 km)
- ✅ Ver menú de negocios
- ✅ Agregar productos al carrito
- ✅ Proceso de checkout (3 pasos: dirección, entrega, pago)
- ✅ Selección de método de pago (LocalCoins)
- ✅ Seguimiento de pedidos en tiempo real
- ✅ Historial de pedidos

#### Wallet y Pagos
- ✅ Ver balance de LocalCoins
- ✅ Comprar LocalCoins (integración con pasarela de pagos)
- ✅ Historial de transacciones
- ✅ Pago con LocalCoins en checkout

#### Evaluaciones
- ✅ Dejar reseñas después de entrega
- ✅ Agregar propinas (opcional)

---

### 🏪 **App Local (Web)**

#### Autenticación y Configuración
- ✅ Registro e inicio de sesión
- ✅ Gestión de perfil del negocio
- ✅ Selección de negocio (multi-tienda)

#### Gestión de Productos (Admin/Superadmin)
- ✅ Crear, editar, eliminar productos
- ✅ Gestión de categorías y colecciones
- ✅ Configurar precios y variantes
- ✅ Gestión de impuestos configurables
- ✅ Configurar disponibilidad y horarios

#### Gestión de Órdenes

**Operations Staff:**
- ✅ Panel operativo con vista Kanban
- ✅ Aceptar pedidos (pending → confirmed)
- ✅ Actualizar estados (confirmed → preparing → ready)
- ✅ Gestionar entregas (picked_up → delivered)
- ✅ Cancelar pedidos con razón
- ✅ Notificaciones en tiempo real
- ✅ Auto-refresh cada 5 segundos

**Kitchen Staff:**
- ✅ Interfaz aislada tipo "ticket de cocina"
- ✅ Ver solo órdenes confirmadas y en preparación
- ✅ Marcar como "en preparación" (confirmed → preparing)
- ✅ Marcar como "listo" (preparing → ready)
- ✅ Timer visual de tiempo transcurrido
- ✅ Auto-refresh cada 3 segundos

**Admin/Superadmin:**
- ✅ Vista completa de todas las órdenes
- ✅ Estadísticas y reportes
- ✅ Historial de pedidos

#### Promociones (Admin/Superadmin)
- ✅ Crear y gestionar promociones
- ✅ Descuentos y ofertas especiales

---

### 🚴 **Gestión de Repartidores**

#### Gestión desde Panel Admin/Local (✅ Incluido en MVP)
- ✅ Registro y gestión de repartidores
- ✅ Asignación manual de pedidos a repartidores
- ✅ Ver pedidos asignados a repartidores
- ✅ Actualizar estado de entregas (picked_up, in_transit, delivered)
- ✅ Visualización de historial de entregas
- ✅ Gestión de pagos a repartidores

#### App Repartidor Móvil/Web (⏳ Fase 2)
- ⏳ App móvil/web específica para repartidores
- ⏳ Aceptar/rechazar entregas desde la app
- ⏳ Actualizar estado de entrega desde la app
- ⏳ Navegación y rutas integradas
- ⏳ Tracking GPS en tiempo real
- ⏳ Visualización de ganancias en la app

> **Nota:** La **gestión de repartidores** está incluida en el MVP desde el Panel Admin y Local. La **app móvil/web específica para repartidores** queda para **Fase 2**.

---

### ⚙️ **Panel Admin (Web)**

#### Gestión de Usuarios
- ✅ Ver todos los usuarios
- ✅ Gestionar roles y permisos
- ✅ Activar/desactivar usuarios

#### Gestión de Negocios
- ✅ Ver todos los negocios
- ✅ Aprobar/verificar negocios
- ✅ Gestionar zonas de cobertura

#### Gestión de Repartidores
- ✅ Registrar y gestionar repartidores
- ✅ Ver repartidores disponibles
- ✅ Asignar pedidos a repartidores
- ✅ Ver historial de entregas por repartidor
- ✅ Gestionar pagos a repartidores

#### Gestión de Catálogos
- ✅ Gestión de categorías de productos
- ✅ Gestión de tipos de impuestos
- ✅ Configuración de catálogos globales

#### Métricas y Analytics
- ✅ Dashboard con métricas globales
- ✅ Reportes de pedidos
- ✅ Estadísticas de usuarios y negocios

#### Configuración del Sistema
- ✅ Gestión de API keys
- ✅ Configuración general
- ✅ Gestión de zonas de servicio

---

## 💳 Integración con Wallet (Proyecto Externo)

### Descripción

El **Wallet** es un proyecto separado que gestiona todas las transacciones financieras con LocalCoins. El MVP se integra con el Wallet mediante comunicación entre sistemas (APIs) para realizar todas las operaciones financieras.

### Funcionalidades de Integración MVP

El MVP necesita comunicarse con el Wallet para realizar las siguientes operaciones:

| Funcionalidad | Descripción | Cuándo se usa |
|---------------|-------------|---------------|
| **Consulta de Balance** | Verificar cuántos LocalCoins tiene un usuario | Al iniciar checkout, antes de procesar pago |
| **Compra de LocalCoins** | Acreditar LocalCoins al usuario después de compra | Cuando cliente compra créditos con tarjeta |
| **Pago de Pedido** | Transferir LocalCoins del cliente al negocio | Al confirmar pedido y procesar pago |
| **Pago a Repartidor** | Transferir LocalCoins del negocio al repartidor | Cuando se completa una entrega |
| **Propina** | Transferir LocalCoins del cliente al repartidor | Cuando cliente agrega propina |
| **Reembolso** | Devolver LocalCoins al cliente | Si se cancela un pedido |
| **Historial de Transacciones** | Ver todas las transacciones de un usuario | Para mostrar historial en la app |

### Flujo de Integración

1. **Cliente realiza pedido** → MVP consulta balance en Wallet
2. **Cliente compra LocalCoins** → Pasarela de pagos procesa → Wallet acredita LocalCoins
3. **Cliente paga pedido** → MVP solicita a Wallet transferir LocalCoins al negocio
4. **Pedido entregado** → MVP solicita a Wallet pagar al repartidor
5. **Cliente agrega propina** → MVP solicita a Wallet transferir propina al repartidor

### Almacenamiento de Referencias

El MVP almacena únicamente **referencias** (identificadores) al Wallet, no duplica información financiera:
- ID del usuario en el Wallet
- ID del negocio en el Wallet
- ID del repartidor en el Wallet
- ID de transacciones de pago y propinas

> **Nota:** Todas las transacciones financieras reales se gestionan en el Wallet. El MVP solo coordina las operaciones y almacena referencias para trazabilidad.

---

## 💰 Integración con Pasarela de Pagos

### Descripción

Para comprar LocalCoins, el MVP se integra con una pasarela de pagos (Stripe, Conekta, MercadoPago) que procesa pagos con tarjeta de crédito/débito.

### Flujo de Compra de LocalCoins

### Flujo Visual de Compra de LocalCoins

```mermaid
sequenceDiagram
    participant C as Cliente
    participant App as App Cliente
    participant Sistema as Sistema LOCALIA
    participant Payment as Pasarela de Pagos
    participant Wallet as Wallet
    
    C->>App: Quiere comprar LocalCoins
    App->>Sistema: Solicitar compra de LocalCoins
    Sistema->>Payment: Preparar pago con tarjeta
    Payment-->>Sistema: Pago listo para procesar
    Sistema-->>App: Mostrar formulario de pago
    
    App->>Payment: Cliente ingresa datos de tarjeta
    Payment-->>App: Pago procesado exitosamente
    
    App->>Sistema: Confirmar compra
    Sistema->>Wallet: Solicitar acreditación de LocalCoins
    Wallet-->>Sistema: LocalCoins acreditados
    Sistema-->>App: Balance actualizado
    App-->>C: Compra completada
```

### Funcionalidades de Integración

| Funcionalidad | Descripción | Cuándo se usa |
|---------------|-------------|---------------|
| **Preparar Compra** | Preparar el pago con tarjeta antes de procesarlo | Cuando cliente quiere comprar LocalCoins |
| **Confirmar Compra** | Finalizar la compra después de que la pasarela procesa el pago | Después de que el pago con tarjeta es exitoso |
| **Notificaciones Automáticas** | Recibir confirmaciones automáticas de la pasarela | Cuando la pasarela confirma o rechaza un pago |

### Flujo de Compra de LocalCoins

1. Cliente selecciona cantidad de LocalCoins a comprar
2. Sistema prepara el pago con la pasarela de pagos
3. Cliente ingresa datos de tarjeta de crédito/débito
4. Pasarela procesa el pago de forma segura
5. Pasarela notifica al sistema si el pago fue exitoso
6. Sistema confirma la compra con el Wallet
7. Wallet acredita los LocalCoins al cliente
8. Cliente ve su balance actualizado en la app

---

## 📊 Estados de Pedido en el MVP

| Estado | Descripción | Quién puede cambiar |
|--------|-------------|---------------------|
| `pending` | Pedido creado, esperando confirmación del local | Operations Staff → `confirmed` |
| `confirmed` | Local aceptó el pedido | Operations/Kitchen → `preparing` |
| `preparing` | Orden en preparación | Operations/Kitchen → `ready` |
| `ready` | Orden lista para recoger | Operations → `picked_up` |
| `assigned` | Asignado a repartidor | (Futuro - Fase 2) |
| `picked_up` | Repartidor recogió el pedido | Operations → `in_transit` |
| `in_transit` | En camino a cliente | Operations → `delivered` |
| `delivered` | Entregado al cliente | Sistema automático |
| `cancelled` | Pedido cancelado | Operations/Admin |
| `refunded` | Reembolsado | Sistema automático |

---

## 🎯 Alcance MVP vs Fase 2

### ✅ **INCLUIDO EN MVP**

#### Funcionalidades Core
- ✅ Autenticación y gestión de usuarios
- ✅ Catálogo de productos completo
- ✅ Carrito de compras
- ✅ Proceso de checkout completo
- ✅ Gestión de órdenes end-to-end
- ✅ Gestión de repartidores (registro, asignación, seguimiento)
- ✅ Roles diferenciados para negocios (superadmin, admin, operations, kitchen)
- ✅ Sistema de impuestos configurable
- ✅ Integración con Wallet
- ✅ Integración con pasarela de pagos
- ✅ Notificaciones básicas
- ✅ Panel de administración

#### Apps Incluidas
- ✅ **Web Cliente** - Completa
- ✅ **Web Local** - Completa (con roles diferenciados)
- ✅ **Web Admin** - Completa

---

### ⏳ **EXCLUIDO DEL MVP (Fase 2)**

#### App Repartidor Móvil/Web
- ⏳ App móvil/web específica para repartidores
- ⏳ Sistema de asignación automática de pedidos
- ⏳ Aceptar/rechazar entregas desde la app
- ⏳ Navegación y rutas integradas
- ⏳ Tracking GPS en tiempo real desde la app
- ⏳ Notificaciones push para repartidores

#### Funcionalidades Avanzadas
- ⏳ Chat en tiempo real (cliente-repartidor-local)
- ⏳ Sistema de membresías Premium
- ⏳ Marketplace y publicidad
- ⏳ Red social ecológica completa
- ⏳ Sistema de referidos
- ⏳ Promociones avanzadas (cashback, bonificaciones)
- ⏳ Suscripciones de negocios
- ⏳ Analytics avanzados y reportes financieros
- ⏳ Sistema de notificaciones push completo
- ⏳ Actualizaciones en tiempo real avanzadas

#### Sistema de Métricas y Analytics
- ⏳ Dashboard de métricas de rendimiento del sistema
- ⏳ Monitoreo de tiempo de respuesta de operaciones
- ⏳ Tracking de disponibilidad del sistema
- ⏳ Análisis de tasa de errores
- ⏳ Métricas de uso por funcionalidad
- ⏳ Reportes de rendimiento y performance
- ⏳ Alertas automáticas de problemas del sistema

> **Nota:** El sistema de métricas se desarrollará mientras el MVP está en marcha, permitiendo monitorear y optimizar el sistema basándose en datos reales de uso.

#### Integraciones Futuras
- ⏳ Integración con múltiples fintechs
- ⏳ Conversión de LCs a dinero real (para locales/repartidores)
- ⏳ Sistema de control de emisión de LCs bonificados
- ⏳ Expansión a múltiples zonas/barrios

---

## 🔐 Seguridad y Validaciones MVP

### Autenticación y Acceso
- ✅ Sistema de login seguro para todos los usuarios
- ✅ Sesiones protegidas para cada usuario
- ✅ Control de acceso basado en roles (cliente, local, admin, repartidor)

### Validaciones de Negocio
- ✅ Radio de cobertura limitado a 3 km máximo
- ✅ Verificación de disponibilidad de productos antes de agregar al carrito
- ✅ Validación de stock de productos (si está configurado)
- ✅ Verificación de horarios de atención del negocio

### Validaciones de Pago
- ✅ Verificación de balance de LocalCoins antes de procesar pedido
- ✅ Validación de montos mínimos de compra
- ✅ Confirmación de transacciones con el Wallet antes de completar pedido

---

## 📝 Notas Importantes

### Wallet como Proyecto Externo
- El Wallet se desarrolla **por separado** y se comunica con el MVP
- El MVP solo almacena **referencias** (identificadores) a entidades del Wallet
- Todas las transacciones financieras reales se gestionan en el Wallet

### Pasarela de Pagos
- Se integra con **una** pasarela de pagos en el MVP (Stripe, Conekta o MercadoPago)
- La integración permite comprar LocalCoins con tarjeta de crédito/débito
- El sistema recibe confirmaciones automáticas de la pasarela cuando se procesan pagos

### Repartidores en MVP
- ✅ La **gestión de repartidores** está incluida en el MVP
- ✅ Los repartidores se pueden registrar y gestionar desde el Panel Admin
- ✅ Las entregas se asignan y gestionan manualmente desde el Panel Local (Operations Staff)
- ✅ Los estados de entrega (picked_up, in_transit, delivered) se actualizan desde el panel
- ⏳ La **app móvil/web específica para repartidores** queda para Fase 2

---

## 🎯 Próximos Pasos Post-MVP

1. **Fase 2.0:** Sistema de métricas y analytics (desarrollo en paralelo mientras MVP está en marcha)
2. **Fase 2.1:** App Repartidor móvil/web completa
3. **Fase 2.2:** Chat en tiempo real
4. **Fase 2.3:** Red social ecológica
5. **Fase 2.4:** Sistema de membresías Premium
6. **Fase 2.5:** Marketplace y publicidad
7. **Fase 3:** Expansión a múltiples zonas

---

**Documento creado para:** Presentación a Product Owner y Equipo Operativo  
**Última actualización:** Noviembre 2025  
**Versión:** 1.0

