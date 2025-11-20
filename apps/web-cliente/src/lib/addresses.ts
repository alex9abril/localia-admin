/**
 * Servicio para manejar direcciones
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export interface Address {
  id: string;
  label?: string;
  street: string;
  street_number?: string;
  interior_number?: string;
  neighborhood: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  longitude: number;
  latitude: number;
  additional_references?: string;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateAddressDto {
  label?: string;
  street: string;
  street_number?: string;
  interior_number?: string;
  neighborhood: string;
  city?: string;
  state?: string;
  postal_code: string;
  country?: string;
  longitude: number;
  latitude: number;
  additional_references?: string;
  is_default?: boolean;
}

export interface UpdateAddressDto {
  label?: string;
  street?: string;
  street_number?: string;
  interior_number?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  longitude?: number;
  latitude?: number;
  additional_references?: string;
  is_default?: boolean;
}

class AddressesService {
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

  async findAll(): Promise<Address[]> {
    try {
      const response = await fetch(`${API_URL}/addresses`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Error al obtener direcciones: ${response.statusText}`);
      }

      const result = await response.json();
      return result.data || result;
    } catch (error) {
      console.error('Error obteniendo direcciones:', error);
      throw error;
    }
  }

  async findOne(id: string): Promise<Address> {
    try {
      const response = await fetch(`${API_URL}/addresses/${id}`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Error al obtener dirección: ${response.statusText}`);
      }

      const result = await response.json();
      return result.data || result;
    } catch (error) {
      console.error('Error obteniendo dirección:', error);
      throw error;
    }
  }

  async create(createDto: CreateAddressDto): Promise<Address> {
    try {
      const response = await fetch(`${API_URL}/addresses`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(createDto),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || `Error al crear dirección: ${response.statusText}`);
      }

      const result = await response.json();
      return result.data || result;
    } catch (error) {
      console.error('Error creando dirección:', error);
      throw error;
    }
  }

  async update(id: string, updateDto: UpdateAddressDto): Promise<Address> {
    try {
      const response = await fetch(`${API_URL}/addresses/${id}`, {
        method: 'PATCH',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(updateDto),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || `Error al actualizar dirección: ${response.statusText}`);
      }

      const result = await response.json();
      return result.data || result;
    } catch (error) {
      console.error('Error actualizando dirección:', error);
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    try {
      const response = await fetch(`${API_URL}/addresses/${id}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || `Error al eliminar dirección: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error eliminando dirección:', error);
      throw error;
    }
  }

  async setDefault(id: string): Promise<Address> {
    try {
      const response = await fetch(`${API_URL}/addresses/${id}/set-default`, {
        method: 'PATCH',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || `Error al establecer dirección predeterminada: ${response.statusText}`);
      }

      const result = await response.json();
      return result.data || result;
    } catch (error) {
      console.error('Error estableciendo dirección predeterminada:', error);
      throw error;
    }
  }
}

export const addressesService = new AddressesService();

