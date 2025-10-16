import { 
  getAttractionsNearby, 
  categorizeAttraction, 
  getEstimatedDuration,
  getPlaceDetails,
  SimpleFeature 
} from './opentripmap';
import { 
  calculateTravelTime, 
  addTravelTime, 
  parseDuration, 
  formatDuration,
  isSameCity
} from './travelTimeCalculator';

interface Destination {
  name: string;
  country: string;
  coordinates: { lat: number; lon: number };
  attractions?: SimpleFeature[];
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
  travelTime?: {
    duration: number;
    method: string;
    fromPrevious: boolean;
  };
}

interface ItineraryDay {
  day: number;
  activities: GeneratedActivity[];
}

export interface GeneratedItinerary {
  tripName: string;
  days: ItineraryDay[];
  totalActivities: number;
}

// Generate time slots for activities
const generateTimeSlots = (startHour: number = 9, endHour: number = 18): string[] => {
  const slots: string[] = [];
  for (let hour = startHour; hour < endHour; hour += 2.5) {
    const wholeHour = Math.floor(hour);
    const minutes = hour % 1 === 0 ? 0 : 30;
    const time = wholeHour <= 12 ? 
      `${wholeHour}:${minutes.toString().padStart(2, '0')} AM` : 
      `${wholeHour - 12}:${minutes.toString().padStart(2, '0')} PM`;
    slots.push(time);
  }
  return slots;
};

// Enhanced scoring system for attraction selection
const scoreAttraction = (attraction: SimpleFeature, selectedCategories: Set<string>): number => {
  let score = 0;
  
  // Skip attractions without proper names
  if (!attraction.name || attraction.name.length < 3) {
    return -100;
  }
  
  // Skip very generic or unclear names
  const genericNames = ['attraction', 'place', 'point', 'location', 'site', 'area', 'zone'];
  if (genericNames.some(generic => attraction.name.toLowerCase().includes(generic))) {
    score -= 50;
  }
  
  // Proximity scoring
  if (attraction.dist !== undefined) {
    const distanceKm = attraction.dist / 1000;
    if (distanceKm < 0.5) score -= 20;
    else if (distanceKm < 2) score += 15;
    else if (distanceKm < 5) score += 10;
    else if (distanceKm < 8) score += 5;
    else score -= 10;
  }
  
  // Category diversity bonus
  const category = categorizeAttraction(attraction.kinds);
  if (!selectedCategories.has(category)) {
    score += 8;
  } else {
    score -= 3;
  }
  
  // Popular attraction types get higher scores
  const kinds = attraction.kinds.toLowerCase();
  
  if (kinds.includes('museums')) score += 12;
  if (kinds.includes('historic')) score += 10;
  if (kinds.includes('architecture')) score += 8;
  if (kinds.includes('monuments')) score += 8;
  if (kinds.includes('churches') || kinds.includes('cathedrals')) score += 7;
  if (kinds.includes('palaces')) score += 9;
  if (kinds.includes('castles')) score += 9;
  if (kinds.includes('parks')) score += 6;
  if (kinds.includes('squares')) score += 5;
  if (kinds.includes('bridges')) score += 4;
  if (kinds.includes('towers')) score += 6;
  if (kinds.includes('galleries')) score += 7;
  
  // Penalize less interesting categories
  if (kinds.includes('administrative')) score -= 30;
  if (kinds.includes('industrial')) score -= 25;
  if (kinds.includes('military')) score -= 15;
  if (kinds.includes('transport')) score -= 20;
  
  return score;
};

