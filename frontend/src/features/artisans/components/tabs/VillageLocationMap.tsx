import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface VillageLocationMapProps {
  latitude: number | string;
  longitude: number | string;
  villageName?: string;
  address?: string;
  district?: string;
  province?: string;
  onCoordinatesChange: (lat: number, lng: number) => void;
  disabled?: boolean;
}

// Fallback coordinate if none is specified (Center of Vietnam / Bat Trang)
const DEFAULT_CENTER: [number, number] = [20.9782412, 105.9126431];
const DEFAULT_ZOOM = 14;

// Custom SVG Pin Icon HTML for Leaflet DivIcon
const createCustomMarkerHtml = (isDragging: boolean) => `
  <div class="map-pin-pulse ${isDragging ? 'is-dragging' : ''}">
    <span class="pulse-ring"></span>
    <div class="pin-marker" style="transform: ${isDragging ? 'scale(1.2)' : 'scale(1)'}; transition: transform 0.15s ease;">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="#E11D48">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
      </svg>
    </div>
  </div>
`;

export const VillageLocationMap: React.FC<VillageLocationMapProps> = ({
  latitude,
  longitude,
  villageName,
  address,
  district,
  province,
  onCoordinatesChange,
  disabled = false,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  // Map state
  const [isSelectingMode, setIsSelectingMode] = useState<boolean>(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [isMapReady, setIsMapReady] = useState<boolean>(false);

  // Parse valid coordinates
  const latNum = typeof latitude === 'number' ? latitude : parseFloat(String(latitude));
  const lngNum = typeof longitude === 'number' ? longitude : parseFloat(String(longitude));
  const hasValidCoords =
    !isNaN(latNum) &&
    latNum >= -90 &&
    latNum <= 90 &&
    !isNaN(lngNum) &&
    lngNum >= -180 &&
    lngNum <= 180;

  const currentCoords: [number, number] = hasValidCoords
    ? [latNum, lngNum]
    : DEFAULT_CENTER;

  // Google Maps external link
  const googleMapsUrl = hasValidCoords
    ? `https://www.google.com/maps?q=${latNum},${lngNum}`
    : `https://www.google.com/maps?q=${DEFAULT_CENTER[0]},${DEFAULT_CENTER[1]}`;

  // Custom DivIcon for Leaflet
  const createDivIcon = useCallback((isDragging = false) => {
    return L.divIcon({
      className: 'craft-village-marker-wrapper',
      html: createCustomMarkerHtml(isDragging),
      iconSize: [32, 42],
      iconAnchor: [16, 42],
      popupAnchor: [0, -38],
    });
  }, []);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Prevent re-initialization if already exists
    if (mapInstanceRef.current) return;

    try {
      const map = L.map(mapContainerRef.current, {
        center: currentCoords,
        zoom: hasValidCoords ? DEFAULT_ZOOM : 12,
        zoomControl: false, // We'll add custom positioned zoom control
        attributionControl: true,
      });

      // Add Map Tile Layer: Google Roadmap raster tiles (extremely fast and reliable in Vietnam, full Vietnamese labels)
      const tileLayer = L.tileLayer('https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
        subdomains: ['0', '1', '2', '3'],
        maxZoom: 20,
        attribution: '&copy; Google Maps',
      });

      // Automatic fallback to CartoDB Voyager if Google tiles ever fail
      tileLayer.on('tileerror', () => {
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
          subdomains: ['a', 'b', 'c', 'd'],
          maxZoom: 19,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
        }).addTo(map);
      });

      tileLayer.addTo(map);

      // Add zoom control to top-right
      L.control
        .zoom({
          position: 'topright',
        })
        .addTo(map);

      // Create interactive draggable marker
      const marker = L.marker(currentCoords, {
        icon: createDivIcon(false),
        draggable: !disabled,
        title: villageName || 'Vị trí làng nghề',
      }).addTo(map);

      // Bind informative popup
      const locationText =
        address ||
        `${district ? `${district}, ` : ''}${province || 'Việt Nam'}`;

      const popupContent = `
        <div style="font-family: inherit; font-size: 13px; line-height: 1.4; color: #111827; min-width: 180px;">
          <strong style="display: block; font-size: 14px; color: #002720; margin-bottom: 3px;">
            ${villageName || 'Làng nghề truyền thống'}
          </strong>
          <span style="display: block; color: #4B5563; font-size: 12px; margin-bottom: 6px;">
            ${locationText}
          </span>
          <span style="display: inline-block; background: #FEE2E2; color: #991B1B; font-family: monospace; font-size: 11px; font-weight: 600; padding: 2px 6px; border-radius: 4px;">
            GPS: ${currentCoords[0].toFixed(6)}°, ${currentCoords[1].toFixed(6)}°
          </span>
        </div>
      `;
      marker.bindPopup(popupContent);

      // Marker drag events
      marker.on('dragstart', () => {
        marker.setIcon(createDivIcon(true));
      });

      marker.on('dragend', () => {
        marker.setIcon(createDivIcon(false));
        const pos = marker.getLatLng();
        const roundedLat = parseFloat(pos.lat.toFixed(6));
        const roundedLng = parseFloat(pos.lng.toFixed(6));
        onCoordinatesChange(roundedLat, roundedLng);
      });

      mapInstanceRef.current = map;
      markerRef.current = marker;
      setIsMapReady(true);

      const handleResize = () => {
        map.invalidateSize();
      };
      window.addEventListener('resize', handleResize);

      setTimeout(() => map.invalidateSize(), 100);
      setTimeout(() => map.invalidateSize(), 300);
      setTimeout(() => map.invalidateSize(), 600);

      return () => {
        window.removeEventListener('resize', handleResize);
        if (mapInstanceRef.current) {
          mapInstanceRef.current.remove();
          mapInstanceRef.current = null;
          markerRef.current = null;
        }
      };
    } catch (err: unknown) {
      console.error('Không thể khởi tạo Leaflet map:', err);
      setMapError('Không thể tải bản đồ trực quan. Bạn vẫn có thể nhập tọa độ thủ công bên dưới.');
    }
  }, []);

  // Update marker position and map center when coordinates change from inputs or API
  useEffect(() => {
    if (!mapInstanceRef.current || !markerRef.current || !hasValidCoords) return;

    const currentMarkerPos = markerRef.current.getLatLng();
    const isDifferent =
      Math.abs(currentMarkerPos.lat - latNum) > 0.000001 ||
      Math.abs(currentMarkerPos.lng - lngNum) > 0.000001;

    if (isDifferent) {
      markerRef.current.setLatLng([latNum, lngNum]);
      mapInstanceRef.current.panTo([latNum, lngNum], { animate: true, duration: 0.5 });

      // Update popup content with new coordinates
      const locationText =
        address ||
        `${district ? `${district}, ` : ''}${province || 'Việt Nam'}`;

      const popupContent = `
        <div style="font-family: inherit; font-size: 13px; line-height: 1.4; color: #111827; min-width: 180px;">
          <strong style="display: block; font-size: 14px; color: #002720; margin-bottom: 3px;">
            ${villageName || 'Làng nghề truyền thống'}
          </strong>
          <span style="display: block; color: #4B5563; font-size: 12px; margin-bottom: 6px;">
            ${locationText}
          </span>
          <span style="display: inline-block; background: #FEE2E2; color: #991B1B; font-family: monospace; font-size: 11px; font-weight: 600; padding: 2px 6px; border-radius: 4px;">
            GPS: ${latNum.toFixed(6)}°, ${lngNum.toFixed(6)}°
          </span>
        </div>
      `;
      markerRef.current.setPopupContent(popupContent);
    }
  }, [latNum, lngNum, hasValidCoords, villageName, address, district, province]);

  // Handle Map Click for Selection Mode
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    const handleMapClick = (e: L.LeafletMouseEvent) => {
      if (disabled) return;
      const { lat, lng } = e.latlng;
      const roundedLat = parseFloat(lat.toFixed(6));
      const roundedLng = parseFloat(lng.toFixed(6));

      // Move marker & update coordinates
      if (markerRef.current) {
        markerRef.current.setLatLng([roundedLat, roundedLng]);
      }
      onCoordinatesChange(roundedLat, roundedLng);

      // Turn off selection mode after picking if active
      if (isSelectingMode) {
        setIsSelectingMode(false);
      }
    };

    map.on('click', handleMapClick);

    return () => {
      map.off('click', handleMapClick);
    };
  }, [disabled, isSelectingMode, onCoordinatesChange]);

  // Update cursor based on selecting mode
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (isSelectingMode) {
      mapContainerRef.current.style.cursor = 'crosshair';
    } else {
      mapContainerRef.current.style.cursor = '';
    }
  }, [isSelectingMode]);

  // Pan to current marker
  const handleRecenter = () => {
    if (mapInstanceRef.current && hasValidCoords) {
      mapInstanceRef.current.setView([latNum, lngNum], DEFAULT_ZOOM, {
        animate: true,
      });
      if (markerRef.current) {
        markerRef.current.openPopup();
      }
    }
  };

  return (
    <div className="map-location-container">
      {mapError ? (
        <div className="map-error-card">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#DC2626"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <div>
            <h4 style={{ margin: 0, fontSize: '13px', color: '#991B1B' }}>Lỗi hiển thị bản đồ</h4>
            <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#6B7280' }}>{mapError}</p>
          </div>
        </div>
      ) : (
        <div className="interactive-map-wrapper">
          {/* Leaflet Map DOM Container */}
          <div
            ref={mapContainerRef}
            className={`village-leaflet-map ${isSelectingMode ? 'mode-selecting' : ''}`}
            tabIndex={0}
            role="region"
            aria-label="Bản đồ định vị làng nghề"
          />

          {/* Loading Skeleton */}
          {!isMapReady && (
            <div className="map-skeleton-overlay">
              <span className="pulse-ring" />
              <span style={{ fontSize: '13px', color: '#4B5563', fontWeight: 500 }}>
                Đang tải bản đồ vệ tinh / địa hình...
              </span>
            </div>
          )}

          {/* Top Info Card overlay */}
          <div className="map-label-card">
            <strong>{villageName || 'Vị trí làng nghề'}</strong>
            <span>
              {address ||
                `${district ? `${district}, ` : ''}${province || 'Việt Nam'}`}
            </span>
            <span className="gps-text">
              GPS:{' '}
              {hasValidCoords
                ? `${latNum.toFixed(6)}° N, ${lngNum.toFixed(6)}° E`
                : 'Chưa xác định tọa độ'}
            </span>
          </div>

          {/* Mode status indicator badge */}
          {isSelectingMode && (
            <div className="map-mode-indicator-pill">
              <span className="pulse-dot" />
              <span>Nhấp chuột vào bản đồ để chọn tọa độ mới</span>
            </div>
          )}

          {/* Bottom Right Controls Overlay */}
          <div className="map-controls-overlay">
            {/* Toggle Select Mode button */}
            <button
              type="button"
              className={`btn-map-action ${isSelectingMode ? 'active' : ''}`}
              onClick={() => setIsSelectingMode((prev) => !prev)}
              disabled={disabled}
              title="Nhấp vào bất kỳ đâu trên bản đồ để cập nhật tọa độ"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="16" />
                <line x1="8" y1="12" x2="16" y2="12" />
              </svg>
              <span>{isSelectingMode ? 'Đang chọn vị trí...' : 'Chọn vị trí trên bản đồ'}</span>
            </button>

            {/* Recenter button */}
            {hasValidCoords && (
              <button
                type="button"
                className="btn-map-action secondary"
                onClick={handleRecenter}
                title="Đưa bản đồ về vị trí ghim"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
                <span>Vị trí ghim</span>
              </button>
            )}

            {/* Google Maps link */}
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noreferrer"
              className="btn-map-action secondary"
              title="Mở tọa độ làng nghề trên Google Maps"
              aria-label="Mở tọa độ làng nghề trên Google Maps trong tab mới"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#2563EB"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
                <line x1="8" y1="2" x2="8" y2="18" />
                <line x1="16" y1="6" x2="16" y2="22" />
              </svg>
              <span>Xem trên Google Maps</span>
            </a>
          </div>
        </div>
      )}

      <p className="map-note-text" style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '2px' }}>
          <path d="M9 18h6" />
          <path d="M10 22h4" />
          <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14" />
        </svg>
        <span>
          <strong>Mẹo định vị:</strong> Bạn có thể bật chế độ <em>"Chọn vị trí trên bản đồ"</em> để nhấp điểm bất kỳ, hoặc kéo trực tiếp ghim vị trí màu đỏ trên bản đồ để điều chỉnh tọa độ GPS.
        </span>
      </p>
    </div>
  );
};
