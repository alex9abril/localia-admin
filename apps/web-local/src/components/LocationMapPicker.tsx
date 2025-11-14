import { useEffect, useRef, useState } from 'react';
import { businessService, ServiceRegion } from '@/lib/business';

interface LocationMapPickerProps {
  longitude: number;
  latitude: number;
  onLocationChange: (longitude: number, latitude: number, address: string) => void;
  onValidationChange?: (isValid: boolean, message?: string) => void;
}

declare global {
  interface Window {
    google: any;
    initMap: () => void;
    __googleMapsLoaded?: boolean;
    __googleMapsLoading?: Promise<void>;
  }
}

export default function LocationMapPicker({
  longitude,
  latitude,
  onLocationChange,
  onValidationChange,
}: LocationMapPickerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<any>(null);
  const [marker, setMarker] = useState<any>(null);
  const [region, setRegion] = useState<ServiceRegion | null>(null);
  const [coveragePolygon, setCoveragePolygon] = useState<any>(null);
  const [isValid, setIsValid] = useState<boolean>(false);
  const [address, setAddress] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  // Estado para forzar re-render cuando el ref esté disponible
  const [refReady, setRefReady] = useState(false);

  // Verificar periódicamente si el ref está disponible (para renderizado condicional)
  useEffect(() => {
    // Si ya está listo, no hacer nada
    if (refReady) {
      return;
    }

    const checkRef = () => {
      if (mapRef.current) {
        console.log('[LocationMapPicker] mapRef disponible, estableciendo refReady = true', {
          offsetHeight: mapRef.current.offsetHeight,
          offsetWidth: mapRef.current.offsetWidth,
        });
        setRefReady(true);
        return true;
      }
      return false;
    };

    // Verificar inmediatamente
    if (checkRef()) {
      return;
    }

    // Si no está disponible, verificar periódicamente
    const interval = setInterval(() => {
      if (checkRef()) {
        clearInterval(interval);
      }
    }, 50); // Verificar cada 50ms

    // Limpiar después de 3 segundos
    const timeout = setTimeout(() => {
      clearInterval(interval);
      if (mapRef.current && !refReady) {
        console.warn('[LocationMapPicker] Timeout: ref disponible pero refReady no se estableció, forzando');
        setRefReady(true);
      }
    }, 3000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [refReady]);

  // Cargar región activa
  useEffect(() => {
    const loadRegion = async () => {
      try {
        const activeRegion = await businessService.getActiveRegion();
        if (activeRegion) {
          setRegion(activeRegion);
        }
      } catch (err) {
        console.error('Error cargando región:', err);
      }
    };
    loadRegion();
  }, []);

  // Cargar Google Maps cuando el ref esté disponible
  useEffect(() => {
    console.log('[LocationMapPicker] useEffect ejecutado', {
      refReady,
      mapRefExists: !!mapRef.current,
      mapExists: !!map,
      loading,
    });

    // Si el mapa ya existe, no hacer nada
    if (map) {
      console.log('[LocationMapPicker] Mapa ya existe, saltando inicialización');
      return;
    }

    // Si el ref no está listo, esperar
    if (!refReady || !mapRef.current) {
      console.log('[LocationMapPicker] Ref no está listo aún', { refReady, mapRefExists: !!mapRef.current });
      return;
    }

    // Si ya no estamos cargando, no reiniciar
    if (!loading) {
      console.log('[LocationMapPicker] Ya no estamos en estado de carga');
      return;
    }

    let isMounted = true;
    console.log('[LocationMapPicker] Iniciando carga de Google Maps', {
      mapRefHeight: mapRef.current.offsetHeight,
      mapRefWidth: mapRef.current.offsetWidth,
    });

    const loadGoogleMaps = async () => {
      // Verificar que el ref esté disponible
      if (!mapRef.current) {
        console.warn('[LocationMapPicker] mapRef.current no disponible en loadGoogleMaps');
        return;
      }

      console.log('[LocationMapPicker] Contenedor listo, iniciando carga de Google Maps', {
        mapRefHeight: mapRef.current.offsetHeight,
        mapRefWidth: mapRef.current.offsetWidth,
      });

      // Verificar si Google Maps ya está cargado
      if (window.google && window.google.maps) {
        setTimeout(() => {
          if (isMounted) {
            initializeMap();
          }
        }, 100);
        return;
      }

      // Si ya hay una carga en progreso, esperar a que termine
      if (window.__googleMapsLoading) {
        try {
          await window.__googleMapsLoading;
          if (isMounted && window.google && window.google.maps) {
            setTimeout(() => {
              if (isMounted) {
                initializeMap();
              }
            }, 100);
          }
        } catch (err) {
          if (isMounted) {
            setError('Error al cargar Google Maps');
            setLoading(false);
          }
        }
        return;
      }

      // Verificar API key
      // En Next.js, las variables NEXT_PUBLIC_* están disponibles en el cliente
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || 
                     (typeof window !== 'undefined' && (window as any).__NEXT_DATA__?.env?.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY);
      
      console.log('[LocationMapPicker] Verificando API key:', {
        hasApiKey: !!apiKey,
        apiKeyLength: apiKey?.length || 0,
        apiKeyPrefix: apiKey?.substring(0, 10) || 'N/A',
        allEnvKeys: Object.keys(process.env).filter(k => k.includes('GOOGLE') || k.includes('MAPS')),
      });
      
      if (!apiKey) {
        console.error('[LocationMapPicker] API key no encontrada. Variables de entorno disponibles:', {
          NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
          GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY,
          allNextPublic: Object.keys(process.env).filter(k => k.startsWith('NEXT_PUBLIC_')),
        });
        if (isMounted) {
          setError('Google Maps API key no configurada. Agrega NEXT_PUBLIC_GOOGLE_MAPS_API_KEY en tu archivo .env.local y reinicia el servidor');
          setLoading(false);
        }
        return;
      }

      // Crear promesa para cargar Google Maps (singleton)
      const loadPromise = new Promise<void>((resolve, reject) => {
        // Verificar si el script ya existe
        const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
        if (existingScript) {
          // Si el script existe pero Google Maps no está cargado, esperar
          const checkInterval = setInterval(() => {
            if (window.google && window.google.maps) {
              clearInterval(checkInterval);
              window.__googleMapsLoaded = true;
              resolve();
            }
          }, 100);

          // Timeout después de 10 segundos
          setTimeout(() => {
            clearInterval(checkInterval);
            if (!window.google || !window.google.maps) {
              reject(new Error('Timeout esperando Google Maps'));
            }
          }, 10000);
          return;
        }

        // Cargar el script de Google Maps
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry&loading=async`;
        script.async = true;
        script.defer = true;
        script.onload = () => {
          window.__googleMapsLoaded = true;
          resolve();
        };
        script.onerror = () => {
          window.__googleMapsLoading = undefined;
          reject(new Error('Error al cargar Google Maps. Verifica tu API key.'));
        };
        document.head.appendChild(script);
      });

      // Guardar la promesa para que otros componentes puedan esperarla
      window.__googleMapsLoading = loadPromise;

      try {
        await loadPromise;
        // Esperar un momento para asegurar que el ref esté disponible
        // y que React haya renderizado el componente
        setTimeout(() => {
          if (isMounted) {
            initializeMap();
          }
        }, 100);
      } catch (err: any) {
        window.__googleMapsLoading = undefined;
        if (isMounted) {
          setError(err.message || 'Error al cargar Google Maps');
          setLoading(false);
        }
      }
    };

    const initializeMap = () => {
      // Verificar que el ref esté disponible
      if (!mapRef.current) {
        console.warn('[LocationMapPicker] mapRef no está disponible aún, reintentando...');
        // Reintentar después de un breve delay
        setTimeout(() => {
          if (isMounted && mapRef.current && window.google && window.google.maps) {
            initializeMap();
          }
        }, 200);
        return;
      }

      if (!window.google || !window.google.maps) {
        console.warn('[LocationMapPicker] Google Maps no está cargado aún');
        return;
      }

      // Si el mapa ya existe, no reinicializar
      if (map) {
        console.log('Mapa ya inicializado, actualizando posición del marcador');
        if (marker) {
          marker.setPosition({ lat: latitude, lng: longitude });
          validateAndUpdateLocation(longitude, latitude);
        }
        return;
      }

      try {
        // Crear el mapa centrado en la región activa o en las coordenadas proporcionadas
        const center = region
          ? { lat: region.center_latitude, lng: region.center_longitude }
          : { lat: latitude, lng: longitude };

        console.log('[LocationMapPicker] Creando instancia del mapa', {
          center,
          zoom: region ? 14 : 13,
          mapRefSize: {
            width: mapRef.current.offsetWidth,
            height: mapRef.current.offsetHeight,
          },
        });

        const mapInstance = new window.google.maps.Map(mapRef.current, {
          center,
          zoom: region ? 14 : 13,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
        });

        console.log('[LocationMapPicker] Instancia del mapa creada');
        setMap(mapInstance);

        // Dibujar polígono de cobertura si hay región
        if (region && region.coverage_area_geojson) {
          try {
            const geoJson = JSON.parse(region.coverage_area_geojson);
            if (window.google.maps.Data) {
              const polygon = new window.google.maps.Data({
                map: mapInstance,
              });
              polygon.addGeoJson(geoJson);
              polygon.setStyle({
                fillColor: '#3B82F6',
                fillOpacity: 0.2,
                strokeColor: '#3B82F6',
                strokeWeight: 2,
              });
              setCoveragePolygon(polygon);
            }
          } catch (e) {
            console.error('Error dibujando polígono:', e);
          }
        }

        // Crear marcador inicial
        const markerInstance = new window.google.maps.Marker({
          position: { lat: latitude, lng: longitude },
          map: mapInstance,
          draggable: true,
          title: 'Arrastra para seleccionar la ubicación',
        });

        setMarker(markerInstance);

        // Actualizar ubicación cuando se arrastra el marcador
        markerInstance.addListener('dragend', async (e: any) => {
          const newLat = e.latLng.lat();
          const newLng = e.latLng.lng();
          
          // Validar ubicación
          await validateAndUpdateLocation(newLng, newLat);
        });

        // Actualizar ubicación cuando se hace clic en el mapa
        mapInstance.addListener('click', async (e: any) => {
          const newLat = e.latLng.lat();
          const newLng = e.latLng.lng();
          
          markerInstance.setPosition({ lat: newLat, lng: newLng });
          await validateAndUpdateLocation(newLng, newLat);
        });

        // Validar ubicación inicial (usar las props actuales)
        const currentLng = longitude;
        const currentLat = latitude;
        if (isMounted) {
          console.log('[LocationMapPicker] Mapa inicializado exitosamente');
          validateAndUpdateLocation(currentLng, currentLat);
          setLoading(false);
        }
      } catch (err) {
        console.error('Error inicializando mapa:', err);
        if (isMounted) {
          setError('Error al inicializar el mapa');
          setLoading(false);
        }
      }
    };

    // Iniciar carga cuando el ref esté disponible
    loadGoogleMaps();

    // Cleanup: limpiar listeners cuando el componente se desmonte
    return () => {
      isMounted = false;
      if (marker && window.google?.maps?.event) {
        try {
          window.google.maps.event.clearInstanceListeners(marker);
        } catch (e) {
          // Ignorar errores en cleanup
        }
      }
      if (map && window.google?.maps?.event) {
        try {
          window.google.maps.event.clearInstanceListeners(map);
        } catch (e) {
          // Ignorar errores en cleanup
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refReady, region, map, loading]); // Dependemos de refReady, región, mapa y loading

  // Actualizar marcador cuando cambian las coordenadas (sin reinicializar el mapa)
  useEffect(() => {
    if (map && marker && window.google?.maps) {
      marker.setPosition({ lat: latitude, lng: longitude });
      map.setCenter({ lat: latitude, lng: longitude });
      validateAndUpdateLocation(longitude, latitude);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [longitude, latitude]);

  const validateAndUpdateLocation = async (lng: number, lat: number) => {
    try {
      // Validar con el backend
      const validation = await businessService.validateLocation(lng, lat);
      
      setIsValid(validation.isValid);
      
      if (onValidationChange) {
        onValidationChange(validation.isValid, validation.message);
      }

      // Obtener dirección usando Geocoding
      if (window.google && window.google.maps && window.google.maps.Geocoder) {
        const geocoder = new window.google.maps.Geocoder();
        geocoder.geocode(
          { location: { lat, lng } },
          (results: any[], status: string) => {
            if (status === 'OK' && results[0]) {
              const formattedAddress = results[0].formatted_address;
              setAddress(formattedAddress);
              onLocationChange(lng, lat, formattedAddress);
            } else {
              console.warn('Geocoding falló:', status);
              setAddress('');
              onLocationChange(lng, lat, '');
            }
          }
        );
      } else {
        onLocationChange(lng, lat, '');
      }
    } catch (err: any) {
      console.error('Error validando ubicación:', err);
      setIsValid(false);
      if (onValidationChange) {
        onValidationChange(false, err.message || 'Error al validar la ubicación');
      }
    }
  };

  if (loading) {
    return (
      <div className="w-full h-96 bg-gray-100 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando mapa...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-96 bg-red-50 border border-red-200 rounded-lg flex items-center justify-center">
        <div className="text-center p-4">
          <p className="text-red-800 font-medium mb-2">Error</p>
          <p className="text-red-600 text-sm">{error}</p>
          <p className="text-red-600 text-xs mt-2">
            Asegúrate de tener configurada la variable NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="w-full h-96 rounded-lg overflow-hidden border border-gray-300">
        <div 
          ref={mapRef} 
          className="w-full h-full" 
        />
      </div>

      {/* Estado de validación */}
      {isValid ? (
        <div className="bg-green-50 border border-green-200 rounded-md p-3">
          <p className="text-sm text-green-800">
            <strong>✓ Ubicación válida:</strong> Tu negocio está dentro de la zona de cobertura (La Roma)
          </p>
        </div>
      ) : (
        <div className="bg-red-50 border border-red-200 rounded-md p-3">
          <p className="text-sm text-red-800">
            <strong>⚠ Ubicación fuera de zona:</strong> Por el momento solo operamos en La Roma, CDMX. 
            Por favor selecciona una ubicación dentro del área marcada en el mapa.
          </p>
        </div>
      )}

      {/* Dirección obtenida */}
      {address && (
        <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
          <p className="text-sm text-gray-700">
            <strong>Dirección:</strong> {address}
          </p>
        </div>
      )}

      <p className="text-xs text-gray-500">
        Arrastra el marcador o haz clic en el mapa para seleccionar la ubicación de tu negocio.
      </p>
      
      {!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mt-2">
          <p className="text-xs text-yellow-800">
            <strong>⚠️ Configuración requerida:</strong> Agrega <code className="bg-yellow-100 px-1 rounded">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> en tu archivo <code className="bg-yellow-100 px-1 rounded">.env.local</code>
          </p>
        </div>
      )}
    </div>
  );
}

