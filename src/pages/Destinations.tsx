import { Search, MapPin, Sparkles, ArrowRight, X, Plus, Loader2, AlertCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import InteractiveMap from "@/components/InteractiveMap";
import { 
  getCoordinates, 
  getAttractionsNearby, 
  searchPlaces,
  categorizeAttraction,
  SimpleFeature,
  PREFERENCE_KINDS ,
  Geoname 
} from "@/lib/opentripmap";

interface Destination {
  name: string;
  country: string;
  category: string;
  description: string;
  coordinates?: { lat: number; lon: number };
  attractions?: SimpleFeature[];
  attractionCount?: number;
}

const Destinations = () => {
  const [preferredAttractions, setPreferredAttractions] = useState<SimpleFeature[]>([]);
  const [loadingPreferred, setLoadingPreferred] = useState(false);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [preferences, setPreferences] = useState<string[]>([]);
  const [searchResults, setSearchResults] = useState<Destination[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [loadingAttractions, setLoadingAttractions] = useState<string>("");
  const [apiError, setApiError] = useState<string>("");
  const navigate = useNavigate();

  // Static fallback destinations
  const fallbackDestinations: Destination[] = [
    { name: "Paris", country: "France", category: "Culture", description: "City of Light with iconic landmarks", attractionCount: 15 },
    { name: "Tokyo", country: "Japan", category: "Modern", description: "Blend of traditional and futuristic", attractionCount: 12 },
    { name: "Barcelona", country: "Spain", category: "Art", description: "Gaudí architecture and Mediterranean vibes", attractionCount: 10 },
    { name: "New York", country: "USA", category: "Urban", description: "The city that never sleeps", attractionCount: 18 },
    { name: "London", country: "UK", category: "Culture", description: "Historic landmarks and modern attractions", attractionCount: 16 },
    { name: "Rome", country: "Italy", category: "History", description: "Ancient wonders and Italian cuisine", attractionCount: 14 },
  ];

  const preferenceOptions = ["Culture", "Nature", "Food", "History", "Art", "Adventure", "Beach", "Urban", "Modern"];

  // Search for destinations using real OpenTripMap API
  const searchDestinations = async (query: string) => {
    if (!query.trim() || query.length < 3) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    setApiError("");
    
    try {
      // Try to get coordinates for the search query
      const geoname = await getCoordinates(query);
      
      if (geoname) {
        // Get attractions for this location
        const attractions = await getAttractionsNearby(
          { lat: geoname.lat, lon: geoname.lon }, 
          8000, // 8km radius
          "interesting_places", 
          15
        );
        
        // Create destination object with real data
        const destination: Destination = {
          name: geoname.name,
          country: geoname.country,
          category: attractions.length > 0 ? categorizeAttraction(attractions[0].kinds) : 'City',
          description: `${attractions.length} attractions found${geoname.population ? ` • Pop: ${geoname.population.toLocaleString()}` : ''}`,
          coordinates: { lat: geoname.lat, lon: geoname.lon },
          attractions,
          attractionCount: attractions.length
        };
        
        setSearchResults([destination]);
      } else {
        // If geoname fails, try autosuggest search
        const suggestions = await searchPlaces(query, undefined, 50000, "interesting_places", 5);
        
        if (suggestions.length > 0) {
          const searchDestinations = suggestions.map(place => ({
            name: place.name,
            country: "Unknown", // autosuggest doesn't always provide country
            category: categorizeAttraction(place.kinds),
            description: `Attraction: ${place.kinds.split(',')[0]}`,
            coordinates: place.point,
            attractionCount: 1
          }));
          
          setSearchResults(searchDestinations);
        } else {
          // Fallback to static suggestions
          const filtered = fallbackDestinations.filter(dest => 
            dest.name.toLowerCase().includes(query.toLowerCase()) ||
            dest.country.toLowerCase().includes(query.toLowerCase())
          );
          setSearchResults(filtered);
          
          if (filtered.length === 0) {
            setApiError("No destinations found. Try a major city name.");
          }
        }
      }
    } catch (error) {
      console.error("Search error:", error);
      setApiError("Search temporarily unavailable. Showing popular destinations.");
      
      // Fallback to static suggestions
      const filtered = fallbackDestinations.filter(dest => 
        dest.name.toLowerCase().includes(query.toLowerCase()) ||
        dest.country.toLowerCase().includes(query.toLowerCase())
      );
      setSearchResults(filtered);
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    const fetchPreferredAttractions = async () => {
      if (preferences.length === 0) {
        setPreferredAttractions([]);
        return;
      }

      setLoadingPreferred(true);

      try {
        // Convert selected preferences to kinds string
        const kindsList = preferences.flatMap((pref) => PREFERENCE_KINDS[pref] || []);
        const kindsCsv = kindsList.join(",");

        // Example: fixed coordinates (Paris); later you can replace with selected destination
        const lat = destinations[0]?.coordinates?.lat ?? 28.6139;
        const lon = destinations[0]?.coordinates?.lon ?? 77.2090;
        const country = destinations[0]?.country;

        const radii = [8000, 50000, 150000, 500000]; // 8km, 50km, 150km, 500km
        let attractions: any[] = [];

        for(const radius of radii) {
          const res = await fetch(
            `https://api.opentripmap.com/0.1/en/places/radius?lat=${lat}&lon=${lon}&radius=${radius}&kinds=${kindsCsv}&limit=50&apikey=5ae2e3f221c38a28845f05b6d3d1f1385b98e981070145beb2d50a31`
          );
          const data = await res.json();

          if (Array.isArray(data) && data.length > 0) {
            attractions = data;
            break; // Exit loop if we found attractions
          } else if (Array.isArray(data.features) && data.features.length > 0) {
            attractions = data.features.map((f: any) => f.properties || f);
            break; // Exit loop if we found attractions
          }
        }

        if (country && attractions.length > 0) {
          // This is a best-effort filter - OpenTripMap doesn't always return country info
          // You might need to use reverse geocoding for precise filtering
          setPreferredAttractions(attractions.slice(0, 50));
        } else {
          setPreferredAttractions(attractions.slice(0, 50));
        }

        // If still no results, show message instead of fallback
        if (attractions.length === 0) {
          setPreferredAttractions([]);
        }

      } catch (err) {
        console.error("Error fetching preferred attractions:", err);
        setPreferredAttractions([]);
      } finally {
        setLoadingPreferred(false);
      }
    };

    fetchPreferredAttractions();
  }, [preferences, destinations]);

  useEffect(() => {
    const nearDest = async () => {

      try {
        // Example: fixed coordinates (Paris); later you can replace with selected destination
        const lat = destinations[0]?.coordinates?.lat ?? 28.6139;
        const lon = destinations[0]?.coordinates?.lon ?? 77.2090;
        const country = destinations[0]?.country;

        const radii = [8000, 50000, 150000, 500000]; // 8km, 50km, 150km, 500km
        let attractions: any[] = [];

        for(const radius of radii) {
          const res = await fetch(
            `https://api.opentripmap.com/0.1/en/places/radius?lat=${lat}&lon=${lon}&radius=${radius}&limit=50&apikey=5ae2e3f221c38a28845f05b6d3d1f1385b98e981070145beb2d50a31`
          );
          const data = await res.json();

          if (Array.isArray(data) && data.length > 0) {
            attractions = data;
            break; // Exit loop if we found attractions
          } else if (Array.isArray(data.features) && data.features.length > 0) {
            attractions = data.features.map((f: any) => f.properties || f);
            break; // Exit loop if we found attractions
          }
        }

        if (country && attractions.length > 0) {
          // This is a best-effort filter - OpenTripMap doesn't always return country info
          // You might need to use reverse geocoding for precise filtering
          setPreferredAttractions(attractions.slice(0, 50));
        } else {
          setPreferredAttractions(attractions.slice(0, 50));
        }

        // If still no results, show message instead of fallback
        if (attractions.length === 0) {
          setPreferredAttractions([]);
        }

      } catch (err) {
        console.error("Error fetching preferred attractions:", err);
        setPreferredAttractions([]);
      } finally {
        setLoadingPreferred(false);
      }
    };

    nearDest();
  }, [destinations]);

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchDestinations(searchQuery);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const addDestination = async (destination: Destination) => {
    const exists = destinations.find(d => d.name === destination.name && d.country === destination.country);
    if (exists) return;

    setLoadingAttractions(`${destination.name}, ${destination.country}`);
    
    let newDestination = { ...destination };
    
    // If no attractions data yet, fetch it
    if (!newDestination.coordinates) {
      try {
        const geoname = await getCoordinates(`${destination.name}, ${destination.country}`);
        if (geoname) {
          newDestination.coordinates = { lat: geoname.lat, lon: geoname.lon };
        }
      } catch (error) {
        console.error("Error fetching coordinates:", error);
        // Keep the destination even if we can't fetch attractions
      }
    }

    if (!newDestination.attractions && newDestination.coordinates) {
      try {
        const attractions = await getAttractionsNearby(
          newDestination.coordinates, 
          8000, 
          "interesting_places", 
          20
        );
        newDestination = {
          ...newDestination,
          attractions,
          attractionCount: attractions.length,
          description: `${attractions.length} attractions found`
        };
      } catch (error) {
        console.error("Error fetching attractions:", error);
        // Keep the destination even if we can't fetch attractions
      }
    }
    
    setDestinations(prev => [...prev, newDestination]);
    setLoadingAttractions("");
    setSearchQuery("");
    setSearchResults([]);
  };

  const removeDestination = (destination: Destination) => {
    setDestinations(destinations.filter((d) => !(d.name === destination.name && d.country === destination.country)));
  };

  const togglePreference = (pref: string) => {
    setPreferences(prev => 
      prev.includes(pref) 
        ? prev.filter(p => p !== pref)
        : [...prev, pref]
    );
  };

  const totalAttractions = destinations.reduce((sum, dest) => sum + (dest.attractionCount || 0), 0);

  const handleCreateTrip = () => {
    if (destinations.length === 0) {
      alert("Please select at least one destination");
      return;
    }

    // Navigate to itinerary page with all selected destinations
    navigate('/itinerary', {
      state: {
        destinations: destinations.map(dest => `${dest.name}, ${dest.country}`),
        preferences,
        destinationData: destinations.map(dest => ({
          name: dest.name,
          country: dest.country,
          coordinates: dest.coordinates,
          attractions: dest.attractions || [],
          attractionCount: dest.attractionCount || 0
        }))
      }
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="container mx-auto px-4 py-6 border-b border-gray-200 bg-white sticky top-0 z-50 shadow-sm">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="p-2 bg-blue-600 rounded-xl shadow-md">
              <MapPin className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-blue-800">TravelPlan</span>
          </Link>
          
          <Button variant="outline" asChild className="shadow-sm">
            <Link to="/">Back to Home</Link>
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12">
        <div className="mb-12 text-center">
          <h1 className="text-5xl md:text-6xl font-extrabold mb-4 text-blue-800">
            Choose Your Destinations
          </h1>
          <p className="text-xl text-gray-600">
            Search real destinations and discover amazing attractions
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Section - Search & Selected */}
          <div className="lg:col-span-2 space-y-6">
            {/* Search Bar */}
            <Card className="p-6 border border-gray-200 shadow-lg bg-white">
              <div className="relative mb-4">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  placeholder="Search destinations (e.g., Paris, Tokyo, New York)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 h-14 text-lg border-2 focus:border-blue-500"
                />
                {isSearching && (
                  <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 animate-spin text-blue-600" />
                )}
              </div>

              {/* API Error Message */}
              {apiError && (
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                  <p className="text-sm text-yellow-800">{apiError}</p>
                </div>
              )}
              
              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  <p className="text-sm text-gray-500 mb-2">
                    {searchQuery && !apiError ? "Real-time results:" : "Suggestions:"}
                  </p>
                  {searchResults.map((dest, index) => (
                    <button
                      key={`${dest.name}-${dest.country}-${index}`}
                      onClick={() => addDestination(dest)}
                      disabled={destinations.some(d => d.name === dest.name && d.country === dest.country) || loadingAttractions === `${dest.name}, ${dest.country}`}
                      className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-800">{dest.name}, {dest.country}</span>
                            <Badge variant="secondary" className="text-xs">{dest.category}</Badge>
                            {dest.attractionCount !== undefined && (
                              <Badge variant="outline" className="text-xs">
                                {dest.attractionCount} attractions
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{dest.description}</p>
                        </div>
                        {loadingAttractions === `${dest.name}, ${dest.country}` ? (
                          <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                        ) : (
                          <Plus className="h-4 w-4 text-blue-600" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
              
              {searchQuery && searchResults.length === 0 && !isSearching && !apiError && (
                <p className="text-sm text-gray-500 py-4 text-center">
                  No destinations found. Try searching for a major city name.
                </p>
              )}
            </Card>

            {/* Selected Destinations */}
            <Card className="p-6 border border-gray-200 shadow-lg bg-white">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-gray-800">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <MapPin className="h-5 w-5 text-blue-600" />
                </div>
                Selected Destinations ({destinations.length})
                {totalAttractions > 0 && (
                  <Badge variant="outline" className="text-xs">
                    {totalAttractions} attractions found
                  </Badge>
                )}
              </h3>
              
              {destinations.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <MapPin className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p>No destinations selected yet</p>
                  <p className="text-sm">Search above to find real destinations with attractions</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {destinations.map((dest, index) => (
                    <div
                      key={`${dest.name}-${dest.country}`}
                      className="flex items-center justify-between p-4 bg-blue-50 rounded-xl border border-blue-200 hover:border-blue-300 transition-all shadow-sm"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold shadow-md">
                          {index + 1}
                        </div>
                        <div>
                          <span className="font-semibold text-lg text-gray-800">
                            {dest.name}, {dest.country}
                          </span>
                          <p className="text-sm text-gray-600">
                            {dest.attractionCount !== undefined ? `${dest.attractionCount} attractions` : 'Attractions loading...'} • {dest.category}
                          </p>
                          {dest.coordinates && (
                            <p className="text-xs text-gray-500">
                              📍 {dest.coordinates.lat.toFixed(4)}, {dest.coordinates.lon.toFixed(4)}
                            </p>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeDestination(dest)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Interactive Map - Enhanced */}
            <Card className="p-6 border border-gray-200 shadow-lg bg-white">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-blue-600" />
                  Interactive Destination Map
                </h3>
                {destinations.length > 0 && (
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-xs">
                      {destinations.length} destination{destinations.length !== 1 ? 's' : ''} plotted
                    </Badge>
                    <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                      Live coordinates
                    </Badge>
                  </div>
                )}
              </div>
              
              <InteractiveMap 
                destinations={destinations.filter(d => d.coordinates).map(d => ({
                  name: d.name,
                  country: d.country,
                  coordinates: d.coordinates!,
                  attractionCount: d.attractionCount
                }))}
                height="h-96"
                showAttractionsInfo={true}
              />
              
              {destinations.length > 0 && (
                <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2 text-sm text-blue-800 mb-2">
                    <MapPin className="h-4 w-4" />
                    <span className="font-semibold">
                      {destinations.filter(d => d.coordinates).length} destinations with coordinates • 
                      {destinations.reduce((sum, d) => sum + (d.attractionCount || 0), 0)} total attractions
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {destinations.map((dest, index) => (
                      <span 
                        key={`${dest.name}-${dest.country}`}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-white rounded-md text-xs font-medium text-blue-700 border border-blue-200"
                      >
                        <span className="w-4 h-4 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                          {index + 1}
                        </span>
                        {dest.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </Card>

            {/* Create Trip Button */}
            {destinations.length > 0 && (
              <div>
                <Button
                  size="lg"
                  className="w-full shadow-lg bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={handleCreateTrip}
                >
                  Create My Trip
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
            )}
          </div>

          {/* Right Section - Preferences & Popular Destinations */}
          <div className="space-y-6">
            {/* Travel Preferences */}
            <Card className="p-6 border border-gray-200 shadow-lg bg-white">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Sparkles className="h-5 w-5 text-purple-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-800">Travel Preferences</h3>
              </div>
              
              <p className="text-sm text-gray-600 mb-4">
                Select your interests for better attraction filtering
              </p>

              <div className="flex flex-wrap gap-2">
                {preferenceOptions.map((pref) => (
                  <button
                    key={pref}
                    onClick={() => togglePreference(pref)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      preferences.includes(pref)
                        ? 'bg-purple-600 text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-purple-100 hover:text-purple-700'
                    }`}
                  >
                    {pref}
                  </button>
                ))}
              </div>
            </Card>

            {/* Popular Destinations */}
            <Card className="p-6 border border-gray-200 shadow-lg bg-white">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Sparkles className="h-5 w-5 text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-800">Popular Destinations</h3>
              </div>

              <p className="text-sm text-gray-600 mb-4">
                {preferences.length > 0
                  ? "Based on your selected interests"
                  : "Trending destinations with real attraction data"}
              </p>

              <div className="space-y-2">
                {loadingPreferred ? (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading attractions near Paris...
                  </div>
                ) : preferences.length > 0 && preferredAttractions.length > 0 ? (
                  preferredAttractions.slice(0, 6).map((place) => (
                    <button
                      key={place.xid}
                      onClick={() =>
                        addDestination({
                          name: place.name || "Unknown",
                          country: "France",
                          category: categorizeAttraction(place.kinds),
                          description: `Type: ${place.kinds?.split(",")[0] ?? "attraction"}`,
                          coordinates: place.point,
                          attractionCount: 1,
                        })
                      }
                      className="w-full text-left p-4 rounded-xl border-2 border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-all shadow-sm hover:shadow-md"
                    >
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-blue-600" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-800">
                              {place.name || "Unnamed Attraction"}
                            </span>
                            <Badge variant="secondary" className="text-xs">
                              {categorizeAttraction(place.kinds)}
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-600 mt-1 truncate">
                            {place.kinds?.split(",")[0] ?? "Attraction"}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))
                ) : preferences.length > 0 && preferredAttractions.length === 0 ? (
                  // No attractions found message
                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 text-center">
                    <p className="text-sm text-gray-600">
                      No {preferences.join(", ").toLowerCase()} attractions found near {destinations[0]?.name || "this location"} within 500km.
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      Try different preferences or add another destination.
                    </p>
                  </div>
                ) : (
                  fallbackDestinations.slice(0, 6).map((dest) => {
                    const isAdded = destinations.some(
                      (d) => d.name === dest.name && d.country === dest.country
                    );
                    const isLoading =
                      loadingAttractions === `${dest.name}, ${dest.country}`;

                    return (
                      <button
                        key={`${dest.name}-${dest.country}`}
                        onClick={() => addDestination(dest)}
                        disabled={isAdded || isLoading}
                        className="w-full text-left p-4 rounded-xl border-2 border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
                      >
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-blue-600" />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-800">
                                {dest.name}, {dest.country}
                              </span>
                              <Badge variant="secondary" className="text-xs">
                                {dest.category}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <p className="text-xs text-gray-600">{dest.description}</p>
                              {dest.attractionCount && (
                                <Badge variant="outline" className="text-xs">
                                  ~{dest.attractionCount} attractions
                                </Badge>
                              )}
                            </div>
                          </div>
                          {isLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                          ) : isAdded ? (
                            <Badge variant="secondary" className="text-xs">
                              Added
                            </Badge>
                          ) : null}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </Card>


            {/* Tips */}
            <div className="p-4 bg-yellow-50 rounded-xl border border-yellow-200 shadow-sm">
              <p className="text-sm font-medium text-gray-700">
                💡 <strong>Pro Tips:</strong>
              </p>
              <ul className="text-sm text-gray-600 mt-2 space-y-1">
                <li>• Search uses real OpenTripMap data</li>
                <li>• Select 2-5 destinations for optimal itineraries</li>
                <li>• Coordinates and attractions are fetched live</li>
                <li>• Preferences help filter relevant attractions</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Destinations;
