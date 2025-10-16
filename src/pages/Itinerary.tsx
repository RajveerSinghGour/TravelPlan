import { MapPin, Calendar, Clock, Share2, Edit3, Trash2, Sparkles, RefreshCw, Route, Plus, X, Loader2 } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import ItineraryMap from "@/components/ItineraryMap";
import { generateItinerary, regenerateItinerary, GeneratedItinerary } from "@/lib/itineraryGenerator";
import { motion, AnimatePresence } from 'framer-motion';
import { Check } from 'lucide-react';
import TripStats from "@/components/TripStats";
import TripExport from "@/components/TripExport";
import { formatDuration, detectCityChanges } from "@/lib/travelTimeCalculator";
import { analyzeItinerary } from "@/lib/groqClient";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import EditActivityDialog from "@/components/EditActivityDialog";

interface Activity {
  id: string;
  name: string;
  category: string;
  duration: string;
  time: string;
  destination: string;
  coordinates?: { lat: number; lon: number };
  xid?: string;
  travelTime?: {
    duration: number;
    method: string;
    fromPrevious: boolean;
  };
}

interface LocationState {
  destinations?: string[];
  preferences?: string[];
  destinationData?: Array<{
    name: string;
    country: string;
    coordinates?: { lat: number; lon: number };
    attractions?: any[];
    attractionCount?: number;
  }>;
}

