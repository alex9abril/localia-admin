import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import AdminLayout from '@/components/layout/AdminLayout';
import { apiRequest } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';

declare global {
  interface Window {
    google: any;
    initMap: () => void;
  }
}

interface ServiceRegion {
  id: string;
  name: string;
  description?: string;
  city: string;
  state: string;
  country: string;
  center_longitude: number;
  center_latitude: number;
  is_active: boolean;
  is_default: boolean;
  max_delivery_radius_meters: number;
  min_order_amount: number | string; // Puede venir como string desde PostgreSQL
  coverage_area_geojson?: string;
  created_at: string;
  updated_at: string;
}

interface ServiceRegionsResponse {
  data: ServiceRegion[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface Statistics {
  total: number;
  active: number;
  inactive: number;
  default_count: number;
}

export default function ZonesPage() {
  const { token } = useAuth();
  const [regions, setRegions] = useState<ServiceRegion[]>([]);
  const [pagination, setPagination] = useState<{
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  } | null>(null);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedRegion, setSelectedRegion] = useState<ServiceRegion | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const [filters, setFilters] = useState({
    page: 1,
    limit: 20,
    isActive: undefined as boolean | undefined,
    isDefault: undefined as boolean | undefined,
    search: '',
  });

  // Cargar estadísticas
  useEffect(() => {
    const loadStatistics = async () => {
      try {
        const response = await apiRequest<Statistics>('/service-regions/statistics', {
          method: 'GET',
        });
        setStatistics(response);
      } catch (error) {
        console.error('Error cargando estadísticas:', error);
      }
    };

    if (token) {
      loadStatistics();
    }
  }, [token]);

  // Cargar zonas
  useEffect(() => {
    const loadRegions = async () => {
      if (!token) return;

      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.append('page', filters.page.toString());
        params.append('limit', filters.limit.toString());
        if (filters.isActive !== undefined) {
          params.append('isActive', filters.isActive.toString());
        }
        if (filters.isDefault !== undefined) {
          params.append('isDefault', filters.isDefault.toString());
        }
        if (filters.search) {
          params.append('search', filters.search);
        }

        const response = await apiRequest<ServiceRegionsResponse>(
          `/service-regions?${params.toString()}`,
          { method: 'GET' }
        );
        setRegions(response.data);
        setPagination(response.pagination);
      } catch (error) {
        console.error('Error cargando zonas:', error);
        setRegions([]);
      } finally {
        setLoading(false);
      }
    };

    loadRegions();
  }, [token, filters]);

  const handleFilterChange = (key: string, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  };

  const openMapModal = (region: ServiceRegion) => {
    setSelectedRegion(region);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedRegion(null);
    // Limpiar el mapa
    if (mapInstanceRef.current) {
      mapInstanceRef.current = null;
    }
    // Limpiar el contenido del div del mapa
    if (mapRef.current) {
      mapRef.current.innerHTML = '';
    }
  };

