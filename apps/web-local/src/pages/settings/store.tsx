import Head from 'next/head';
import { useRouter } from 'next/router';
import LocalLayout from '@/components/layout/LocalLayout';
import { useState, useEffect } from 'react';
import { businessService, Business } from '@/lib/business';

export default function StoreSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [business, setBusiness] = useState<Business | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadBusiness = async () => {
      try {
        setLoading(true);
        const businessData = await businessService.getMyBusiness();
        setBusiness(businessData);
      } catch (err: any) {
        console.error('Error cargando negocio:', err);
        setError('Error al cargar la información de la tienda');
      } finally {
        setLoading(false);
      }
    };

    loadBusiness();
  }, []);

  if (loading) {
    return (
      <LocalLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      </LocalLayout>
    );
  }

  if (error || !business) {
    return (
      <LocalLayout>
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error || 'No se encontró información de la tienda'}</p>
          </div>
        </div>
      </LocalLayout>
    );
  }

  return (
    <>
      <Head>
        <title>Configuración de Tienda - LOCALIA Local</title>
      </Head>
      <LocalLayout>
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <button
              onClick={() => router.back()}
              className="text-sm text-gray-600 hover:text-gray-900 mb-4 flex items-center"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Volver a Configuración
            </button>
            <h1 className="text-3xl font-bold text-gray-900">Configuración de Tienda</h1>
            <p className="mt-2 text-sm text-gray-600">
              Gestiona la información básica de tu tienda
            </p>
          </div>

          {/* Store Information Card */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Información de la Tienda</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre de la Tienda
                </label>
                <p className="text-gray-900">{business.name}</p>
              </div>

              {business.legal_name && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre Legal
                  </label>
                  <p className="text-gray-900">{business.legal_name}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Categoría
                </label>
                <p className="text-gray-900">{business.category}</p>
              </div>

              {business.email && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <p className="text-gray-900">{business.email}</p>
                </div>
              )}

              {business.phone && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Teléfono
                  </label>
                  <p className="text-gray-900">{business.phone}</p>
                </div>
              )}

              {business.description && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Descripción
                  </label>
                  <p className="text-gray-900">{business.description}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Estado
                </label>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    business.is_active
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {business.is_active ? 'Activa' : 'Inactiva'}
                </span>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Verificación
                </label>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    business.is_verified
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}
                >
                  {business.is_verified ? 'Verificada' : 'Pendiente'}
                </span>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <button
                onClick={() => {
                  // TODO: Implementar edición de tienda
                  alert('Funcionalidad de edición próximamente');
                }}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Editar Información
              </button>
            </div>
          </div>
        </div>
      </LocalLayout>
    </>
  );
}

