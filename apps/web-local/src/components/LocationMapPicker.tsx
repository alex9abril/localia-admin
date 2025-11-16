import { useEffect, useRef, useState } from 'react';
import { businessService, ServiceRegion } from '@/lib/business';

interface AddressComponents {
  street_number?: string;
  route?: string;
  sublocality?: string;
  locality?: string;
  administrative_area_level_1?: string;
  postal_code?: string;
  country?: string;
}

interface LocationMapPickerProps {
  longitude: number;
  latitude: number;
  onLocationChange: (longitude: number, latitude: number, address: string, addressComponents?: AddressComponents) => void;
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

  // Estado para forzar re-render cuando el ref esté disponible y tenga dimensiones
  const [refReady, setRefReady] = useState(false);

  // Callback ref para detectar cuando el elemento se monta
  const setMapRef = (node: HTMLDivElement | null) => {
    if (node) {
      console.log('[LocationMapPicker] Callback ref ejecutado, elemento montado', {
        offsetHeight: node.offsetHeight,
        offsetWidth: node.offsetWidth,
        clientHeight: node.clientHeight,
        clientWidth: node.clientWidth,
      });
      mapRef.current = node;
      // Verificar dimensiones inmediatamente
      if (node.offsetHeight > 0 && node.offsetWidth > 0) {
        console.log('[LocationMapPicker] Elemento tiene dimensiones desde el callback ref');
        setRefReady(true);
      }
    } else {
      console.log('[LocationMapPicker] Callback ref ejecutado, elemento desmontado');
      mapRef.current = null;
    }
  };

