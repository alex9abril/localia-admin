/**
 * Página de detalle de pedido
 */

import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import MobileLayout from '@/components/layout/MobileLayout';
import { useAuth } from '@/contexts/AuthContext';
import { ordersService, Order } from '@/lib/orders';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import LocationOnIcon from '@mui/icons-material/LocationOn';

export default function OrderDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login');
      return;
    }
    if (id && typeof id === 'string') {
      loadOrder(id);
    }
  }, [id, isAuthenticated, authLoading, router]);

  const loadOrder = async (orderId: string) => {
    try {
      setLoading(true);
      const orderData = await ordersService.findOne(orderId);
      setOrder(orderData);
    } catch (error: any) {
      console.error('Error cargando pedido:', error);
      setError(error.message || 'Error al cargar el pedido');
    } finally {
      setLoading(false);
    }
  };

  const getStatusLabel = (status: string) => {
    const statusMap: Record<string, string> = {
      pending: 'Pendiente',
      confirmed: 'Confirmado',
      preparing: 'Preparando',
      ready: 'Listo',
      in_transit: 'En camino',
      delivered: 'Entregado',
      cancelled: 'Cancelado',
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-blue-100 text-blue-800',
      preparing: 'bg-orange-100 text-orange-800',
      ready: 'bg-purple-100 text-purple-800',
      in_transit: 'bg-indigo-100 text-indigo-800',
      delivered: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return colorMap[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <MobileLayout>
        <div className="text-center py-12">
          <p className="text-gray-500">Cargando pedido...</p>
        </div>
      </MobileLayout>
    );
  }

  if (error || !order) {
    return (
      <MobileLayout>
        <div className="text-center py-12">
          <p className="text-red-500 mb-4">{error || 'Pedido no encontrado'}</p>
          <button
            onClick={() => router.push('/profile')}
            className="px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            Ver Mis Pedidos
          </button>
        </div>
      </MobileLayout>
    );
  }

  return (
    <>
      <Head>
        <title>Pedido #{order.id.slice(0, 8)} - Localia</title>
      </Head>
      <MobileLayout>
        <div className="mb-6">
          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ArrowBackIcon className="w-5 h-5 text-gray-700" />
            </button>
            <h1 className="text-2xl font-bold text-black">Pedido #{order.id.slice(0, 8)}</h1>
          </div>

          {/* Estado del pedido */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Estado</span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                {getStatusLabel(order.status)}
              </span>
            </div>
            {order.status === 'pending' && (
              <div className="mt-3 p-3 bg-yellow-50 rounded-lg">
                <p className="text-sm text-yellow-800">
                  Tu pedido está siendo procesado. Te notificaremos cuando sea confirmado.
                </p>
              </div>
            )}
            {order.status === 'delivered' && (
              <div className="mt-3 flex items-center gap-2 text-green-600">
                <CheckCircleIcon className="w-5 h-5" />
                <p className="text-sm font-medium">Pedido entregado exitosamente</p>
              </div>
            )}
          </div>

          {/* Información del negocio */}
          {order.business_name && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4">
              <div className="flex items-center gap-3">
                {order.business_logo_url ? (
                  <img
                    src={order.business_logo_url}
                    alt={order.business_name}
                    className="w-12 h-12 rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center">
                    <RestaurantIcon className="text-gray-400" />
                  </div>
                )}
                <div>
                  <p className="font-semibold text-black">{order.business_name}</p>
                  <p className="text-xs text-gray-500">Negocio</p>
                </div>
              </div>
            </div>
          )}

          {/* Dirección de entrega */}
          {order.delivery_address_text && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4">
              <div className="flex items-start gap-3">
                <LocationOnIcon className="text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-1">Dirección de entrega</p>
                  <p className="text-sm text-gray-900">{order.delivery_address_text}</p>
                </div>
              </div>
            </div>
          )}

          {/* Items del pedido */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4">
            <h2 className="text-lg font-bold text-black mb-4">Items del Pedido</h2>
            <div className="space-y-3">
              {order.items?.map((item) => (
                <div key={item.id} className="flex items-start gap-3 pb-3 border-b border-gray-100 last:border-0 last:pb-0">
                  <div className="flex-1">
                    <p className="font-semibold text-black">{item.item_name}</p>
                    {item.variant_selection && Object.keys(item.variant_selection).length > 0 && (
                      <p className="text-xs text-gray-500 mt-1">
                        Variantes: {JSON.stringify(item.variant_selection)}
                      </p>
                    )}
                    {item.special_instructions && (
                      <p className="text-xs text-gray-500 italic mt-1">
                        "{item.special_instructions}"
                      </p>
                    )}
                    <p className="text-sm text-gray-600 mt-1">
                      Cantidad: {item.quantity} × ${parseFloat(String(item.item_price || 0)).toFixed(2)}
                    </p>
                  </div>
                  <p className="font-semibold text-black">
                    ${parseFloat(String(item.item_subtotal || 0)).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Resumen de montos */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4">
            <h2 className="text-lg font-bold text-black mb-4">Resumen</h2>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span className="text-black font-medium">${parseFloat(String(order.subtotal || 0)).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">IVA (16%)</span>
                <span className="text-black font-medium">${parseFloat(String(order.tax_amount || 0)).toFixed(2)}</span>
              </div>
              {parseFloat(String(order.delivery_fee || 0)) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Costo de envío</span>
                  <span className="text-black font-medium">${parseFloat(String(order.delivery_fee || 0)).toFixed(2)}</span>
                </div>
              )}
              {parseFloat(String(order.tip_amount || 0)) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Propina</span>
                  <span className="text-black font-medium">${parseFloat(String(order.tip_amount || 0)).toFixed(2)}</span>
                </div>
              )}
              <div className="border-t border-gray-200 pt-2 mt-2">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold text-black">Total</span>
                  <span className="text-2xl font-bold text-black">${parseFloat(String(order.total_amount || 0)).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Información de pago */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Método de pago</span>
              <span className="text-sm font-medium text-black">
                {order.payment_method === 'cash' ? 'Efectivo contra entrega' : order.payment_method}
              </span>
            </div>
            <div className="flex justify-between items-center mt-2">
              <span className="text-sm text-gray-600">Estado de pago</span>
              <span className={`text-sm font-medium ${
                order.payment_status === 'paid' ? 'text-green-600' :
                order.payment_status === 'pending' ? 'text-yellow-600' :
                'text-red-600'
              }`}>
                {order.payment_status === 'paid' ? 'Pagado' :
                 order.payment_status === 'pending' ? 'Pendiente' :
                 order.payment_status}
              </span>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="space-y-3">
            <button
              onClick={() => router.push('/profile')}
              className="w-full py-3 bg-gray-100 text-black rounded-lg hover:bg-gray-200 transition-colors font-medium"
            >
              Ver Mis Pedidos
            </button>
            {order.status === 'pending' && (
              <button
                onClick={() => {
                  if (confirm('¿Estás seguro de que quieres cancelar este pedido?')) {
                    // TODO: Implementar cancelación
                    alert('Cancelación próximamente');
                  }
                }}
                className="w-full py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium"
              >
                Cancelar Pedido
              </button>
            )}
          </div>
        </div>
      </MobileLayout>
    </>
  );
}