// Generate itinerary for a single destination
const generateDestinationItinerary = async (
  destination: Destination,
  preferences: string[],
  daysAvailable: number
): Promise<GeneratedActivity[]> => {
  console.log(`Generating itinerary for ${destination.name}, ${destination.country}`);
  
  // Fetch attractions if not already available
  let attractions = destination.attractions;
  if (!attractions || attractions.length === 0) {
    attractions = await getAttractionsNearby(
      destination.coordinates,
      8000,
      "interesting_places",
      30
    );
  }

  if (attractions.length === 0) {
    console.warn(`No attractions found for ${destination.name}`);
    return [];
  }

  // Score and sort attractions
  const selectedCategories = new Set<string>();
  const scoredAttractions = attractions
    .map(attraction => ({
      attraction,
      score: scoreAttraction(attraction, selectedCategories)
    }))
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score);

  // Select top attractions
  const activitiesPerDay = Math.min(4, Math.ceil(scoredAttractions.length / daysAvailable));
  const totalActivities = Math.min(activitiesPerDay * daysAvailable, scoredAttractions.length);
  
  const timeSlots = generateTimeSlots();
  const activities: GeneratedActivity[] = [];

  for (let i = 0; i < totalActivities; i++) {
    const { attraction } = scoredAttractions[i];
    const category = categorizeAttraction(attraction.kinds);
    selectedCategories.add(category);

    const activity: GeneratedActivity = {
      id: `${destination.name.replace(/\s+/g, '_')}_${i + 1}`,
      name: attraction.name || `Attraction ${i + 1}`,
      category,
      duration: getEstimatedDuration(attraction.kinds),
      time: timeSlots[i % timeSlots.length],
      destination: `${destination.name}, ${destination.country}`,
      coordinates: attraction.point,
      xid: attraction.xid,
    };

    activities.push(activity);
  }

  return activities;
};

// Enhanced time slot generation with realistic scheduling
const generateRealisticSchedule = (
  activities: SimpleFeature[],
  startTime: string = "9:00 AM"
): GeneratedActivity[] => {
  if (activities.length === 0) return [];

  const scheduledActivities: GeneratedActivity[] = [];
  let currentTime = startTime;

  activities.forEach((attraction, index) => {
    let travelInfo = undefined;
    
    // Calculate travel time from previous location
    if (index > 0) {
      const prevActivity = scheduledActivities[index - 1];
      const travelTime = calculateTravelTime(
        prevActivity.coordinates,
        attraction.point
      );
      
      // Add travel time to current time
      currentTime = addTravelTime(currentTime, travelTime.duration);
      
      travelInfo = {
        duration: travelTime.duration,
        method: travelTime.method,
        fromPrevious: true
      };
    }

    const activity: GeneratedActivity = {
      id: `activity_${index + 1}`,
      name: attraction.name || `Attraction ${index + 1}`,
      category: categorizeAttraction(attraction.kinds),
      duration: getEstimatedDuration(attraction.kinds),
      time: currentTime,
      destination: `${attraction.point.lat.toFixed(4)}, ${attraction.point.lon.toFixed(4)}`,
      coordinates: attraction.point,
      xid: attraction.xid,
      travelTime: travelInfo
    };

    scheduledActivities.push(activity);

    // Add activity duration to current time for next activity
    const activityDuration = parseDuration(activity.duration);
    currentTime = addTravelTime(currentTime, activityDuration);
  });

  return scheduledActivities;
};

// Distribute activities across days
const distributeActivitiesAcrossDays = (
  allActivities: GeneratedActivity[],
  dayCount: number,
  destinations: Destination[]
): ItineraryDay[] => {
  const days: ItineraryDay[] = [];

  // Group activities by city/destination first
  const activitiesByCity: { [city: string]: GeneratedActivity[] } = {};
  
  allActivities.forEach(activity => {
    const cityKey = findDestinationCity(activity.coordinates, destinations);
    if (!activitiesByCity[cityKey]) {
      activitiesByCity[cityKey] = [];
    }
    activitiesByCity[cityKey].push(activity);
  });

  const cities = Object.keys(activitiesByCity);
  
  // Distribute days among cities based on activity count
  const cityDayAllocation: { [city: string]: number } = {};
  let remainingDays = dayCount;
  
  cities.forEach((city, index) => {
    const activityCount = activitiesByCity[city].length;
    const suggestedDays = Math.max(1, Math.ceil(activityCount / 4)); // Max 4 activities per day
    
    if (index === cities.length - 1) {
      // Last city gets remaining days
      cityDayAllocation[city] = remainingDays;
    } else {
      const allocatedDays = Math.min(suggestedDays, Math.ceil(remainingDays / (cities.length - index)));
      cityDayAllocation[city] = allocatedDays;
      remainingDays -= allocatedDays;
    }
  });

  // Create days with realistic scheduling
  let currentDay = 1;
  
  cities.forEach(city => {
    const cityActivities = activitiesByCity[city];
    const cityDays = cityDayAllocation[city];
    const activitiesPerDay = Math.ceil(cityActivities.length / cityDays);
    
    for (let dayInCity = 0; dayInCity < cityDays; dayInCity++) {
      const startIndex = dayInCity * activitiesPerDay;
      const endIndex = Math.min(startIndex + activitiesPerDay, cityActivities.length);
      const dayActivities = cityActivities.slice(startIndex, endIndex);
      
      if (dayActivities.length > 0) {
        // Generate realistic schedule for the day
        const scheduledActivities = generateRealisticSchedule(
          dayActivities.map(activity => ({
            name: activity.name,
            kinds: activity.category,
            point: activity.coordinates,
            xid: activity.xid
          } as SimpleFeature)),
          "9:00 AM"
        );

        days.push({
          day: currentDay,
          activities: scheduledActivities.map((activity, index) => ({
            ...activity,
            id: `day${currentDay}_${index + 1}`,
            destination: findDestinationName(activity.coordinates, destinations)
          }))
        });
        
        currentDay++;
      }
    }
  });

  return days;
};

