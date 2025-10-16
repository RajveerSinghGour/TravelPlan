const OPENTRIPMAP_API_KEY = "";
const BASE_URL = "https://api.opentripmap.com/0.1/en/places";

export interface Coordinates {
  lat: number;
  lon: number;
}

export interface Geoname {
  name: string;
  country: string;
  lon: number;
  lat: number;
  timezone?: string;
  population?: number;
  partial_match?: boolean;
}

export interface SimpleFeature {
  xid: string;
  name: string;
  kinds: string;
  osm?: string;
  wikidata?: string;
  dist?: number;
  point: Coordinates;
}

export interface PlaceDetails {
  xid: string;
  name: string;
  kinds: string;
  osm?: string;
  wikidata?: string;
  rate: string;
  image?: string;
  preview?: {
    source: string;
    width: number;
    height: number;
  };
  wikipedia?: string;
  wikipedia_extracts?: {
    title: string;
    text: string;
    html: string;
  };
  url?: string;
  point: Coordinates;
  bbox?: {
    lon_min: number;
    lon_max: number;
    lat_min: number;
    lat_max: number;
  };
  info?: {
    descr?: string;
    src?: string;
    src_id?: number;
  };
}

export interface GeneratedActivity {
  id: string;
  name: string;
  category: string;
  duration: string;
  time: string;
  destination: string;
  coordinates: { lat: number; lon: number };
  xid: string;
  rating?: number;
}

type Coords = { lat: number; lon: number };

export interface CandidateCity {
  name: string;
  country: string;
  coordinates?: Coords;
}

// --- add below your existing exports ---
export const PREFERENCE_KINDS: Record<string, string[]> = {
  Culture:   ["cultural", "museums", "architecture"],
  Nature:    ["natural", "waterfalls", "lakes"],
  Food:      ["foods", "restaurants", "cafes"],
  History:   ["historic", "monuments", "archaeology"],
  Art:       ["art_galleries", "museums", "theatres", "art"],
  Adventure: ["sport", "climbing", "winter_sports"],
  Beach:     ["beaches", "resorts"],
  Urban:     ["installation", "architecture", "bridges"],
  Modern:    ["skyscrapers", "architecture"],
};

// ---------------- Core API Functions ----------------

