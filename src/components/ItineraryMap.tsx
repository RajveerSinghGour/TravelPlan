import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-routing-machine';
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';

// Fix for default markers in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface Activity {
  id: string;
  name: string;
  category: string;
  time: string;
  destination: string;
  coordinates?: { lat: number; lon: number };
  xid?: string;
  duration?: string; // Add missing duration property
  travelTime?: {     // Add missing travelTime property
    duration: number;
    method: string;
    fromPrevious: boolean;
  };
}

interface DayActivities {
  day: number;
  activities: Activity[];
  color: string;
}

interface ItineraryMapProps {
  dayActivities: DayActivities[];
  selectedDay?: number;
  className?: string;
}

const ItineraryMap = ({ dayActivities, selectedDay, className = "" }: ItineraryMapProps) => {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  // Generate mock coordinates if missing - enhanced for AI activities
  const generateActivityCoordinates = (destination: string, activityIndex: number, activityId?: string): { lat: number; lon: number } => {
    const cityCoords: { [key: string]: { lat: number; lon: number } } = {
      'Paris, France': { lat: 48.8566, lon: 2.3522 },
      'Tokyo, Japan': { lat: 35.6762, lon: 139.6503 },
      'New York, USA': { lat: 40.7128, lon: -74.0060 },
      'London, UK': { lat: 51.5074, lon: -0.1278 },
      'Rome, Italy': { lat: 41.9028, lon: 12.4964 },
      'Barcelona, Spain': { lat: 41.3851, lon: 2.1734 },
      'Delhi, India': { lat: 28.6139, lon: 77.2090 },
      'Mumbai, India': { lat: 19.0760, lon: 72.8777 },
      'Bangalore, India': { lat: 12.9716, lon: 77.5946 },
    };

    // Try to find exact match first
    let baseCoord = cityCoords[destination];
    
    // If no exact match, try partial matching
    if (!baseCoord) {
      const destLower = destination.toLowerCase();
      for (const [city, coords] of Object.entries(cityCoords)) {
        if (destLower.includes(city.toLowerCase().split(',')[0])) {
          baseCoord = coords;
          break;
        }
      }
    }
    
    // Final fallback
    if (!baseCoord) {
      console.log(`No coordinates found for ${destination}, using default`);
      baseCoord = { lat: 28.6139, lon: 77.2090 }; // Delhi as default
    }
    
    // For AI activities, use a more predictable distribution
    const isAIActivity = activityId?.startsWith('ai-');
    const offset = isAIActivity ? 0.008 : 0.015; // Smaller spread for AI activities
    const angle = (activityIndex * 137.5) * (Math.PI / 180); // Golden angle
    const radiusVariation = isAIActivity ? 0.7 + Math.random() * 0.3 : 0.5 + Math.random() * 0.5;
    
    return {
      lat: baseCoord.lat + Math.cos(angle) * offset * radiusVariation,
      lon: baseCoord.lon + Math.sin(angle) * offset * radiusVariation,
    };
  };

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Initialize map
    if (!mapRef.current) {
      mapRef.current = L.map(mapContainerRef.current, {
        center: [28.6139, 77.2090], // Default to Delhi
        zoom: 12,
        scrollWheelZoom: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(mapRef.current);
    }

    const map = mapRef.current;

    // Clear all non-tile layers
    map.eachLayer((layer) => {
      if (!(layer as any)._url) map.removeLayer(layer);
    });

    if (dayActivities.length === 0) return;

    const allMarkers: L.Marker[] = [];
    const allCoordinates: L.LatLng[] = [];
    const selectedDayCoordinates: L.LatLng[] = [];

    // First, determine the center point for the map
    let centerLat = 28.6139, centerLon = 77.2090; // Default
    let validCoordinatesCount = 0;

    // Calculate center from valid coordinates
    dayActivities.forEach(dayData => {
      dayData.activities.forEach(activity => {
        if (activity.coordinates) {
          centerLat += activity.coordinates.lat;
          centerLon += activity.coordinates.lon;
          validCoordinatesCount++;
        }
      });
    });

    if (validCoordinatesCount > 0) {
      centerLat = centerLat / (validCoordinatesCount + 1);
      centerLon = centerLon / (validCoordinatesCount + 1);
    }

    dayActivities.forEach((dayData) => {
      const { day, activities, color } = dayData;
      const isSelectedDay = selectedDay === undefined || selectedDay === day;
      // Show all markers but with different opacity
      const markerOpacity = isSelectedDay ? 1 : 0.3;
      // Only show routes for selected day
      const showRoute = selectedDay === undefined || selectedDay === day;

      const dayCoordinates: L.LatLng[] = [];

      activities.forEach((activity, activityIndex) => {
        // Ensure every activity has coordinates
        const coords = activity.coordinates || 
                      generateActivityCoordinates(activity.destination, activityIndex, activity.id);
        
        const latLng = L.latLng(coords.lat, coords.lon);
        dayCoordinates.push(latLng);
        allCoordinates.push(latLng);
        
        // Store selected day coordinates for route drawing
        if (isSelectedDay) {
          selectedDayCoordinates.push(latLng);
        }

        // Enhanced marker for AI activities with day-based opacity
        const isAIActivity = activity.id.startsWith('ai-');
        const markerHtml = `
          <div style="
            background: linear-gradient(135deg, ${color} 0%, ${color}dd 100%);
            color: white; border-radius: 50%; width: 34px; height: 34px;
            display: flex; align-items: center; justify-content: center;
            font-weight: bold; font-size: 11px; 
            border: 2px solid ${isAIActivity ? '#8b5cf6' : 'white'};
            box-shadow: 0 4px 8px rgba(0,0,0,0.2); 
            opacity: ${markerOpacity};
            position: relative;
            transform: ${isSelectedDay ? 'scale(1)' : 'scale(0.8)'};
            transition: all 0.3s ease;
          ">
            ${day}.${activityIndex + 1}
            ${isAIActivity ? '<div style="position: absolute; top: -2px; right: -2px; width: 8px; height: 8px; background: #8b5cf6; border-radius: 50%; border: 1px solid white;"></div>' : ''}
          </div>
        `;

        const customIcon = L.divIcon({
          className: 'custom-marker',
          html: markerHtml,
          iconSize: [34, 34],
          iconAnchor: [17, 17],
        });

        const marker = L.marker(latLng, { icon: customIcon }).addTo(map);

        // Enhanced popup with day info
        const popupContent = `
          <div style="font-family: system-ui; min-width: 200px;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
              <strong style="flex: 1;">${activity.name}</strong>
              <span style="background: ${color}; color: white; padding: 2px 6px; border-radius: 8px; font-size: 10px;">Day ${day}</span>
              ${isAIActivity ? '<span style="background: #8b5cf6; color: white; padding: 2px 6px; border-radius: 8px; font-size: 10px;">🤖 AI</span>' : ''}
            </div>
            🕒 ${activity.time}<br/>
            📍 ${activity.destination}<br/>
            <small style="color: #666;">${activity.category}</small>
            ${activity.duration ? `<br/><small style="color: #888;">Duration: ${activity.duration}</small>` : ''}
            ${activity.travelTime ? `<br/><small style="color: #ff6b35;">🚶 ${activity.travelTime.duration}min ${activity.travelTime.method}</small>` : ''}
          </div>
        `;

        marker.bindPopup(popupContent, {
          maxWidth: 250,
        });

        allMarkers.push(marker);
      });

      // Only draw routes for the selected day or if no day is selected
      if (showRoute && dayCoordinates.length > 1) {
        const hasAIActivities = activities.some(a => a.id.startsWith('ai-'));
        
        L.Routing.control({
          waypoints: dayCoordinates,
          addWaypoints: false,
          draggableWaypoints: false,
          fitSelectedRoutes: false,
          createMarker: () => null,
          lineOptions: {
            styles: [{
              color: color,
              opacity: 0.8,
              weight: 6,
              dashArray: hasAIActivities ? '15,8' : undefined
            }],
          },
          show: false,
        }).addTo(map);

        // Enhanced day label only for routes being shown
        const labelPos = dayCoordinates[0];
        const dayLabelIcon = L.divIcon({
          html: `
            <div style="
              background: linear-gradient(135deg, ${color} 0%, ${color}ee 100%);
              color: white;
              padding: 6px 12px;
              border-radius: 15px;
              font-size: 12px;
              font-weight: bold;
              box-shadow: 0 3px 6px rgba(0,0,0,0.3);
              border: 2px solid white;
              position: relative;
              backdrop-filter: blur(10px);
            ">
              Day ${day} Route (${activities.length} stops)
              ${hasAIActivities ? '<span style="position: absolute; top: -6px; right: -6px; background: #8b5cf6; width: 14px; height: 14px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 8px; border: 2px solid white;">🤖</span>' : ''}
            </div>
          `,
          iconSize: [160, 32],
          iconAnchor: [80, 16],
        });

        L.marker([labelPos.lat + 0.003, labelPos.lng + 0.003], {
          icon: dayLabelIcon,
          interactive: false,
        }).addTo(map);
      }
    });

    // Improved map fitting - focus on selected day if available
    const coordinatesToFit = selectedDay !== undefined ? selectedDayCoordinates : allCoordinates;
    
    if (coordinatesToFit.length === 1) {
      map.setView(coordinatesToFit[0], 14);
    } else if (coordinatesToFit.length > 1) {
      try {
        const bounds = L.latLngBounds(coordinatesToFit);
        map.fitBounds(bounds, { 
          padding: [40, 40], 
          maxZoom: 15 
        });
      } catch (error) {
        console.warn('Could not fit bounds, using center coordinates');
        map.setView([centerLat, centerLon], 13);
      }
    } else {
      // No activities, center on calculated position
      map.setView([centerLat, centerLon], 12);
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [dayActivities, selectedDay]);

  if (dayActivities.length === 0) {
    return (
      <div className={`aspect-video bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl flex items-center justify-center border-2 border-dashed border-gray-300 ${className}`}>
        <div className="text-center">
          <div className="text-5xl mb-4">🗺️</div>
          <p className="text-gray-600 font-medium">Itinerary Map</p>
          <p className="text-sm text-gray-500">Activities will be plotted with realistic road routes</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`aspect-video rounded-xl overflow-hidden border-2 border-gray-200 shadow-lg ${className}`}>
      <div ref={mapContainerRef} className="w-full h-full" />
    </div>
  );
};

export default ItineraryMap;
