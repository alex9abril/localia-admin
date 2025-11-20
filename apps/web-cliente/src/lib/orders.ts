/**
 * Servicio para manejar pedidos
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export interface OrderItem {
  id: string;
  product_id: string;
  item_name: string;
  item_price: number | string;
  quantity: number;
  variant_selection?: Record<string, string | string[]>;
  item_subtotal: number | string;
  special_instructions?: string;
  created_at: string;
}

export interface Order {
  id: string;
  client_id: string;
  business_id: string;
  status: string;
  delivery_address_text?: string;
  subtotal: number | string;
  tax_amount: number | string;
  delivery_fee: number | string;
  discount_amount: number | string;
  tip_amount: number | string;
  total_amount: number | string;
  payment_method: string;
  payment_status: string;
  estimated_delivery_time?: number;
  delivery_notes?: string;
  created_at: string;
  updated_at: string;
  confirmed_at?: string;
  delivered_at?: string;
  cancelled_at?: string;
  business_name?: string;
  business_logo_url?: string;
  delivery_longitude?: number;
  delivery_latitude?: number;
  items?: OrderItem[];
}

export interface CheckoutDto {
  addressId: string;
  deliveryNotes?: string;
  tipAmount?: number;
}

class OrdersService {
  private getAuthHeaders(): HeadersInit {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    return headers;
  }

  async checkout(checkoutDto: CheckoutDto): Promise<Order> {
    try {
      const response = await fetch(`${API_URL}/orders/checkout`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(checkoutDto),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || `Error al procesar checkout: ${response.statusText}`);
      }

      const result = await response.json();
      return result.data || result;
    } catch (error) {
      console.error('Error en checkout:', error);
      throw error;
    }
  }

  async findAll(): Promise<Order[]> {
    try {
      const response = await fetch(`${API_URL}/orders`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Error al obtener pedidos: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('📦 Respuesta de pedidos del backend:', result);
      // El backend envuelve la respuesta en { success: true, data: [...] }
      const orders = result.data || result;
      console.log('📦 Pedidos parseados:', orders);
      return Array.isArray(orders) ? orders : [];
    } catch (error) {
      console.error('Error obteniendo pedidos:', error);
      throw error;
    }
  }

  async findOne(id: string): Promise<Order> {
    try {
      const response = await fetch(`${API_URL}/orders/${id}`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Error al obtener pedido: ${response.statusText}`);
      }

      const result = await response.json();
      return result.data || result;
    } catch (error) {
      console.error('Error obteniendo pedido:', error);
      throw error;
    }
  }

  async cancel(id: string, reason?: string): Promise<Order> {
    try {
      const response = await fetch(`${API_URL}/orders/${id}/cancel`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ reason }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || `Error al cancelar pedido: ${response.statusText}`);
      }

      const result = await response.json();
      return result.data || result;
    } catch (error) {
      console.error('Error cancelando pedido:', error);
      throw error;
    }
  }
}

export const ordersService = new OrdersService();