  // Cargar Google Maps API
  useEffect(() => {
    if (typeof window === 'undefined' || !process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) {
      return;
    }

    // Verificar si ya está cargado
    if (window.google && window.google.maps) {
      setIsMapLoaded(true);
      return;
    }

    // Verificar si el script ya existe
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existingScript) {
      // Esperar a que se cargue
      existingScript.addEventListener('load', () => setIsMapLoaded(true));
      return;
    }

    // Crear y cargar el script
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=drawing`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      console.log('✅ Google Maps API cargada');
      setIsMapLoaded(true);
    };
    script.onerror = () => {
      console.error('❌ Error cargando Google Maps API');
    };
    document.head.appendChild(script);
  }, []);

  // Inicializar el mapa cuando el modal se abre y el mapa está cargado
  useEffect(() => {
    if (!isModalOpen || !selectedRegion || !mapRef.current || !isMapLoaded) {
      return;
    }

    // Verificar nuevamente que Google Maps esté disponible
    if (typeof window === 'undefined' || !window.google || !window.google.maps) {
      console.error('Google Maps API no está disponible');
      return;
    }

    const region = selectedRegion;
    const center = {
      lat: Number(region.center_latitude),
      lng: Number(region.center_longitude),
    };

    console.log('🗺️ Inicializando mapa para:', region.name, center);

    // Crear el mapa
    const map = new window.google.maps.Map(mapRef.current, {
      center: center,
      zoom: 14,
      mapTypeId: 'roadmap',
    });

    mapInstanceRef.current = map;

    // Parsear GeoJSON del polígono
    if (region.coverage_area_geojson) {
      try {
        const geojson = JSON.parse(region.coverage_area_geojson);
        console.log('📍 Cargando polígono desde GeoJSON');

        // Crear polígono desde GeoJSON
        map.data.addGeoJson(geojson);

        // Estilo del polígono
        map.data.setStyle({
          fillColor: '#4F46E5',
          fillOpacity: 0.2,
          strokeColor: '#4F46E5',
          strokeWeight: 2,
          strokeOpacity: 0.8,
        });

        // Ajustar el zoom para mostrar todo el polígono
        const bounds = new window.google.maps.LatLngBounds();
        map.data.forEach(function (feature: any) {
          const geometry = feature.getGeometry();
          if (geometry) {
            geometry.forEachLatLng(function (latLng: any) {
              bounds.extend(latLng);
            });
          }
        });
        if (!bounds.isEmpty()) {
          map.fitBounds(bounds);
        }
      } catch (error) {
        console.error('❌ Error parseando GeoJSON:', error);

        // Si falla, mostrar un círculo aproximado basado en el radio
        const circle = new window.google.maps.Circle({
          strokeColor: '#4F46E5',
          strokeOpacity: 0.8,
          strokeWeight: 2,
          fillColor: '#4F46E5',
          fillOpacity: 0.2,
          map: map,
          center: center,
          radius: Number(region.max_delivery_radius_meters),
        });
        console.log('⭕ Mostrando círculo de radio:', region.max_delivery_radius_meters);
      }
    } else {
      // Si no hay GeoJSON, mostrar un círculo basado en el radio
      const circle = new window.google.maps.Circle({
        strokeColor: '#4F46E5',
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: '#4F46E5',
        fillOpacity: 0.2,
        map: map,
        center: center,
        radius: Number(region.max_delivery_radius_meters),
      });
      console.log('⭕ Mostrando círculo de radio:', region.max_delivery_radius_meters);
    }

    // Marcador en el centro
    new window.google.maps.Marker({
      position: center,
      map: map,
      title: region.name,
    });

    console.log('✅ Mapa inicializado correctamente');
  }, [isModalOpen, selectedRegion, isMapLoaded]);

  const totalPages = pagination?.totalPages || 0;

  return (
    <AdminLayout>
      <Head>
        <title>Zonas de Servicio - LOCALIA Admin</title>
      </Head>

      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-lg font-normal text-gray-900 mb-2">Zonas de Servicio</h1>
          <p className="text-xs text-gray-600">
            Gestiona las zonas geográficas donde el servicio está disponible
          </p>
        </div>

        {/* Estadísticas */}
        {statistics && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-xs text-gray-600 mb-1">Total de Zonas</p>
              <p className="text-lg font-normal text-gray-900">{statistics.total}</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-xs text-gray-600 mb-1">Activas</p>
              <p className="text-lg font-normal text-green-600">{statistics.active}</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-xs text-gray-600 mb-1">Inactivas</p>
              <p className="text-lg font-normal text-red-600">{statistics.inactive}</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-xs text-gray-600 mb-1">Por Defecto</p>
              <p className="text-lg font-normal text-blue-600">{statistics.default_count}</p>
            </div>
          </div>
        )}

        {/* Filtros */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4 flex flex-wrap gap-4 items-center">
          <input
            type="text"
            placeholder="Buscar zonas..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            className="px-3 py-2 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 flex-1 max-w-xs"
          />
          <select
            value={filters.isActive === undefined ? '' : filters.isActive.toString()}
            onChange={(e) =>
              handleFilterChange('isActive', e.target.value === '' ? undefined : e.target.value === 'true')
            }
            className="px-3 py-2 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">Estado</option>
            <option value="true">Activa</option>
            <option value="false">Inactiva</option>
          </select>
          <select
            value={filters.isDefault === undefined ? '' : filters.isDefault.toString()}
            onChange={(e) =>
              handleFilterChange('isDefault', e.target.value === '' ? undefined : e.target.value === 'true')
            }
            className="px-3 py-2 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">Por Defecto</option>
            <option value="true">Sí</option>
            <option value="false">No</option>
          </select>
        </div>

        {/* Tabla de Zonas */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-normal text-gray-500 uppercase tracking-wider">
                  Zona
                </th>
                <th className="px-4 py-3 text-left text-xs font-normal text-gray-500 uppercase tracking-wider">
                  Ubicación
                </th>
                <th className="px-4 py-3 text-left text-xs font-normal text-gray-500 uppercase tracking-wider">
                  Radio Máximo
                </th>
                <th className="px-4 py-3 text-left text-xs font-normal text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-4 py-3 text-center text-xs font-normal text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-4 text-xs text-gray-500">
                    Cargando zonas...
                  </td>
                </tr>
              ) : regions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-4 text-xs text-gray-500">
                    No se encontraron zonas.
                  </td>
                </tr>
              ) : (
                regions.map((region) => (
                  <tr key={region.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div>
                        <p className="text-xs font-normal text-gray-900">{region.name}</p>
                        {region.description && (
                          <p className="text-xs text-gray-500 max-w-xs truncate">
                            {region.description}
                          </p>
                        )}
                        {region.is_default && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-blue-100 text-blue-800 mt-1">
                            Por Defecto
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <p className="text-xs text-gray-900">
                        {region.city}, {region.state}
                      </p>
                      <p className="text-xs text-gray-500">{region.country}</p>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <p className="text-xs text-gray-900">
                        {(region.max_delivery_radius_meters / 1000).toFixed(1)} km
                      </p>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs rounded-full ${
                          region.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {region.is_active ? 'Activa' : 'Inactiva'}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center text-xs font-normal">
                      <button
                        onClick={() => openMapModal(region)}
                        className="text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1"
                        title="Ver en mapa"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                        </svg>
                        Ver Mapa
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="flex justify-between items-center mt-4">
            <button
              onClick={() => handleFilterChange('page', filters.page - 1)}
              disabled={filters.page === 1}
              className="px-4 py-2 text-xs font-normal rounded-md bg-gray-200 text-gray-700 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Anterior
            </button>
            <span className="text-xs text-gray-700">
              Página {filters.page} de {totalPages}
            </span>
            <button
              onClick={() => handleFilterChange('page', filters.page + 1)}
              disabled={filters.page === totalPages}
              className="px-4 py-2 text-xs font-normal rounded-md bg-gray-200 text-gray-700 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Siguiente
            </button>
          </div>
        )}
      </div>

      {/* Modal con Google Maps */}
      <Transition appear show={isModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={closeModal}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-25" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-6xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-normal leading-6 text-gray-900 mb-4"
                  >
                    {selectedRegion?.name} - Mapa de Cobertura
                  </Dialog.Title>

                  {selectedRegion && (
                    <div className="mt-4">
                      <div className="mb-4 text-xs text-gray-600">
                        <p>
                          <strong>Ubicación:</strong> {selectedRegion.city}, {selectedRegion.state}, {selectedRegion.country}
                        </p>
                        <p>
                          <strong>Radio máximo:</strong> {(selectedRegion.max_delivery_radius_meters / 1000).toFixed(1)} km
                        </p>
                        <p>
                          <strong>Monto mínimo:</strong> ${Number(selectedRegion.min_order_amount).toFixed(2)}
                        </p>
                      </div>

                      {!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ? (
                        <div className="w-full h-[600px] rounded-lg border border-gray-200 flex items-center justify-center bg-gray-50">
                          <p className="text-xs text-gray-500">
                            Google Maps API Key no configurada. Agrega NEXT_PUBLIC_GOOGLE_MAPS_API_KEY en tu archivo .env
                          </p>
                        </div>
                      ) : !isMapLoaded ? (
                        <div className="w-full h-[600px] rounded-lg border border-gray-200 flex items-center justify-center bg-gray-50">
                          <div className="text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-2"></div>
                            <p className="text-xs text-gray-500">Cargando mapa...</p>
                          </div>
                        </div>
                      ) : (
                        <div
                          ref={mapRef}
                          className="w-full h-[600px] rounded-lg border border-gray-200"
                          style={{ minHeight: '600px' }}
                        />
                      )}
                    </div>
                  )}

                  <div className="mt-6 flex justify-end">
                    <button
                      type="button"
                      className="px-4 py-2 text-xs font-normal rounded-md bg-gray-200 text-gray-700 hover:bg-gray-300"
                      onClick={closeModal}
                    >
                      Cerrar
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </AdminLayout>
  );
}