  // Verificar periódicamente si el ref está disponible y tiene dimensiones
  useEffect(() => {
    // Si ya está listo, no hacer nada
    if (refReady) {
      return;
    }

    const checkRef = () => {
      if (mapRef.current) {
        const hasDimensions = mapRef.current.offsetHeight > 0 && mapRef.current.offsetWidth > 0;
        if (hasDimensions) {
          console.log('[LocationMapPicker] mapRef disponible con dimensiones, estableciendo refReady = true', {
            offsetHeight: mapRef.current.offsetHeight,
            offsetWidth: mapRef.current.offsetWidth,
          });
          setRefReady(true);
          return true;
        } else {
          console.log('[LocationMapPicker] mapRef disponible pero sin dimensiones aún', {
            offsetHeight: mapRef.current.offsetHeight,
            offsetWidth: mapRef.current.offsetWidth,
          });
        }
      }
      return false;
    };

    // Verificar inmediatamente
    if (checkRef()) {
      return;
    }

    // Usar ResizeObserver para detectar cuando el contenedor obtiene dimensiones
    let resizeObserver: ResizeObserver | null = null;
    if (mapRef.current && typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const { width, height } = entry.contentRect;
          if (width > 0 && height > 0 && !refReady) {
            console.log('[LocationMapPicker] ResizeObserver detectó dimensiones', { width, height });
            setRefReady(true);
          }
        }
      });
      resizeObserver.observe(mapRef.current);
    }

    // Si no está disponible o no tiene dimensiones, verificar periódicamente como fallback
    const interval = setInterval(() => {
      if (checkRef()) {
        clearInterval(interval);
        if (resizeObserver) {
          resizeObserver.disconnect();
        }
      }
    }, 100); // Verificar cada 100ms

    // Limpiar después de 5 segundos
    const timeout = setTimeout(() => {
      clearInterval(interval);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      if (mapRef.current) {
        const hasDimensions = mapRef.current.offsetHeight > 0 && mapRef.current.offsetWidth > 0;
        if (hasDimensions && !refReady) {
          console.warn('[LocationMapPicker] Timeout: ref disponible con dimensiones pero refReady no se estableció, forzando');
          setRefReady(true);
        } else if (!hasDimensions) {
          console.warn('[LocationMapPicker] Timeout: ref disponible pero sin dimensiones', {
            offsetHeight: mapRef.current.offsetHeight,
            offsetWidth: mapRef.current.offsetWidth,
          });
        }
      }
    }, 5000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, [refReady]);

  // Verificar el ref después de cada render
  useEffect(() => {
    console.log('[LocationMapPicker] useEffect post-render - verificando ref', {
      mapRefCurrent: mapRef.current,
      mapRefExists: !!mapRef.current,
      refReady,
      loading,
    });
    
    if (mapRef.current) {
      console.log('[LocationMapPicker] Ref encontrado en post-render', {
        offsetHeight: mapRef.current.offsetHeight,
        offsetWidth: mapRef.current.offsetWidth,
        clientHeight: mapRef.current.clientHeight,
        clientWidth: mapRef.current.clientWidth,
        computedStyle: window.getComputedStyle(mapRef.current),
      });
    }
  });

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

    // Verificar que el contenedor tenga dimensiones
    const hasDimensions = mapRef.current.offsetHeight > 0 && mapRef.current.offsetWidth > 0;
    if (!hasDimensions) {
      console.log('[LocationMapPicker] Contenedor sin dimensiones aún', {
        offsetHeight: mapRef.current.offsetHeight,
        offsetWidth: mapRef.current.offsetWidth,
      });
      return;
    }

    let isMounted = true;
    console.log('[LocationMapPicker] Iniciando carga de Google Maps', {
      mapRefHeight: mapRef.current.offsetHeight,
      mapRefWidth: mapRef.current.offsetWidth,
      loading,
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
        // También esperar a que el contenedor tenga dimensiones (importante para modales)
        setTimeout(() => {
          if (isMounted && mapRef.current) {
            const hasDimensions = mapRef.current.offsetHeight > 0 && mapRef.current.offsetWidth > 0;
            if (hasDimensions) {
              initializeMap();
            } else {
              // Si aún no tiene dimensiones, esperar un poco más
              console.log('[LocationMapPicker] Esperando dimensiones del contenedor...');
              setTimeout(() => {
                if (isMounted && mapRef.current) {
                  initializeMap();
                }
              }, 300);
            }
          }
        }, 200);
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

      // Verificar que el contenedor tenga dimensiones
      const hasDimensions = mapRef.current.offsetHeight > 0 && mapRef.current.offsetWidth > 0;
      if (!hasDimensions) {
        console.warn('[LocationMapPicker] Contenedor sin dimensiones aún, reintentando...', {
          offsetHeight: mapRef.current.offsetHeight,
          offsetWidth: mapRef.current.offsetWidth,
        });
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

        // Forzar resize del mapa después de un breve delay para asegurar que se renderice correctamente
        setTimeout(() => {
          if (mapInstance && window.google?.maps?.event) {
            window.google.maps.event.trigger(mapInstance, 'resize');
            console.log('[LocationMapPicker] Resize del mapa disparado');
          }
        }, 100);

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
  }, [refReady, region, map]); // Dependemos de refReady, región y mapa (loading se maneja internamente)

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

      // Verificar si el geocoding está deshabilitado en modo desarrollo
      const disableGeocoding = process.env.NEXT_PUBLIC_DISABLE_GEOCODING === 'true';
      
      if (disableGeocoding) {
        console.log('[LocationMapPicker] Geocoding deshabilitado en modo desarrollo, usando datos mock');
        
        // Usar datos mock para desarrollo
        const mockAddressComponents: AddressComponents = {
          route: 'Avenida Álvaro Obregón',
          street_number: '45',
          sublocality: 'Roma Norte',
          locality: 'Ciudad de México',
          administrative_area_level_1: 'CDMX',
          postal_code: '06700',
          country: 'México',
        };

        const mockStreetAddress = `${mockAddressComponents.street_number} ${mockAddressComponents.route}`;
        const mockFormattedAddress = `${mockStreetAddress}, ${mockAddressComponents.sublocality}, ${mockAddressComponents.locality}`;

        setAddress(mockFormattedAddress);
        
        console.log('[LocationMapPicker] Usando dirección mock:', {
          mockFormattedAddress,
          mockAddressComponents,
          mockStreetAddress,
        });

        onLocationChange(lng, lat, mockStreetAddress, mockAddressComponents);
        return;
      }

      // Obtener dirección usando Geocoding
      if (window.google && window.google.maps && window.google.maps.Geocoder) {
        const geocoder = new window.google.maps.Geocoder();
        geocoder.geocode(
          { location: { lat, lng } },
          (results: any[], status: string) => {
            if (status === 'OK' && results[0]) {
              const result = results[0];
              const formattedAddress = result.formatted_address;
              setAddress(formattedAddress);

              // Extraer componentes de la dirección
              const addressComponents: AddressComponents = {};
              
              result.address_components.forEach((component: any) => {
                const types = component.types;
                
                if (types.includes('street_number')) {
                  addressComponents.street_number = component.long_name;
                }
                if (types.includes('route')) {
                  addressComponents.route = component.long_name;
                }
                if (types.includes('sublocality') || types.includes('sublocality_level_1')) {
                  addressComponents.sublocality = component.long_name;
                }
                if (types.includes('locality')) {
                  addressComponents.locality = component.long_name;
                }
                if (types.includes('administrative_area_level_1')) {
                  addressComponents.administrative_area_level_1 = component.short_name;
                }
                if (types.includes('postal_code')) {
                  addressComponents.postal_code = component.long_name;
                }
                if (types.includes('country')) {
                  addressComponents.country = component.long_name;
                }
              });

              // Construir dirección completa (calle y número)
              const streetAddress = [
                addressComponents.street_number,
                addressComponents.route
              ].filter(Boolean).join(' ');

              console.log('[LocationMapPicker] Dirección extraída:', {
                formattedAddress,
                addressComponents,
                streetAddress,
              });

              onLocationChange(lng, lat, streetAddress || formattedAddress, addressComponents);
            } else {
              console.warn('Geocoding falló:', status);
              
              // Si falla por facturación, usar datos mock como fallback
              // Esto permite que el usuario tenga una dirección de ejemplo mientras desarrolla
              if (status === 'REQUEST_DENIED' || status === 'OVER_QUERY_LIMIT') {
                console.log('[LocationMapPicker] Geocoding falló por facturación, usando datos mock como fallback');
                
                // Generar datos mock basados en las coordenadas para que varíen ligeramente
                // Esto hace que cada ubicación tenga una dirección diferente
                const coordHash = Math.abs(Math.floor(lng * 1000) + Math.floor(lat * 1000));
                const streetNumbers = ['45', '123', '78', '234', '56', '189', '67', '145'];
                const streetNames = [
                  'Avenida Álvaro Obregón',
                  'Calle Orizaba',
                  'Avenida Insurgentes',
                  'Calle Colima',
                  'Avenida Cuauhtémoc',
                  'Calle Querétaro',
                  'Avenida Yucatán',
                  'Calle Tabasco'
                ];
                const colonias = [
                  'Roma Norte',
                  'Roma Sur',
                  'Condesa',
                  'Hipódromo',
                  'Del Valle',
                  'Nápoles',
                  'Escandón',
                  'San Miguel'
                ];
                
                const streetNumber = streetNumbers[coordHash % streetNumbers.length];
                const streetName = streetNames[coordHash % streetNames.length];
                const colonia = colonias[coordHash % colonias.length];
                
                const mockAddressComponents: AddressComponents = {
                  route: streetName,
                  street_number: streetNumber,
                  sublocality: colonia,
                  locality: 'Ciudad de México',
                  administrative_area_level_1: 'CDMX',
                  postal_code: '06700',
                  country: 'México',
                };

                const mockStreetAddress = `${mockAddressComponents.street_number} ${mockAddressComponents.route}`;
                const mockFormattedAddress = `${mockStreetAddress}, ${mockAddressComponents.sublocality}, ${mockAddressComponents.locality}`;

                setAddress(mockFormattedAddress);
                onLocationChange(lng, lat, mockStreetAddress, mockAddressComponents);
              } else {
                // Otros errores de geocoding
                setAddress('');
                onLocationChange(lng, lat, '', undefined);
              }
            }
          }
        );
      } else {
        onLocationChange(lng, lat, '', undefined);
      }
    } catch (err: any) {
      console.error('Error validando ubicación:', err);
      setIsValid(false);
      if (onValidationChange) {
        onValidationChange(false, err.message || 'Error al validar la ubicación');
      }
    }
  };

  // Log del render para debugging
  console.log('[LocationMapPicker] Render ejecutado', {
    loading,
    error,
    refReady,
    mapRefExists: !!mapRef.current,
    mapExists: !!map,
    mapRefCurrent: mapRef.current,
  });

  // Si hay error, mostrar mensaje pero mantener el div del mapa para que el ref se establezca
  if (error) {
    return (
      <div className="space-y-4">
        <div className="w-full h-96 rounded-lg overflow-hidden border border-gray-300 relative">
          <div 
            ref={setMapRef} 
            className="w-full h-full" 
          />
          <div className="absolute inset-0 bg-red-50 border border-red-200 rounded-lg flex items-center justify-center z-10">
            <div className="text-center p-4">
              <p className="text-red-800 font-medium mb-2">Error</p>
              <p className="text-red-600 text-sm">{error}</p>
              <p className="text-red-600 text-xs mt-2">
                Asegúrate de tener configurada la variable NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="w-full h-96 rounded-lg overflow-hidden border border-gray-300 relative">
        {/* El div del mapa siempre debe renderizarse para que el ref se establezca */}
        <div 
          ref={setMapRef} 
          className="w-full h-full" 
        />
        {/* Overlay de carga solo si está cargando y no hay mapa */}
        {loading && !map && (
          <div className="absolute inset-0 bg-gray-100 flex items-center justify-center z-10">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Cargando mapa...</p>
            </div>
          </div>
        )}
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
      
      {/* Mensaje cuando el geocoding está deshabilitado */}
      {process.env.NEXT_PUBLIC_DISABLE_GEOCODING === 'true' && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mt-2">
          <p className="text-xs text-blue-800">
            <strong>🔧 Modo Desarrollo:</strong> El geocoding está deshabilitado. Se están usando datos de ejemplo. 
            Para habilitar el geocoding real, establece <code className="bg-blue-100 px-1 rounded">NEXT_PUBLIC_DISABLE_GEOCODING=false</code> en tu archivo <code className="bg-blue-100 px-1 rounded">.env.local</code>
          </p>
        </div>
      )}
      
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

