import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface MapDestination {
  name: string;
  country: string;
  coordinates: { lat: number; lon: number };
  attractionCount?: number;
}

interface InteractiveMapProps {
  destinations: MapDestination[];
  className?: string;
  height?: string;
  showAttractionsInfo?: boolean;
}

const InteractiveMap = ({ 
  destinations, 
  className = "", 
  height = "aspect-video",
  showAttractionsInfo = true 
}: InteractiveMapProps) => {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Initialize map
    if (!mapRef.current) {
      mapRef.current = L.map(mapContainerRef.current, {
        center: [48.8566, 2.3522], // Default to Paris
        zoom: 2,
        scrollWheelZoom: true,
        zoomControl: true,
        attributionControl: true,
      });

      // Add enhanced tile layer with better styling
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
        className: 'map-tiles'
      }).addTo(mapRef.current);

      // Add custom CSS for better map appearance
      const style = document.createElement('style');
      style.textContent = `
        .leaflet-container {
          font-family: system-ui, -apple-system, sans-serif;
        }
        .leaflet-popup-content-wrapper {
          border-radius: 8px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.1);
        }
        .leaflet-popup-tip {
          background: white;
        }
        .custom-marker {
          filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));
        }
        .map-tiles {
          filter: brightness(1.02) contrast(1.05);
        }
      `;
      document.head.appendChild(style);
    }

    const map = mapRef.current;

    // Clear existing markers and layers
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker || layer instanceof L.CircleMarker) {
        map.removeLayer(layer);
      }
    });

    // Add markers for destinations
    if (destinations.length > 0) {
      const markers: L.Marker[] = [];
      
      destinations.forEach((dest, index) => {
        // Create enhanced custom icon with number
        const customIcon = L.divIcon({
          className: 'custom-marker',
          html: `
            <div style="
              background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
              color: white;
              border-radius: 50%;
              width: 36px;
              height: 36px;
              display: flex;
              align-items: center;
              justify-content: center;
              font-weight: bold;
              font-size: 16px;
              border: 3px solid white;
              box-shadow: 0 4px 12px rgba(37, 99, 235, 0.4);
              transition: transform 0.2s ease;
            ">
              ${index + 1}
            </div>
          `,
          iconSize: [36, 36],
          iconAnchor: [18, 18],
        });

        const marker = L.marker(
          [dest.coordinates.lat, dest.coordinates.lon],
          { icon: customIcon }
        ).addTo(map);

        // Enhanced popup with better styling
        const popupContent = `
          <div style="
            font-family: system-ui, -apple-system, sans-serif;
            min-width: 200px;
            padding: 4px;
          ">
            <div style="
              background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
              color: white;
              padding: 12px;
              margin: -4px -4px 12px -4px;
              border-radius: 6px 6px 0 0;
              font-weight: 600;
              font-size: 16px;
            ">
              ${dest.name}, ${dest.country}
            </div>
            ${showAttractionsInfo && dest.attractionCount ? `
              <div style="
                background: #f3f4f6;
                padding: 8px 12px;
                border-radius: 6px;
                margin-bottom: 8px;
                border-left: 4px solid #2563eb;
              ">
                <span style="font-weight: 600; color: #1f2937;">
                  🎯 ${dest.attractionCount} attractions found
                </span>
              </div>
            ` : ''}
            <div style="
              display: flex;
              align-items: center;
              gap: 8px;
              color: #6b7280;
              font-size: 14px;
              margin-top: 8px;
            ">
              <span>📍</span>
              <span>${dest.coordinates.lat.toFixed(4)}, ${dest.coordinates.lon.toFixed(4)}</span>
            </div>
          </div>
        `;

        marker.bindPopup(popupContent, {
          maxWidth: 300,
          className: 'custom-popup'
        });

        // Add hover effects
        marker.on('mouseover', function() {
          this.getElement().style.transform = 'scale(1.1)';
          this.getElement().style.zIndex = '1000';
        });

        marker.on('mouseout', function() {
          this.getElement().style.transform = 'scale(1)';
          this.getElement().style.zIndex = '';
        });

        markers.push(marker);
      });

      // Fit map to show all markers with improved bounds
      if (markers.length === 1) {
        map.setView([destinations[0].coordinates.lat, destinations[0].coordinates.lon], 12);
      } else if (markers.length > 1) {
        const group = new L.FeatureGroup(markers);
        const bounds = group.getBounds();
        map.fitBounds(bounds, { 
          padding: [20, 20],
          maxZoom: 10 
        });
      }
    }

    return () => {
      // Cleanup function
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [destinations, showAttractionsInfo]);

  if (destinations.length === 0) {
    return (
      <div className={`${height} bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl flex items-center justify-center border-2 border-dashed border-blue-300 ${className}`}>
        <div className="text-center">
          <div className="text-5xl mb-4">🗺️</div>
          <p className="text-blue-700 font-semibold text-lg mb-2">Interactive Map Ready</p>
          <p className="text-blue-600 text-sm">Select destinations to see them plotted with real coordinates</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${height} rounded-xl overflow-hidden border-2 border-gray-200 shadow-lg ${className}`}>
      <div ref={mapContainerRef} className="w-full h-full" />
    </div>
  );
};

export default InteractiveMap;