// Get coordinates for a city/place name using geoname endpoint
export const getCoordinates = async (placeName: string): Promise<Geoname | null> => {
  try {
    const response = await fetch(
      `${BASE_URL}/geoname?name=${encodeURIComponent(placeName)}&apikey=${OPENTRIPMAP_API_KEY}`
    );

    if (!response.ok) {
      if (response.status === 404) {
        console.log(`Place "${placeName}" not found`);
        return null;
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: Geoname = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching coordinates:", error);
    return null;
  }
};

export function kindsFromPreferences(preferences: string[]): string {
  const kinds = new Set<string>();
  preferences.forEach((p) => (PREFERENCE_KINDS[p] || []).forEach(k => kinds.add(k)));
  return Array.from(kinds).join(",");
}

const _cache = new Map<string, any>();

// Count attractions near a coordinate for specific kinds
export async function countAttractionsNearby(
  coords: Coords,
  radiusMeters: number,
  kindsCsv: string,
  limit = 60
): Promise<number> {
  if (!coords) return 0;
  const key = `count|${coords.lat.toFixed(3)},${coords.lon.toFixed(3)}|${radiusMeters}|${kindsCsv}|${limit}`;
  if (_cache.has(key)) return _cache.get(key);

  const url = `${BASE_URL}/radius?radius=${radiusMeters}&lon=${coords.lon}&lat=${coords.lat}` +
              `${kindsCsv ? `&kinds=${encodeURIComponent(kindsCsv)}` : ""}` +
              `&limit=${limit}&apikey=${OPENTRIPMAP_API_KEY}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`radius failed: ${res.status}`);
  const data = await res.json();
  const count = Array.isArray(data?.features) ? data.features.length : 0;

  _cache.set(key, count);
  return count;
}

// Get attractions near coordinates using radius endpoint
export const getAttractionsNearby = async (
  coordinates: Coordinates,
  radius: number = 5000, // meters
  kinds: string = "interesting_places",
  limit: number = 20
): Promise<SimpleFeature[]> => {
  try {
    const response = await fetch(
      `${BASE_URL}/radius?radius=${radius}&lon=${coordinates.lon}&lat=${coordinates.lat}&kinds=${kinds}&format=json&limit=${limit}&apikey=${OPENTRIPMAP_API_KEY}`
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data: SimpleFeature[] = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("Error fetching attractions:", error);
    return [];
  }
};

// Get detailed information about a specific place using xid endpoint (ensure it's exported)
export const getPlaceDetails = async (xid: string): Promise<PlaceDetails | null> => {
  try {
    const response = await fetch(
      `${BASE_URL}/xid/${xid}?apikey=${OPENTRIPMAP_API_KEY}`
    );

    if (!response.ok) {
      if (response.status === 404) {
        console.log(`Place with xid "${xid}" not found`);
        return null;
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: PlaceDetails = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching place details:", error);
    return null;
  }
};

// Search for places using autosuggest endpoint
export const searchPlaces = async (
  query: string,
  centerPoint?: Coordinates,
  radius: number = 50000, // 50km default radius
  kinds: string = "interesting_places",
  limit: number = 10
): Promise<SimpleFeature[]> => {
  try {
    if (query.length < 3) {
      return [];
    }

    // If no center point provided, try to get coordinates for the query first
    if (!centerPoint) {
      const geoname = await getCoordinates(query);
      centerPoint = geoname ? { lat: geoname.lat, lon: geoname.lon } : { lat: 51.5074, lon: -0.1278 };
    }

    const response = await fetch(
      `${BASE_URL}/autosuggest?name=${encodeURIComponent(query)}&radius=${radius}&lon=${centerPoint.lon}&lat=${centerPoint.lat}&kinds=${kinds}&limit=${limit}&apikey=${OPENTRIPMAP_API_KEY}`
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data: SimpleFeature[] = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("Error searching places:", error);
    return [];
  }
};

// Categorize attractions by their kinds
export const categorizeAttraction = (kinds: string): string => {
  const kindsList = kinds.toLowerCase();
  
  if (kindsList.includes('museums')) return 'Museum';
  if (kindsList.includes('historic') || kindsList.includes('archaeology')) return 'Historic Site';
  if (kindsList.includes('architecture') || kindsList.includes('monuments')) return 'Landmark';
  if (kindsList.includes('natural') || kindsList.includes('geological')) return 'Nature';
  if (kindsList.includes('religion') || kindsList.includes('churches')) return 'Religious Site';
  if (kindsList.includes('sport') || kindsList.includes('entertainment')) return 'Entertainment';
  if (kindsList.includes('shops') || kindsList.includes('markets')) return 'Shopping';
  if (kindsList.includes('food') || kindsList.includes('restaurants')) return 'Food & Dining';
  if (kindsList.includes('cultural') || kindsList.includes('arts')) return 'Culture';
  if (kindsList.includes('towers') || kindsList.includes('bell_towers')) return 'Tower';
  if (kindsList.includes('bridges')) return 'Bridge';
  if (kindsList.includes('squares')) return 'Square';
  
  return 'Attraction';
};

// Get estimated visit duration based on attraction type and rating
export const getEstimatedDuration = (kinds: string, rate?: string): string => {
  const kindsList = kinds.toLowerCase();
  
  // Base duration mapping
  let baseDuration = 1; // hours

  if (kindsList.includes('museums')) baseDuration = 2.5;
  else if (kindsList.includes('historic') || kindsList.includes('archaeology')) baseDuration = 2;
  else if (kindsList.includes('architecture') || kindsList.includes('monuments')) baseDuration = 1;
  else if (kindsList.includes('natural') || kindsList.includes('geological')) baseDuration = 3;
  else if (kindsList.includes('religion') || kindsList.includes('churches')) baseDuration = 1;
  else if (kindsList.includes('entertainment')) baseDuration = 2.5;
  else if (kindsList.includes('shops') || kindsList.includes('markets')) baseDuration = 1.5;
  else if (kindsList.includes('towers') || kindsList.includes('bell_towers')) baseDuration = 0.5;
  else if (kindsList.includes('squares')) baseDuration = 0.5;

  // Adjust based on rating (higher rated places get more time)
  if (rate) {
    const rateNum = parseInt(rate);
    if (rateNum >= 3 || rate.includes('h')) baseDuration *= 1.5;
    else if (rateNum >= 2) baseDuration *= 1.2;
  }

  // Format duration
  if (baseDuration < 1) return "30 min";
  if (baseDuration === 1) return "1 hour";
  return `${Math.round(baseDuration * 2) / 2} hours`;
};

// Helper function to get popular destinations
export const getPopularDestinations = async (): Promise<Array<{
  name: string;
  country: string;
  coordinates: Coordinates;
  attractionCount?: number;
}>> => {
  const popularCities = [
    "Paris, France",
    "Tokyo, Japan",
    "London, UK",
    "New York, USA",
    "Rome, Italy",
    "Barcelona, Spain"
  ];

  const destinations = [];

  for (const city of popularCities) {
    try {
      const geoname = await getCoordinates(city);
      if (geoname) {
        const attractions = await getAttractionsNearby(
          { lat: geoname.lat, lon: geoname.lon },
          5000,
          "interesting_places",
          5
        );

        destinations.push({
          name: geoname.name,
          country: geoname.country,
          coordinates: { lat: geoname.lat, lon: geoname.lon },
          attractionCount: attractions.length
        });
      }
    } catch (error) {
      console.error(`Error fetching data for ${city}:`, error);
    }
  }

  return destinations;
};

// ---------------- Preference-Based Destination Suggestion ----------------

// Suggest destinations dynamically based on selected preferences
export async function suggestDestinationsByPreferences(
  preferences: string[],
  candidates: CandidateCity[],
  radiusMeters = 8000,
  maxResults = 6
) {
  const kindsCsv = kindsFromPreferences(preferences);
  if (!kindsCsv) {
    return candidates.map(c => ({ ...c, attractionCount: undefined, category: "General" }));
  }

  const withCoords = await Promise.all(
    candidates.map(async (c) => {
      if (c.coordinates) return c;
      const geo = await getCoordinates(`${c.name}, ${c.country}`);
      return geo ? { ...c, coordinates: { lat: geo.lat, lon: geo.lon } } : c;
    })
  );

  const scored = await Promise.all(
    withCoords.map(async (c) => {
      try {
        const count = c.coordinates
          ? await countAttractionsNearby(c.coordinates, radiusMeters, kindsCsv, 80)
          : 0;
        return { ...c, attractionCount: count, category: preferences[0] ?? "Mixed" };
      } catch (e) {
        console.error(`Error fetching preference attractions for ${c.name}:`, e);
        return { ...c, attractionCount: 0, category: preferences[0] ?? "Mixed" };
      }
    })
  );

  return scored
    .sort((a, b) => (b.attractionCount ?? 0) - (a.attractionCount ?? 0))
    .slice(0, maxResults);
}