const Itinerary = () => {
  const [selectedDay, setSelectedDay] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string>("");
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [showAddActivity, setShowAddActivity] = useState(false);
  const [isAddActivityOpen, setIsAddActivityOpen] = useState(false);
  const [nearbyPlaces, setNearbyPlaces] = useState<any[]>([]);
  const [isLoadingPlaces, setIsLoadingPlaces] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const [cityChanges, setCityChanges] = useState<any[]>([]);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const location = useLocation();
  
  // Get passed data from Destinations page
  const { destinations = [], preferences = [], destinationData = [] } = (location.state as LocationState) || {};
  
  // Dynamic trip data based on destinations
  const [tripName, setTripName] = useState("");
  const [tripDays, setTripDays] = useState<number[]>([]);
  const [activities, setActivities] = useState<Record<number, Activity[]>>({});

  // Generate real itinerary using API data
  const deleteActivity = (dayNumber: number, activityId: string) => {
    setActivities(prev => ({
      ...prev,
      [dayNumber]: prev[dayNumber]?.filter(activity => activity.id !== activityId) || []
    }));
  };


  const fetchNearbyAttractions = async (dayNumber: number) => {
    setIsLoadingPlaces(true);
    try {
      // Get coordinates from the selected day's activities or destination data
      let lat = destinationData[0]?.coordinates?.lat ?? 28.6139;
      let lon = destinationData[0]?.coordinates?.lon ?? 77.2090;

      const radii = [5000, 10000, 20000, 50000]; // 5km, 10km, 20km, 50km
      let attractions: any[] = [];

      // Try increasing radii until we find attractions
      for (const radius of radii) {
        const res = await fetch(
          `https://api.opentripmap.com/0.1/en/places/radius?lat=${lat}&lon=${lon}&radius=${radius}&limit=50&apikey=5ae2e3f221c38a28845f05b6d3d1f1385b98e981070145beb2d50a31`
        );
        const data = await res.json();

        if (Array.isArray(data) && data.length > 0) {
          attractions = data;
          break;
        } else if (Array.isArray(data.features) && data.features.length > 0) {
          attractions = data.features.map((f: any) => f.properties || f);
          break;
        }
      }

      // Get detailed info for places with names
      const detailedPlaces = await Promise.all(
        attractions
          .filter(place => place.name && place.name.trim() !== '')
          .slice(0, 30)
          .map(async (place: any) => {
            try {
              const detailResponse = await fetch(
                `https://api.opentripmap.com/0.1/en/places/xid/${place.xid}?apikey=5ae2e3f221c38a28845f05b6d3d1f1385b98e981070145beb2d50a31`
              );
              const details = await detailResponse.json();
              
              return {
                xid: place.xid,
                name: place.name,
                kinds: place.kinds,
                coordinates: {
                  lat: place.point?.lat || 0,
                  lon: place.point?.lon || 0
                },
                distance: place.dist || 0,
                rate: details.rate || 0,
                preview: details.preview?.source,
                wikipedia: details.wikipedia,
              };
            } catch (error) {
              return null;
            }
          })
      );

      const filteredPlaces = detailedPlaces.filter(p => p !== null);
      setNearbyPlaces(filteredPlaces);
      
    } catch (error) {
      console.error('Error fetching nearby places:', error);
      setGenerationError('Failed to fetch nearby attractions');
      setNearbyPlaces([]);
    } finally {
      setIsLoadingPlaces(false);
    }
  };


  const handleOpenAddActivity = () => {
    setIsAddActivityOpen(true);
    setSearchQuery("");
    fetchNearbyAttractions(selectedDay);
  };

  // Add selected place to itinerary
  const handleAddPlace = (place: any) => {
    const newActivity: Activity = {
      id: `${selectedDay}-${Date.now()}`,
      name: place.name,
      category: place.kinds?.split(',')[0]?.replace(/_/g, ' ') || 'Attraction',
      duration: '2 hours',
      time: getNextAvailableTime(selectedDay),
      destination: destinations[0] || 'Current Location',
      coordinates: place.coordinates,
      xid: place.xid
    };

    setActivities(prev => ({
      ...prev,
      [selectedDay]: [...(prev[selectedDay] || []), newActivity]
    }));

    // Show success feedback
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 1000);
  };

  // Helper function to get next available time slot
  const getNextAvailableTime = (dayNumber: number): string => {
    const dayActivities = activities[dayNumber] || [];
    const times = ["9:00 AM", "11:00 AM", "1:00 PM", "3:00 PM", "5:00 PM", "7:00 PM"];
    
    if (dayActivities.length === 0) return times[0];
    if (dayActivities.length >= times.length) return "8:00 PM";
    
    return times[dayActivities.length];
  };

  // Filter places based on search
  const filteredNearbyPlaces = nearbyPlaces.filter(place => 
    place.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    place.kinds?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const prepareVisitOrderJSON = (dayActivities: Activity[]) => {
    return {
      totalActivities: dayActivities.length,
      activities: dayActivities.map((activity) => ({
        name: activity.name,
        category: activity.category,
        destination: activity.destination
      }))
    };
  };


  // Call Groq AI for itinerary analysis - now the primary method
  const callGroqAIAnalysis = async () => {
    setIsAnalyzing(true);
    setGenerationError(""); // Clear previous errors
    
    try {
      // Get summary JSON using destination lat/lon
      const summaryJson = await getActivitiesTotal();
      console.log('Sending to AI for analysis (PRIMARY METHOD):', summaryJson);

      // Validate we have data to send
      if (!summaryJson.activities || summaryJson.activities.length === 0) {
        throw new Error("No activities found to analyze. Falling back to OpenTripMap generation.");
      }

      // Pass the JSON to Groq client for analysis
      const aiResult = await analyzeItinerary(summaryJson);
      console.log('AI Analysis Result (PRIMARY):', aiResult);

      if (aiResult && aiResult.itinerary && Array.isArray(aiResult.itinerary)) {
        setAiAnalysis(aiResult);
        
        // Convert AI result to our activities format with proper coordinates and intercity travel
        const aiActivities: Record<number, Activity[]> = {};
        
        aiResult.itinerary.forEach((dayPlan: any) => {
          if (dayPlan.activities && Array.isArray(dayPlan.activities)) {
            const dayActivities: Activity[] = [];
            
            // Add intercity travel indicator if required
            if (dayPlan.intercity_travel?.required) {
              dayActivities.push({
                id: `travel-${dayPlan.day}`,
                name: `Travel: ${dayPlan.intercity_travel.from_city} → ${dayPlan.intercity_travel.to_city}`,
                category: 'Intercity Travel',
                duration: `${Math.round(dayPlan.intercity_travel.estimated_duration_minutes / 60)} hours`,
                time: dayPlan.intercity_travel.departure_time || '7:00 AM',
                destination: `${dayPlan.intercity_travel.from_city} → ${dayPlan.intercity_travel.to_city}`,
                coordinates: getCoordinatesForDestination(dayPlan.primary_destination),
                travelTime: {
                  duration: dayPlan.intercity_travel.estimated_duration_minutes,
                  method: dayPlan.intercity_travel.method || 'transport',
                  fromPrevious: true
                }
              });
            }
            
            // Add regular activities
            const regularActivities: Activity[] = dayPlan.activities.map((activity: any, index: number) => {
              const activityCoordinates = getCoordinatesForDestination(dayPlan.primary_destination, index);

              return {
                id: `ai-${dayPlan.day}-${index}`,
                name: activity.activity || activity.name || `Activity ${index + 1}`,
                category: activity.category || 'AI Suggested',
                duration: activity.duration_minutes ? 
                  `${Math.round(activity.duration_minutes / 60)} hours` : 
                  '2 hours',
                time: activity.arrival_time || '9:00 AM',
                destination: activity.destination || dayPlan.primary_destination,
                coordinates: activityCoordinates,
                travelTime: (activity.travel_time_to_next_minutes && activity.travel_time_to_next_minutes > 0) ? {
                  duration: activity.travel_time_to_next_minutes,
                  method: activity.travel_method || 'walking',
                  fromPrevious: index > 0
                } : undefined
              };
            });
            
            aiActivities[dayPlan.day] = [...dayActivities, ...regularActivities];
          }
        });

        // Only update if we got valid activities
        if (Object.keys(aiActivities).length > 0) {
          setActivities(aiActivities);
          setTripDays(Object.keys(aiActivities).map(Number).sort((a, b) => a - b));
          
          // Create smart trip name based on distribution
          const distributionSummary = aiResult.distribution_summary;
          let tripTitle = '';
          if (distributionSummary?.destinations_covered?.length > 1) {
            tripTitle = `Multi-City Adventure: ${distributionSummary.destinations_covered.join(' & ')}`;
          } else {
            tripTitle = `AI-Optimized ${destinations[0] || destinationData[0]?.name || 'Travel'} Itinerary`;
          }
          setTripName(tripTitle);
          
          // Show success message
          setSaveSuccess(true);
          setTimeout(() => setSaveSuccess(false), 3000);
          
          console.log('✅ AI PRIMARY generation successful with even distribution:', aiActivities);
          console.log('📊 Distribution summary:', distributionSummary);
        } else {
          throw new Error("AI returned empty itinerary");
        }
      } else {
        throw new Error("AI returned invalid response structure");
      }
    } catch (error) {
      console.error('❌ AI PRIMARY generation failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'AI analysis failed';
      setGenerationError(`AI Generation Failed: ${errorMessage}. Using OpenTripMap fallback.`);
      
      // Fall back to OpenTripMap generation
      console.log('🔄 Falling back to OpenTripMap generation...');
      generateRealItinerary();
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Helper function to get coordinates for destinations
  const getCoordinatesForDestination = (destinationName: string, activityIndex: number = 0) => {
    // Try to find destination in destinationData first
    const destData = destinationData.find(d => 
      d.name.toLowerCase() === destinationName.toLowerCase() ||
      `${d.name}, ${d.country}`.toLowerCase() === destinationName.toLowerCase()
    );
    
    if (destData?.coordinates) {
      // Generate realistic coordinates around the destination
      const coordinateOffset = 0.01; // ~1km radius
      const angle = (activityIndex * 137.5) * (Math.PI / 180); // Golden angle for good distribution
      const distance = Math.random() * coordinateOffset;
      
      return {
        lat: destData.coordinates.lat + Math.cos(angle) * distance,
        lon: destData.coordinates.lon + Math.sin(angle) * distance
      };
    }
    
    // Fallback coordinate mapping
    const cityCoords: { [key: string]: { lat: number; lon: number } } = {
      'Paris': { lat: 48.8566, lon: 2.3522 },
      'Tokyo': { lat: 35.6762, lon: 139.6503 },
      'New York': { lat: 40.7128, lon: -74.0060 },
      'London': { lat: 51.5074, lon: -0.1278 },
      'Rome': { lat: 41.9028, lon: 12.4964 },
      'Barcelona': { lat: 41.3851, lon: 2.1734 },
      'Delhi': { lat: 28.6139, lon: 77.2090 },
      'Mumbai': { lat: 19.0760, lon: 72.8777 },
    };
    
    for (const [city, coords] of Object.entries(cityCoords)) {
      if (destinationName.toLowerCase().includes(city.toLowerCase())) {
        const coordinateOffset = 0.01;
        const angle = (activityIndex * 137.5) * (Math.PI / 180);
        const distance = Math.random() * coordinateOffset;
        
        return {
          lat: coords.lat + Math.cos(angle) * distance,
          lon: coords.lon + Math.sin(angle) * distance
        };
      }
    }
    
    // Final fallback
    return { lat: 28.6139, lon: 77.2090 };
  };

  // OpenTripMap generation - now the fallback method
  const generateRealItinerary = async (regenerate: boolean = false) => {
    if (destinationData.length === 0 && destinations.length === 0) {
      console.warn("No destination data available for itinerary generation");
      return;
    }

    setIsGenerating(true);
    if (!regenerate) {
      setGenerationError(""); // Only clear errors if this isn't a manual regeneration
    }

    try {
      // Prepare destination data for the generator
      const destinationsForGeneration = destinationData.length > 0 
        ? destinationData.filter(d => d.coordinates).map(d => ({
            name: d.name,
            country: d.country,
            coordinates: d.coordinates!,
            attractions: d.attractions
          }))
        : destinations.map(dest => {
            const [name, country] = dest.split(', ');
            return {
              name: name || dest,
              country: country || 'Unknown',
              coordinates: { lat: 48.8566, lon: 2.3522 }, // Fallback coordinates
              attractions: []
            };
          });

      console.log('Generating itinerary using OpenTripMap (FALLBACK METHOD):', destinationsForGeneration);

      // Generate itinerary using real data
      const itinerary: GeneratedItinerary = regenerate 
        ? await regenerateItinerary(destinationsForGeneration, preferences)
        : await generateItinerary(destinationsForGeneration, preferences);

      // Update state with generated data
      setTripName(itinerary.tripName);
      setTripDays(itinerary.days.map(d => d.day));

      // Convert generated activities to our format
      const newActivities: Record<number, Activity[]> = {};
      itinerary.days.forEach(day => {
        newActivities[day.day] = day.activities.map(activity => ({
          id: activity.id,
          name: activity.name,
          category: activity.category,
          duration: activity.duration,
          time: activity.time,
          destination: activity.destination,
          coordinates: activity.coordinates,
          xid: activity.xid
        }));
      });

      setActivities(newActivities);
      console.log('✅ OpenTripMap FALLBACK generation successful:', newActivities);

    } catch (error) {
      console.error('❌ OpenTripMap fallback also failed:', error);
      setGenerationError(error instanceof Error ? error.message : 'Both AI and OpenTripMap failed. Using static fallback.');
      
      // Final fallback to static data
      generateFallbackItinerary();
    } finally {
      setIsGenerating(false);
    }
  };

  // Get activities total for AI analysis - handle multiple destinations
  const getActivitiesTotal = async (): Promise<{
    totalActivities: number;
    days: number;
    activities: { name: string; category: string; destination: string }[];
  }> => {
    try {
      let allActivities: { name: string; category: string; destination: string }[] = [];
      
      // Process all destinations, not just the first one
      for (let i = 0; i < Math.max(destinationData.length, destinations.length); i++) {
        const lat = destinationData[i]?.coordinates?.lat ?? (i === 0 ? 28.6139 : 48.8566);
        const lon = destinationData[i]?.coordinates?.lon ?? (i === 0 ? 77.2090 : 2.3522);

        const destinationLabel = destinationData[i]
          ? `${destinationData[i].name}, ${destinationData[i].country}`
          : (destinations[i] || destinations[0] || 'Current Location');

        const url = `https://api.opentripmap.com/0.1/en/places/radius?lat=${lat}&lon=${lon}&radius=20000&limit=25&apikey=5ae2e3f221c38a28845f05b6d3d1f1385b98e981070145beb2d50a31`;
        
        try {
          const res = await fetch(url);
          const data = await res.json();

          let items: any[] = [];
          if (Array.isArray(data)) {
            items = data;
          } else if (Array.isArray(data?.features)) {
            items = data.features.map((f: any) => f.properties || f);
          }

          const destinationActivities = items
            .filter((p) => p?.name && String(p.name).trim() !== '')
            .slice(0, 25)
            .map((p) => ({
              name: p.name,
              category: p.kinds?.split(',')[0]?.replace(/_/g, ' ') || 'Attraction',
              destination: destinationLabel,
            }));

          allActivities = [...allActivities, ...destinationActivities];
        } catch (error) {
          console.error(`Error fetching activities for ${destinationLabel}:`, error);
        }
      }

      return {
        totalActivities: allActivities.length,
        days: Math.max(Math.max(destinations.length, destinationData.length) * 2, 3),
        activities: allActivities,
      };
    } catch (error) {
      console.error('getActivitiesTotal error:', error);
      return { totalActivities: 0, days: 3, activities: [] };
    }
  };

  // Initialize trip data - AI first, then fallback
  useEffect(() => {
    console.log('Initializing itinerary with data:', { destinations, destinationData, preferences });
    
    if (destinations.length > 0 || destinationData.length > 0) {
      // Try AI generation first by default
      callGroqAIAnalysis();
    } else {
      console.log("No destinations provided - using fallback");
      generateFallbackItinerary();
    }
  }, [destinations, destinationData, preferences]);

  // Detect city changes whenever activities change
  useEffect(() => {
    const changes = detectCityChanges(activities);
    setCityChanges(changes);
    console.log('Detected city changes:', changes);
  }, [activities]);

  // Enhanced fallback to handle multiple destinations
  const generateFallbackItinerary = () => {
    console.log("Using fallback itinerary generation");
    
    if (destinations.length > 0) {
      const primaryDestination = destinations[0].split(',')[0];
      const tripTitle = destinations.length > 1 
        ? `Multi-City Adventure: ${destinations.map(d => d.split(',')[0]).join(' & ')}`
        : `Your ${primaryDestination} Adventure`;
      
      setTripName(tripTitle);
      
      const dayCount = Math.min(Math.max(destinations.length * 2, 3), 7);
      setTripDays(Array.from({ length: dayCount }, (_, i) => i + 1));
      
      // Use the existing static generation as fallback
      generateMockActivities(destinations, dayCount);
    } else {
      // Default fallback
      setTripName("Sample Paris Adventure");
      setTripDays([1, 2, 3]);
      setActivities({
        1: [
          { id: "1", name: "Eiffel Tower", category: "Landmark", duration: "2 hours", time: "9:00 AM", destination: "Paris, France" },
          { id: "2", name: "Louvre Museum", category: "Museum", duration: "3 hours", time: "12:00 PM", destination: "Paris, France" },
          { id: "3", name: "Seine River Cruise", category: "Activity", duration: "1.5 hours", time: "5:00 PM", destination: "Paris, France" },
        ],
        2: [
          { id: "4", name: "Arc de Triomphe", category: "Landmark", duration: "1 hour", time: "10:00 AM", destination: "Paris, France" },
          { id: "5", name: "Champs-Élysées", category: "Shopping", duration: "2 hours", time: "12:00 PM", destination: "Paris, France" },
          { id: "6", name: "Sacré-Cœur", category: "Landmark", duration: "1.5 hours", time: "4:00 PM", destination: "Paris, France" },
        ],
        3: [
          { id: "7", name: "Versailles Palace", category: "Historic Site", duration: "4 hours", time: "9:00 AM", destination: "Versailles, France" },
          { id: "8", name: "Latin Quarter", category: "Neighborhood", duration: "2 hours", time: "3:00 PM", destination: "Paris, France" },
        ],
      });
    }
  };

  // Update generateMockActivities to better handle multiple destinations
  const generateMockActivities = (dests: string[], dayCount: number) => {
    console.log("Generating activities for destinations:", dests);
    
    // Enhanced activity pools per destination type
    const getActivitiesForDestination = (destination: string) => {
      const destLower = destination.toLowerCase();
      
      if (destLower.includes('paris')) {
        return [
          { name: "Eiffel Tower", category: "Landmark", duration: "2 hours" },
          { name: "Louvre Museum", category: "Museum", duration: "3 hours" },
          { name: "Notre-Dame Cathedral", category: "Historic Site", duration: "1.5 hours" },
          { name: "Seine River Cruise", category: "Activity", duration: "1.5 hours" },
          { name: "Champs-Élysées", category: "Shopping", duration: "2 hours" },
          { name: "Montmartre District", category: "Culture", duration: "3 hours" },
        ];
      } else if (destLower.includes('tokyo')) {
        return [
          { name: "Senso-ji Temple", category: "Religious Site", duration: "2 hours" },
          { name: "Tokyo Skytree", category: "Landmark", duration: "1.5 hours" },
          { name: "Tsukiji Outer Market", category: "Food", duration: "2 hours" },
          { name: "Shibuya Crossing", category: "Culture", duration: "1 hour" },
          { name: "Meiji Shrine", category: "Religious Site", duration: "2 hours" },
          { name: "Harajuku District", category: "Shopping", duration: "2.5 hours" },
        ];
      } else if (destLower.includes('new york')) {
        return [
          { name: "Central Park", category: "Nature", duration: "3 hours" },
          { name: "Statue of Liberty", category: "Landmark", duration: "4 hours" },
          { name: "Times Square", category: "Entertainment", duration: "2 hours" },
          { name: "9/11 Memorial", category: "Historic Site", duration: "2 hours" },
          { name: "Brooklyn Bridge", category: "Landmark", duration: "1.5 hours" },
          { name: "High Line Park", category: "Nature", duration: "2 hours" },
        ];
      } else if (destLower.includes('london')) {
        return [
          { name: "Tower of London", category: "Historic Site", duration: "3 hours" },
          { name: "British Museum", category: "Museum", duration: "3 hours" },
          { name: "Big Ben & Parliament", category: "Landmark", duration: "1 hour" },
          { name: "Thames River Cruise", category: "Activity", duration: "1.5 hours" },
          { name: "Covent Garden", category: "Shopping", duration: "2 hours" },
          { name: "Hyde Park", category: "Nature", duration: "2 hours" },
        ];
      } else if (destLower.includes('rome')) {
        return [
          { name: "Colosseum", category: "Historic Site", duration: "3 hours" },
          { name: "Vatican Museums", category: "Museum", duration: "4 hours" },
          { name: "Trevi Fountain", category: "Landmark", duration: "1 hour" },
          { name: "Roman Forum", category: "Historic Site", duration: "2.5 hours" },
          { name: "Pantheon", category: "Historic Site", duration: "1 hour" },
          { name: "Spanish Steps", category: "Landmark", duration: "1 hour" },
        ];
      } else if (destLower.includes('barcelona')) {
        return [
          { name: "Sagrada Familia", category: "Architecture", duration: "2.5 hours" },
          { name: "Park Güell", category: "Nature", duration: "2 hours" },
          { name: "Gothic Quarter", category: "Historic Site", duration: "3 hours" },
          { name: "Las Ramblas", category: "Culture", duration: "2 hours" },
          { name: "Casa Batlló", category: "Architecture", duration: "1.5 hours" },
          { name: "Barceloneta Beach", category: "Beach", duration: "3 hours" },
        ];
      } else {
        // Generic activities for unknown destinations
        return [
          { name: `${destination.split(',')[0]} City Center`, category: "Culture", duration: "2 hours" },
          { name: `Local Art Museum`, category: "Museum", duration: "2.5 hours" },
          { name: `Traditional Market`, category: "Food", duration: "1.5 hours" },
          { name: `Historic District`, category: "Historic Site", duration: "3 hours" },
          { name: `Main Cathedral`, category: "Religious Site", duration: "1.5 hours" },
          { name: `City Park`, category: "Nature", duration: "2 hours" },
        ];
      }
    };

    const newActivities: Record<number, Activity[]> = {};
    const times = ["9:00 AM", "11:30 AM", "2:00 PM", "4:30 PM", "7:00 PM"];
    
    for (let day = 1; day <= dayCount; day++) {
      const dayActivities: Activity[] = [];
      const activitiesPerDay = Math.min(3 + Math.floor(Math.random() * 2), 4);
      
      // Better distribution across multiple destinations
      const destIndex = Math.floor((day - 1) / Math.ceil(dayCount / dests.length)) % dests.length;
      const primaryDestination = dests[destIndex] || dests[0];
      const availableActivities = getActivitiesForDestination(primaryDestination);
      
      // Shuffle activities to get variety
      const shuffledActivities = [...availableActivities].sort(() => Math.random() - 0.5);
      
      for (let i = 0; i < activitiesPerDay && i < shuffledActivities.length; i++) {
        const activity = shuffledActivities[i];
        
        dayActivities.push({
          id: `${day}-${i}`,
          name: activity.name,
          category: activity.category,
          duration: activity.duration,
          time: times[i] || "6:00 PM",
          destination: primaryDestination,
        });
      }
      
      newActivities[day] = dayActivities;
    }
    
    console.log("Generated activities for all destinations:", newActivities);
    setActivities(newActivities);
  };

  // Save trip to Firebase
  const handleSaveTrip = async () => {
    try {
      const tripData = {
        destinations,
        preferences,
        tripName,
        activities,
        tripDays,
        savedAt: new Date().toISOString()
      };

      // Save to localStorage
      const tripId = Date.now().toString();
      localStorage.setItem(`trip_${tripId}`, JSON.stringify(tripData));
      
      // Show success animation
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
      
      console.log('Trip saved locally! 🎉');
      
    } catch (error) {
      console.error('Error saving trip:', error);
    }
  };

  // Simple share functionality
  const handleShareTrip = () => {
    if (navigator.share) {
      navigator.share({
        title: tripName,
        text: `Check out my ${tripName} itinerary!`,
        url: window.location.href,
      });
    } else {
      // Fallback: copy URL to clipboard
      navigator.clipboard.writeText(window.location.href);
      console.log('Trip URL copied to clipboard!');
    }
  };

  // Regenerate itinerary on button click
  const handleRegenerateItinerary = async () => {
    await generateRealItinerary(true); // Pass true for regeneration
  };

  // Enhanced edit activity function
  const handleEditActivity = (activity: Activity) => {
    setEditingActivity(activity);
    setIsEditDialogOpen(true);
  };

  const handleSaveEditedActivity = (updatedActivity: Activity) => {
    if (editingActivity) {
      // Find which day this activity belongs to
      let targetDay = selectedDay;
      for (const [day, dayActivities] of Object.entries(activities)) {
        if (dayActivities.find(a => a.id === editingActivity.id)) {
          targetDay = parseInt(day);
          break;
        }
      }

      setActivities(prev => ({
        ...prev,
        [targetDay]: prev[targetDay]?.map(activity => 
          activity.id === updatedActivity.id ? updatedActivity : activity
        ) || []
      }));

      // Show success feedback
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    }
    setEditingActivity(null);
  };

  const handleCloseEditDialog = () => {
    setIsEditDialogOpen(false);
    setEditingActivity(null);
  };

  // Edit activity function
  const editActivity = (dayNumber: number, updatedActivity: Activity) => {
    setActivities(prev => ({
      ...prev,
      [dayNumber]: prev[dayNumber]?.map(activity => 
        activity.id === updatedActivity.id ? updatedActivity : activity
      ) || []
    }));
    setEditingActivity(null);
  };

  // Add new activity function
  const addActivity = (dayNumber: number) => {
    const newActivity: Activity = {
      id: `custom-${Date.now()}`,
      name: "New Activity",
      category: "Custom",
      duration: "1 hour",
      time: "2:00 PM",
      destination: destinations[0] || "Current Location"
    };
    
    setActivities(prev => ({
      ...prev,
      [dayNumber]: [...(prev[dayNumber] || []), newActivity]
    }));
  };

  // Handle drag and drop reordering
  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    const { source, destination } = result;
    
    // Only handle reordering within the same day for now
    if (source.droppableId === destination.droppableId) {
      const dayNumber = parseInt(source.droppableId.replace('day-', ''));
      const dayActivities = [...(activities[dayNumber] || [])];
      
      // Reorder activities
      const [reorderedItem] = dayActivities.splice(source.index, 1);
      dayActivities.splice(destination.index, 0, reorderedItem);
      
      // Update times to maintain chronological order
      const times = ["9:00 AM", "11:00 AM", "1:00 PM", "3:00 PM", "5:00 PM", "7:00 PM", "8:00 PM"];
      const updatedActivities = dayActivities.map((activity, index) => ({
        ...activity,
        time: times[index] || `${7 + Math.floor(index / 6)}:00 PM`
      }));

      setActivities(prev => ({
        ...prev,
        [dayNumber]: updatedActivities
      }));

      // Show feedback
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 1000);
    }
  };

  const dayColors = {
    1: "#2563eb", // blue-600
    2: "#16a34a", // green-600
    3: "#9333ea", // purple-600
    4: "#ea580c", // orange-600
    5: "#dc2626", // red-600
  };

  const dayColorClasses = {
    1: "bg-blue-600",
    2: "bg-green-600", 
    3: "bg-purple-600",
    4: "bg-orange-600",
    5: "bg-red-600",
  };

  const totalActivities = Object.values(activities).flat().length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="container mx-auto px-4 py-6 border-b border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <MapPin className="h-6 w-6 text-blue-600" />
            <span className="text-xl font-bold text-blue-800">TravelPlan</span>
          </Link>
          
          <div className="flex items-center gap-3">
            {/* AI Generation Button - now primary */}
            <Button 
              variant="outline" 
              onClick={callGroqAIAnalysis}
              disabled={isAnalyzing || isGenerating}
              className="gap-2 bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200 hover:from-purple-100 hover:to-pink-100"
            >
              {isAnalyzing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 text-purple-600" />
              )}
              {isAnalyzing ? "AI Generating..." : "🚀 Regenerate with AI"}
            </Button>

            {/* OpenTripMap Button - now fallback/alternative */}
            <Button 
              variant="outline" 
              onClick={() => generateRealItinerary(true)}
              disabled={isGenerating || isAnalyzing}
              className="gap-2"
            >
              {isGenerating ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              {isGenerating ? "Generating..." : "Alternative: Use OpenTripMap"}
            </Button>
            
            <motion.div
              animate={saveSuccess ? { scale: [1, 1.1, 1] } : {}}
              transition={{ duration: 0.3 }}
            >
              <Button 
                variant="outline" 
                onClick={handleShareTrip}
                className="gap-2"
              >
                <Share2 className="h-4 w-4" />
                Share Trip
              </Button>
            </motion.div>
            
            <Button variant="outline" asChild>
              <Link to="/destinations">Back</Link>
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Error Message */}
        {generationError && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">
              ⚠️ {generationError}. Showing fallback data.
            </p>
          </div>
        )}

        {/* No destinations warning */}
        {destinations.length === 0 && destinationData.length === 0 && (
          <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              ⚠️ No destinations provided. This appears to be a direct page access. 
              <Link to="/destinations" className="underline font-medium ml-1">
                Please select destinations first
              </Link>
            </p>
          </div>
        )}

        {/* AI Status indicator - now primary */}
        {aiAnalysis && (
          <motion.div 
            className="mb-4 p-4 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <p className="text-sm text-purple-800">
              🤖 <strong>AI-Generated Itinerary:</strong> Primary generation using Llama 4 Maverick with {aiAnalysis.itinerary?.length || 0} days, intelligent scheduling, and food breaks at 1:00 PM
            </p>
          </motion.div>
        )}

        {/* OpenTripMap Status indicator - now fallback */}
        {destinationData.length > 0 && !aiAnalysis && !generationError && (
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              🗺️ <strong>OpenTripMap Fallback:</strong> Using real attraction data • {totalActivities} activities generated from geographic database
            </p>
          </div>
        )}

        <motion.div 
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-4xl font-bold mb-2 text-blue-800">{tripName}</h1>
          <div className="flex items-center gap-4 text-gray-600">
            <span className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {tripDays.length}-day itinerary • {totalActivities} activities
            </span>
            {destinations.length > 0 && (
              <span>• {destinations.length} destination{destinations.length !== 1 ? 's' : ''}</span>
            )}
          </div>
          
          {/* Show selected destinations */}
          {destinations.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {destinations.map((dest) => (
                <Badge key={dest} variant="secondary" className="bg-blue-100 text-blue-800">
                  {dest}
                </Badge>
              ))}
            </div>
          )}
          
          {/* Show preferences */}
          {preferences.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="text-sm text-gray-500 mr-2">Preferences:</span>
              {preferences.map((pref) => (
                <Badge key={pref} variant="outline" className="text-xs">
                  {pref}
                </Badge>
              ))}
            </div>
          )}
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Section - Map */}
          <div className="lg:col-span-2">
            <Card className="p-6 mb-6 bg-white border border-gray-200 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2 text-gray-800">
                  <MapPin className="h-5 w-5 text-blue-600" />
                  Interactive Itinerary Map
                </h3>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {totalActivities} real attractions
                  </Badge>
                  <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                    Live API data
                  </Badge>
                </div>
              </div>
              
              <ItineraryMap 
                dayActivities={tripDays.map(day => ({
                  day,
                  activities: (activities[day] || []).map(activity => ({
                    ...activity,
                    coordinates: activity.coordinates || { lat: 48.8566, lon: 2.3522 }
                  })),
                  color: dayColors[day as keyof typeof dayColors]
                }))}
                selectedDay={selectedDay}
              />

              {/* Map Legend */}
              <div className="mt-4 p-4 bg-gradient-to-r from-gray-50 to-slate-50 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-gray-700">Day Legend</span>
                  <span className="text-xs text-gray-500">Click markers for activity details</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {tripDays.map((day) => (
                    <div 
                      key={day} 
                      className={`flex items-center gap-2 px-3 py-1 rounded-md text-xs font-medium transition-all ${
                        selectedDay === day 
                          ? 'bg-white shadow-md border-2 border-gray-300' 
                          : 'bg-white/50 border border-gray-200'
                      }`}
                    >
                      <div 
                        className="w-3 h-3 rounded-full border border-white shadow-sm" 
                        style={{ backgroundColor: dayColors[day as keyof typeof dayColors] }}
                      />
                      <span className="text-gray-700">
                        Day {day} ({activities[day]?.length || 0})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            {/* Timeline */}
            <Card className="p-6 bg-white border border-gray-200 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2 text-gray-800">
                  <Calendar className="h-5 w-5 text-blue-600" />
                  Day-by-Day Timeline
                  {aiAnalysis && (
                    <Badge variant="outline" className="text-xs bg-purple-100 text-purple-700">
                      🤖 AI-Primary
                    </Badge>
                  )}
                  {!aiAnalysis && destinationData.length > 0 && (
                    <Badge variant="outline" className="text-xs bg-blue-100 text-blue-700">
                      📍 OpenTripMap
                    </Badge>
                  )}
                </h3>
                
                {/* AI Regenerate Button */}
                {!isAnalyzing && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={callGroqAIAnalysis}
                    className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                  >
                    <Sparkles className="h-4 w-4 mr-1" />
                    {aiAnalysis ? "Regenerate AI" : "Try AI Generation"}
                  </Button>
                )}
              </div>

              {/* Day Selector */}
              <div className="flex gap-2 mb-6 overflow-x-auto">
                {tripDays.map((day) => (
                  <Button
                    key={day}
                    onClick={() => setSelectedDay(day)}
                    variant={selectedDay === day ? "default" : "outline"}
                    className={`whitespace-nowrap ${
                      selectedDay === day
                        ? `${dayColorClasses[day as keyof typeof dayColorClasses]} text-white hover:opacity-90`
                        : ""
                    }`}
                  >
                    Day {day} ({activities[day]?.length || 0})
                  </Button>
                ))}
              </div>

              {/* Activities List with Drag and Drop */}
              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId={`day-${selectedDay}`}>
                  {(provided, snapshot) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className={`space-y-4 ${snapshot.isDraggingOver ? 'bg-blue-50/30 rounded-lg p-2' : ''}`}
                    >
                      {/* Intercity Travel Indicator at the beginning of the day */}
                      {cityChanges.find(change => change.day === selectedDay) && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-600 rounded-lg">
                              <Route className="h-5 w-5 text-white" />
                            </div>
                            <div className="flex-1">
                              <h4 className="font-semibold text-blue-800 mb-1">
                                Intercity Travel Required
                              </h4>
                              <div className="flex flex-wrap items-center gap-2 text-sm">
                                <span className="text-blue-700">
                                  {cityChanges.find(change => change.day === selectedDay)?.fromCity} → {cityChanges.find(change => change.day === selectedDay)?.toCity}
                                </span>
                                <Badge variant="outline" className="bg-blue-100 text-blue-700">
                                  {formatDuration(cityChanges.find(change => change.day === selectedDay)?.travelInfo.duration || 0)} by {cityChanges.find(change => change.day === selectedDay)?.travelInfo.method}
                                </Badge>
                                <Badge variant="outline" className="bg-green-100 text-green-700">
                                  {cityChanges.find(change => change.day === selectedDay)?.travelInfo.distance}km
                                </Badge>
                                {cityChanges.find(change => change.day === selectedDay)?.travelInfo.cost && (
                                  <Badge variant="outline" className="bg-yellow-100 text-yellow-700">
                                    ~${cityChanges.find(change => change.day === selectedDay)?.travelInfo.cost}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-blue-600 mt-1">
                                💡 Plan to depart early morning or arrive the evening before
                              </p>
                            </div>
                          </div>
                        </motion.div>
                      )}

                      {activities[selectedDay]?.map((activity, index) => (
                        <Draggable 
                          key={activity.id} 
                          draggableId={activity.id} 
                          index={index}
                        >
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={`${snapshot.isDragging ? 'rotate-2 scale-105 shadow-2xl' : ''} transition-all duration-200`}
                            >
                              {/* Travel Time Indicator */}
                              {activity.travelTime && activity.travelTime.fromPrevious && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: "auto" }}
                                  className="mb-2 p-3 bg-amber-50 border border-amber-200 rounded-lg"
                                >
                                  <div className="flex items-center gap-2 text-amber-800">
                                    <Route className="h-4 w-4" />
                                    <span className="text-sm font-medium">
                                      Travel time: {formatDuration(activity.travelTime.duration)}
                                    </span>
                                    <Badge variant="outline" className="text-xs bg-amber-100 text-amber-700">
                                      {activity.travelTime.method}
                                    </Badge>
                                    {aiAnalysis && (
                                      <Badge variant="outline" className="text-xs bg-purple-100 text-purple-700">
                                        AI-Calculated
                                      </Badge>
                                    )}
                                  </div>
                                </motion.div>
                              )}
                              
                              <Card className={`p-4 hover:shadow-md transition-shadow border-l-4 border-l-blue-600 bg-white ${
                                snapshot.isDragging ? 'shadow-2xl border-blue-400' : ''
                              }`}>
                                <div className="flex items-start justify-between">
                                  {/* Drag Handle */}
                                  <div 
                                    {...provided.dragHandleProps}
                                    className="flex items-start gap-3 flex-1 cursor-grab active:cursor-grabbing"
                                  >
                                    <div className="flex flex-col items-center text-gray-400 mt-1">
                                      <div className="w-1 h-1 bg-gray-400 rounded-full mb-1"></div>
                                      <div className="w-1 h-1 bg-gray-400 rounded-full mb-1"></div>
                                      <div className="w-1 h-1 bg-gray-400 rounded-full mb-1"></div>
                                      <div className="w-1 h-1 bg-gray-400 rounded-full mb-1"></div>
                                      <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                                    </div>
                                    
                                    <div className="flex-1">
                                      <div className="flex items-center gap-3 mb-2">
                                        <Badge 
                                          variant="secondary" 
                                          className="text-xs"
                                          style={{ backgroundColor: dayColors[selectedDay as keyof typeof dayColors] + '20' }}
                                        >
                                          #{index + 1} • {activity.category}
                                        </Badge>
                                        <span className="text-sm text-gray-500 flex items-center gap-1">
                                          <Clock className="h-3 w-3" />
                                          {activity.time}
                                        </span>
                                        {activity.coordinates && (
                                          <Badge variant="outline" className="text-xs bg-green-50 text-green-700">
                                            📍 Real Location
                                          </Badge>
                                        )}
                                        {activity.id.startsWith('ai-') && (
                                          <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700">
                                            🤖 AI-Suggested
                                          </Badge>
                                        )}
                                      </div>
                                      <h4 className="text-lg font-semibold mb-1 text-gray-800">{activity.name}</h4>
                                      <p className="text-sm text-gray-600 mb-1">
                                        Duration: {activity.duration}
                                      </p>
                                      {activity.destination && (
                                        <p className="text-xs text-gray-500">
                                          📍 {activity.destination}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  
                                  <div className="flex gap-2 ml-3">
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      className="h-8 w-8 p-0 hover:bg-blue-50"
                                      onClick={() => handleEditActivity(activity)}
                                      title="Edit activity"
                                    >
                                      <Edit3 className="h-4 w-4 text-blue-600" />
                                    </Button>
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                      onClick={() => deleteActivity(selectedDay, activity.id)}
                                      title="Delete activity"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              </Card>
                            </div>
                          )}
                        </Draggable>
                      )) || (
                        <div className="text-center py-8 text-gray-500">
                          <Calendar className="h-12 w-12 mx-auto mb-4 opacity-30" />
                          <p>No activities for this day yet</p>
                          <div className="flex gap-2 justify-center mt-4">
                            <Button 
                              variant="outline" 
                              onClick={callGroqAIAnalysis}
                              disabled={isAnalyzing}
                              className="bg-purple-50 hover:bg-purple-100"
                            >
                              {isAnalyzing ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              ) : (
                                <Sparkles className="h-4 w-4 mr-2 text-purple-600" />
                              )}
                              Generate with AI
                            </Button>
                            <Button 
                              variant="outline" 
                              onClick={() => generateRealItinerary(true)}
                              disabled={isGenerating}
                              size="sm"
                            >
                              {isGenerating ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              ) : (
                                <RefreshCw className="h-4 w-4 mr-2" />
                              )}
                              Use OpenTripMap
                            </Button>
                          </div>
                        </div>
                      )}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>

              {/* Enhanced Add Activity Button */}
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button 
                  variant="outline" 
                  className="w-full mt-4 border-dashed border-2 hover:border-blue-300 hover:bg-blue-50"
                  onClick={handleOpenAddActivity}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Activity to Day {selectedDay}
                </Button>
              </motion.div>
            </Card>
          </div>

          {/* Right Section - Enhanced Trip Summary */}
          <div>
            <Card className="p-6 sticky top-8 bg-white border border-gray-200 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Trip Summary</h3>
                {aiAnalysis && (
                  <Badge variant="outline" className="text-xs bg-purple-100 text-purple-700">
                    🤖 AI-Enhanced
                  </Badge>
                )}
              </div>
              
              {/* Enhanced Stats Component */}
              <TripStats 
                activities={activities}
                tripDays={tripDays}
                destinations={destinations}
              />

              <div className="mt-6 space-y-3">
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button 
                    onClick={handleSaveTrip}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white relative overflow-hidden"
                  >
                    <AnimatePresence mode="wait">
                      {saveSuccess ? (
                        <motion.div
                          key="success"
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0 }}
                          className="flex items-center gap-2"
                        >
                          <Check className="h-4 w-4" />
                          Saved Locally! 🎉
                        </motion.div>
                      ) : (
                        <motion.div
                          key="save"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                        >
                          Save Trip Locally
                        </motion.div>
                      )}
                    </AnimatePresence>
                    
                    {saveSuccess && (
                      <motion.div
                        className="absolute inset-0 bg-green-400"
                        initial={{ scale: 0, borderRadius: "50%" }}
                        animate={{ scale: 2, borderRadius: "0%" }}
                        transition={{ duration: 0.6 }}
                        style={{ zIndex: -1 }}
                      />
                    )}
                  </Button>
                </motion.div>
              </div>

              {/* Export Options */}
              <div className="mt-6">
                <TripExport
                  tripName={tripName}
                  activities={activities}
                  tripDays={tripDays}
                  destinations={destinations}
                />
              </div>

              <motion.div 
                className="mt-6 p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 }}
              >
                <p className="text-sm text-purple-800">
                  🎯 <strong>AI-First Approach:</strong> We prioritize Llama 4 Maverick AI for intelligent scheduling with 1:00 PM food breaks. OpenTripMap provides geographic fallback when needed!
                </p>
              </motion.div>
            </Card>
          </div>
        </div>
      </div>

      {/* Edit Activity Dialog */}
      <EditActivityDialog
        activity={editingActivity}
        isOpen={isEditDialogOpen}
        onClose={handleCloseEditDialog}
        onSave={handleSaveEditedActivity}
      />

      {/* Add Activity Sheet/Modal */}
      <Sheet open={isAddActivityOpen} onOpenChange={setIsAddActivityOpen}>
        <SheetContent side="right" className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-blue-600" />
              Add Activity - Day {selectedDay}
            </SheetTitle>
            <SheetDescription>
              Discover nearby attractions and add them to your itinerary
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <Input
                placeholder="Search nearby places..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                  onClick={() => setSearchQuery('')}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Loading State */}
            {isLoadingPlaces && (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4" />
                <p className="text-sm text-gray-500">Finding nearby attractions...</p>
              </div>
            )}

            {/* Places List */}
            {!isLoadingPlaces && filteredNearbyPlaces.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm text-gray-500">
                  Found {filteredNearbyPlaces.length} nearby places
                </p>
                
                {filteredNearbyPlaces.map((place) => (
                  <motion.div
                    key={place.xid}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Card className="p-4 hover:shadow-md transition-shadow">
                      <div className="flex gap-3">
                        {place.preview && (
                          <img 
                            src={place.preview} 
                            alt={place.name}
                            className="w-20 h-20 object-cover rounded-md flex-shrink-0"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        )}
                        
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-gray-800 mb-1 truncate">
                            {place.name}
                          </h4>
                          
                          <div className="flex flex-wrap gap-2 mb-2">
                            <Badge variant="secondary" className="text-xs">
                              {place.kinds?.split(',')[0]?.replace(/_/g, ' ')}
                            </Badge>
                            {place.rate > 0 && (
                              <Badge variant="outline" className="text-xs">
                                ⭐ {place.rate}/7
                              </Badge>
                            )}
                          </div>
                          
                          <p className="text-xs text-gray-500">
                            📍 {place.distance > 1000 
                              ? `${(place.distance / 1000).toFixed(1)}km away`
                              : `${Math.round(place.distance)}m away`
                            }
                          </p>
                        </div>

                        <Button
                          size="sm"
                          onClick={() => {
                            handleAddPlace(place);
                            setIsAddActivityOpen(false);
                          }}
                          className="self-start flex-shrink-0"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Empty State */}
            {!isLoadingPlaces && filteredNearbyPlaces.length === 0 && (
              <div className="text-center py-12">
                <MapPin className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p className="text-gray-500">
                  {searchQuery ? 'No places found matching your search' : 'No nearby places found'}
                </p>
                <p className="text-sm text-gray-400 mt-2">
                  Try widening your search area or check back later
                </p>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default Itinerary;
