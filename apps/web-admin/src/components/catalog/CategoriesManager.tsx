import { useState, useEffect } from 'react';
import { apiRequest } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

interface Category {
  id: string;
  business_id?: string;
  business_name?: string;
  name: string;
  description?: string;
  icon_url?: string;
  parent_category_id?: string;
  parent_category_name?: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  total_products: number;
}

interface CategoriesResponse {
  data: Category[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface Business {
  id: string;
  name: string;
}

export default function CategoriesManager() {
  const { token } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filters, setFilters] = useState({
    page: 1,
    limit: 20,
    businessId: '',
    globalOnly: false,
    isActive: undefined as boolean | undefined,
    search: '',
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [formData, setFormData] = useState({
    business_id: '',
    name: '',
    description: '',
    icon_url: '',
    parent_category_id: '',
    display_order: 0,
    is_active: true,
  });
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Cargar negocios para el selector
  useEffect(() => {
    const loadBusinesses = async () => {
      if (!token) return;
      try {
        const response = await apiRequest<{ data: Business[] }>('/businesses?limit=100', {
          method: 'GET',
        });
        setBusinesses(response.data || []);
      } catch (error) {
        console.error('Error cargando negocios:', error);
      }
    };
    loadBusinesses();
  }, [token]);

  // Cargar categorías
  useEffect(() => {
    const loadCategories = async () => {
      if (!token) return;

      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.append('page', filters.page.toString());
        params.append('limit', filters.limit.toString());
        if (filters.businessId) {
          params.append('businessId', filters.businessId);
        }
        if (filters.globalOnly) {
          params.append('globalOnly', 'true');
        }
        if (filters.isActive !== undefined) {
          params.append('isActive', filters.isActive.toString());
        }
        if (filters.search) {
          params.append('search', filters.search);
        }

        const response = await apiRequest<CategoriesResponse>(
          `/catalog/categories?${params.toString()}`,
          { method: 'GET' }
        );

        setCategories(response.data);
        setPagination(response.pagination);
      } catch (error) {
        console.error('Error cargando categorías:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCategories();
  }, [token, filters]);

  // Cargar categorías padre para el selector
  const [parentCategories, setParentCategories] = useState<Category[]>([]);
  useEffect(() => {
    const loadParentCategories = async () => {
      if (!token) return;
      try {
        const response = await apiRequest<CategoriesResponse>(
          `/catalog/categories?limit=100&isActive=true`,
          { method: 'GET' }
        );
        setParentCategories(response.data || []);
      } catch (error) {
        console.error('Error cargando categorías padre:', error);
      }
    };
    loadParentCategories();
  }, [token]);

  const handleFilterChange = (key: string, value: any) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      page: 1,
    }));
  };

  const handleSelectCategory = async (category: Category) => {
    setSelectedCategory(category);
    setFormData({
      business_id: category.business_id || '',
      name: category.name,
      description: category.description || '',
      icon_url: category.icon_url || '',
      parent_category_id: category.parent_category_id || '',
      display_order: category.display_order,
      is_active: category.is_active,
    });
    setIsEditing(true);
    setShowForm(true);
  };

  const handleNewCategory = () => {
    setSelectedCategory(null);
    setFormData({
      business_id: '',
      name: '',
      description: '',
      icon_url: '',
      parent_category_id: '',
      display_order: 0,
      is_active: true,
    });
    setIsEditing(false);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!token) return;

    setSaving(true);
    try {
      const payload: any = {
        name: formData.name,
        description: formData.description || undefined,
        icon_url: formData.icon_url || undefined,
        display_order: formData.display_order,
        is_active: formData.is_active,
      };

      if (formData.business_id) {
        payload.business_id = formData.business_id;
      }

      if (formData.parent_category_id) {
        payload.parent_category_id = formData.parent_category_id;
      }

      if (isEditing && selectedCategory) {
        await apiRequest(`/catalog/categories/${selectedCategory.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      } else {
        await apiRequest('/catalog/categories', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      setShowForm(false);
      setSelectedCategory(null);
      // Recargar categorías
      const params = new URLSearchParams();
      params.append('page', filters.page.toString());
      params.append('limit', filters.limit.toString());
      if (filters.businessId) params.append('businessId', filters.businessId);
      if (filters.globalOnly) params.append('globalOnly', 'true');
      if (filters.isActive !== undefined) params.append('isActive', filters.isActive.toString());
      if (filters.search) params.append('search', filters.search);

      const response = await apiRequest<CategoriesResponse>(
        `/catalog/categories?${params.toString()}`,
        { method: 'GET' }
      );
      setCategories(response.data);
      setPagination(response.pagination);
    } catch (error) {
      console.error('Error guardando categoría:', error);
      alert('Error al guardar la categoría');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!token) return;
    if (!confirm('¿Estás seguro de que deseas desactivar esta categoría?')) return;

    try {
      await apiRequest(`/catalog/categories/${id}`, {
        method: 'DELETE',
      });
      // Recargar categorías
      const params = new URLSearchParams();
      params.append('page', filters.page.toString());
      params.append('limit', filters.limit.toString());
      if (filters.businessId) params.append('businessId', filters.businessId);
      if (filters.globalOnly) params.append('globalOnly', 'true');
      if (filters.isActive !== undefined) params.append('isActive', filters.isActive.toString());
      if (filters.search) params.append('search', filters.search);

      const response = await apiRequest<CategoriesResponse>(
        `/catalog/categories?${params.toString()}`,
        { method: 'GET' }
      );
      setCategories(response.data);
      setPagination(response.pagination);
      if (selectedCategory?.id === id) {
        setSelectedCategory(null);
        setShowForm(false);
      }
    } catch (error: any) {
      console.error('Error eliminando categoría:', error);
      alert(error.response?.data?.message || 'Error al desactivar la categoría');
    }
  };

  return (
    <div className="space-y-4">
      {/* Filtros y acciones */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2 flex-1">
          <input
            type="text"
            placeholder="Buscar categorías..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            className="px-3 py-2 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 flex-1 max-w-xs"
          />
          <select
            value={filters.globalOnly ? 'global' : filters.businessId}
            onChange={(e) => {
              if (e.target.value === 'global') {
                setFilters((prev) => ({
                  ...prev,
                  businessId: '',
                  globalOnly: true,
                  page: 1,
                }));
              } else {
                setFilters((prev) => ({
                  ...prev,
                  businessId: e.target.value,
                  globalOnly: false,
                  page: 1,
                }));
              }
            }}
            className="px-3 py-2 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">Todos los negocios</option>
            <option value="global">Categorías Globales</option>
            {businesses.map((business) => (
              <option key={business.id} value={business.id}>
                {business.name}
              </option>
            ))}
          </select>
          <select
            value={filters.isActive === undefined ? '' : filters.isActive.toString()}
            onChange={(e) =>
              handleFilterChange('isActive', e.target.value === '' ? undefined : e.target.value === 'true')
            }
            className="px-3 py-2 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">Todos</option>
            <option value="true">Activas</option>
            <option value="false">Inactivas</option>
          </select>
        </div>
        <button
          onClick={handleNewCategory}
          className="px-4 py-2 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors"
        >
          + Nueva Categoría
        </button>
      </div>

      {/* Lista de categorías */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : categories.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-xs text-gray-500">No se encontraron categorías</p>
        </div>
      ) : (
        <div className="space-y-2">
          {categories.map((category) => (
            <div
              key={category.id}
              className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                selectedCategory?.id === category.id
                  ? 'bg-indigo-50 border-indigo-200'
                  : 'bg-white border-gray-200 hover:bg-gray-50'
              }`}
              onClick={() => handleSelectCategory(category)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  {category.icon_url ? (
                    <img src={category.icon_url} alt={category.name} className="w-8 h-8 rounded" />
                  ) : (
                    <div className="w-8 h-8 rounded bg-gray-200 flex items-center justify-center">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-normal text-gray-900">{category.name}</p>
                      {category.parent_category_name && (
                        <span className="text-xs text-gray-500">
                          (Padre: {category.parent_category_name})
                        </span>
                      )}
                    </div>
                    {category.description && (
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{category.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1">
                      {category.business_name ? (
                        <span className="text-xs text-gray-400">{category.business_name}</span>
                      ) : (
                        <span className="text-xs text-indigo-600">Global</span>
                      )}
                      <span className="text-xs text-gray-400">
                        {category.total_products} producto(s)
                      </span>
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded ${
                          category.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {category.is_active ? 'Activa' : 'Inactiva'}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(category.id);
                  }}
                  className="ml-2 px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded transition-colors"
                >
                  Desactivar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Paginación */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            Mostrando {((pagination.page - 1) * pagination.limit) + 1} a{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} de{' '}
            {pagination.total} categorías
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setFilters((prev) => ({ ...prev, page: prev.page - 1 }))}
              disabled={pagination.page === 1}
              className="px-3 py-1 text-xs border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Anterior
            </button>
            <button
              onClick={() => setFilters((prev) => ({ ...prev, page: prev.page + 1 }))}
              disabled={pagination.page >= pagination.totalPages}
              className="px-3 py-1 text-xs border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}

      {/* Formulario de edición/creación */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-normal text-gray-900">
                {isEditing ? 'Editar Categoría' : 'Nueva Categoría'}
              </h3>
              <button
                onClick={() => {
                  setShowForm(false);
                  setSelectedCategory(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Negocio (opcional para global)</label>
                <select
                  value={formData.business_id}
                  onChange={(e) => setFormData({ ...formData, business_id: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">Categoría Global</option>
                  {businesses.map((business) => (
                    <option key={business.id} value={business.id}>
                      {business.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">Nombre *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">Descripción</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">URL del Icono</label>
                <input
                  type="url"
                  value={formData.icon_url}
                  onChange={(e) => setFormData({ ...formData, icon_url: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">Categoría Padre (opcional)</label>
                <select
                  value={formData.parent_category_id}
                  onChange={(e) => setFormData({ ...formData, parent_category_id: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">Sin categoría padre</option>
                  {parentCategories
                    .filter((cat) => cat.id !== selectedCategory?.id)
                    .map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name} {category.business_name ? `(${category.business_name})` : '(Global)'}
                      </option>
                    ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Orden</label>
                  <input
                    type="number"
                    value={formData.display_order}
                    onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                    min="0"
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-500 mb-1">Estado</label>
                  <select
                    value={formData.is_active.toString()}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.value === 'true' })}
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="true">Activa</option>
                    <option value="false">Inactiva</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  onClick={handleSave}
                  disabled={saving || !formData.name}
                  className="flex-1 px-4 py-2 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
                <button
                  onClick={() => {
                    setShowForm(false);
                    setSelectedCategory(null);
                  }}
                  className="px-4 py-2 text-xs border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

