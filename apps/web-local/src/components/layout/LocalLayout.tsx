import { ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import { businessService } from '@/lib/business';
import Topbar from './Topbar';
import Sidebar from './Sidebar';
import BusinessSetupWizard from '../BusinessSetupWizard';

interface LocalLayoutProps {
  children: ReactNode;
}

export default function LocalLayout({ children }: LocalLayoutProps) {
  const { isAuthenticated, loading, token, user } = useAuth();
  const router = useRouter();
  const [checkingBusiness, setCheckingBusiness] = useState(true);
  const [hasBusiness, setHasBusiness] = useState(false);
  const [showWizard, setShowWizard] = useState(false);

  // Si no está autenticado Y ya terminó de cargar completamente, redirigir al login
  // Esto evita redirecciones prematuras mientras se carga desde localStorage
  // IMPORTANTE: useEffect debe llamarse antes de cualquier return condicional
  useEffect(() => {
    // Solo redirigir si realmente no hay sesión después de cargar
    if (!loading && !token && !user) {
      console.log('[LocalLayout] No hay sesión, redirigiendo al login');
      router.push('/auth/login');
    }
  }, [loading, token, user, router]);

  // Verificar si el usuario tiene un negocio configurado
  useEffect(() => {
    const checkBusiness = async () => {
      if (!loading && token && user) {
        try {
          setCheckingBusiness(true);
          console.log('[LocalLayout] Verificando negocio del usuario...', { userId: user.id, hasToken: !!token });
          const business = await businessService.getMyBusiness();
          console.log('[LocalLayout] Negocio encontrado:', !!business);
          setHasBusiness(!!business);
          if (!business) {
            setShowWizard(true);
          }
        } catch (error: any) {
          console.error('[LocalLayout] Error verificando negocio:', error);
          
          // Si es un error 401, redirigir al login
          if (error?.statusCode === 401) {
            console.log('[LocalLayout] Token inválido, redirigiendo al login');
            router.push('/auth/login');
            return;
          }
          
          // Si es un error 404, significa que no tiene negocio (esto es normal)
          if (error?.statusCode === 404) {
            console.log('[LocalLayout] Usuario no tiene negocio, mostrando wizard');
            setHasBusiness(false);
            setShowWizard(true);
          } else {
            // Otro tipo de error, asumimos que no tiene negocio
            setHasBusiness(false);
            setShowWizard(true);
          }
        } finally {
          setCheckingBusiness(false);
        }
      }
    };

    checkBusiness();
  }, [loading, token, user, router]);

  // Mostrar loading mientras se verifica autenticación o negocio
  if (loading || checkingBusiness) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  // Si no hay token ni usuario después de cargar, mostrar nada (useEffect redirigirá)
  if (!token && !user) {
    return null;
  }

  // Si hay token o usuario, mostrar el layout (incluso si isAuthenticated es false temporalmente)
  // Esto permite que la sesión se restaure sin redireccionar

  const handleWizardComplete = () => {
    setShowWizard(false);
    setHasBusiness(true);
    // Recargar la página para actualizar el estado
    window.location.reload();
  };

  return (
    <>
      {showWizard && !hasBusiness && (
        <BusinessSetupWizard onComplete={handleWizardComplete} />
      )}
      
      <div className="flex h-screen bg-gray-50">
        {/* Sidebar izquierdo */}
        <Sidebar />

        {/* Contenido principal */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Topbar */}
          <Topbar />

          {/* Contenido principal */}
          <main className="flex-1 overflow-y-auto p-6">
            {children}
          </main>
        </div>
      </div>
    </>
  );
}

