-- Script para verificar el polígono de la zona "La Roma"
-- y compararlo con el círculo de radio máximo

-- 1. Ver el polígono de la zona "La Roma" en formato GeoJSON
SELECT 
    sr.id,
    sr.name,
    ST_AsGeoJSON(sr.coverage_area)::TEXT as polygon_geojson,
    ST_AsText(sr.coverage_area) as polygon_text,
    (sr.center_point)[0]::DOUBLE PRECISION as center_longitude,
    (sr.center_point)[1]::DOUBLE PRECISION as center_latitude,
    sr.max_delivery_radius_meters,
    -- Calcular el área del polígono en km²
    ST_Area(sr.coverage_area::geography) / 1000000 as polygon_area_km2,
    -- Calcular el área del círculo de radio máximo en km²
    (PI() * POWER(sr.max_delivery_radius_meters::DOUBLE PRECISION / 1000, 2)) as circle_area_km2
FROM core.service_regions sr
WHERE sr.name = 'La Roma';

-- 2. Verificar si un punto de prueba está dentro del polígono vs dentro del círculo
-- Usar coordenadas de ejemplo dentro del círculo pero posiblemente fuera del polígono
SELECT 
    'Punto de prueba' as test_name,
    -99.1600 as test_longitude,
    19.4220 as test_latitude,
    -- Verificar si está dentro del polígono
    ST_Within(
        ST_SetSRID(ST_MakePoint(-99.1600, 19.4220), 4326),
        sr.coverage_area
    ) as is_within_polygon,
    -- Verificar si está dentro del círculo de radio máximo
    ST_DWithin(
        ST_SetSRID(ST_MakePoint(-99.1600, 19.4220)::geography, 4326),
        ST_SetSRID(ST_MakePoint(
            (sr.center_point)[0]::DOUBLE PRECISION,
            (sr.center_point)[1]::DOUBLE PRECISION
        )::geography, 4326),
        sr.max_delivery_radius_meters
    ) as is_within_circle
FROM core.service_regions sr
WHERE sr.name = 'La Roma';

-- 3. Ver las coordenadas del polígono (vértices)
SELECT 
    sr.name,
    ST_AsText(ST_ExteriorRing(sr.coverage_area)) as polygon_vertices
FROM core.service_regions sr
WHERE sr.name = 'La Roma';