// Helper function to find which destination city an activity belongs to
const findDestinationCity = (coordinates: { lat: number; lon: number }, destinations: Destination[]): string => {
  for (const dest of destinations) {
    if (isSameCity(coordinates, dest.coordinates)) {
      return `${dest.name}, ${dest.country}`;
    }
  }
  return `${coordinates.lat.toFixed(2)}, ${coordinates.lon.toFixed(2)}`;
};

// Helper function to get destination name for display
const findDestinationName = (coordinates: { lat: number; lon: number }, destinations: Destination[]): string => {
  return findDestinationCity(coordinates, destinations);
};

// Main itinerary generation function
export const generateItinerary = async (
  destinations: Destination[],
  preferences: string[] = []
): Promise<GeneratedItinerary> => {
  console.log('Starting enhanced itinerary generation with travel times...', { destinations, preferences });

  if (destinations.length === 0) {
    throw new Error('No destinations provided');
  }

  // Calculate trip duration based on destinations and distances
  const dayCount = calculateOptimalTripDuration(destinations);
  
  const firstDestination = destinations[0].name;
  const tripName = destinations.length === 1 
    ? `Your ${firstDestination} Discovery`
    : `Your ${destinations.length}-City Journey`;

  // Generate activities for all destinations
  const allActivities: GeneratedActivity[] = [];
  
  for (const destination of destinations) {
    try {
      const daysForDestination = Math.ceil(dayCount / destinations.length);
      const activities = await generateDestinationItinerary(
        destination, 
        preferences, 
        daysForDestination
      );
      allActivities.push(...activities);
    } catch (error) {
      console.error(`Error generating itinerary for ${destination.name}:`, error);
    }
  }

  if (allActivities.length === 0) {
    throw new Error('No quality activities could be generated for any destination');
  }

  // Distribute activities with travel time awareness
  const days = distributeActivitiesAcrossDays(allActivities, dayCount, destinations);

  const result: GeneratedItinerary = {
    tripName,
    days,
    totalActivities: allActivities.length
  };

  console.log('Enhanced itinerary with travel times completed:', result);
  return result;
};

// Calculate optimal trip duration based on destinations and distances
const calculateOptimalTripDuration = (destinations: Destination[]): number => {
  if (destinations.length === 1) {
    return Math.min(Math.max(2, Math.ceil(Math.random() * 2) + 2), 4); // 2-4 days for single city
  }

  // For multiple cities, consider distances between them
  let totalTravelDays = 0;
  for (let i = 1; i < destinations.length; i++) {
    const travelTime = calculateTravelTime(
      destinations[i-1].coordinates,
      destinations[i].coordinates
    );
    
    // If travel time is more than 4 hours, allocate an extra day
    if (travelTime.duration > 240) {
      totalTravelDays += 0.5; // Half day for travel
    }
  }

  const baseDays = destinations.length * 2; // 2 days per destination
  const totalDays = Math.ceil(baseDays + totalTravelDays);
  
  return Math.min(Math.max(totalDays, 3), 8); // 3-8 days max
};

// Regenerate itinerary with different selection
export const regenerateItinerary = async (
  destinations: Destination[],
  preferences: string[] = []
): Promise<GeneratedItinerary> => {
  console.log('Regenerating itinerary with different selection...');
  return await generateItinerary(destinations, preferences);
};
