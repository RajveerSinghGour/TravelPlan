// Function to parse duration string to minutes
export function parseDuration(duration: string): number {
  if (!duration) return 0;
  
  const hourMatch = duration.match(/(\d+(?:\.\d+)?)\s*hours?/i);
  const minuteMatch = duration.match(/(\d+)\s*(?:minutes?|mins?)/i);
  
  let totalMinutes = 0;
  
  if (hourMatch) {
    totalMinutes += parseFloat(hourMatch[1]) * 60;
  }
  
  if (minuteMatch) {
    totalMinutes += parseInt(minuteMatch[1]);
  }
  
  return totalMinutes;
}

// Function to format minutes to readable duration
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}min`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  
  return `${hours}h ${remainingMinutes}min`;
}

// Function to calculate distance between two coordinates using Haversine formula
export function calculateDistance(
  lat1: number, 
  lon1: number, 
  lat2: number, 
  lon2: number
): number {
  const R = 6371; // Radius of Earth in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in kilometers
}

// Function to estimate travel time between cities
export function estimateIntercityTravelTime(
  distance: number,
  method: 'flight' | 'train' | 'car' | 'bus' = 'flight'
): {
  duration: number; // in minutes
  method: string;
  cost?: number;
} {
  // Average speeds (km/h) and costs (USD)
  const travelMethods = {
    flight: { speed: 500, cost: 150, timeOverhead: 180 }, // 3 hours for airport procedures
    train: { speed: 80, cost: 50, timeOverhead: 60 }, // 1 hour for station procedures
    car: { speed: 60, cost: 100, timeOverhead: 30 }, // 30 min for breaks/fuel
    bus: { speed: 50, cost: 30, timeOverhead: 45 } // 45 min for stops
  };

  // Choose best method based on distance
  let chosenMethod = method;
  if (distance > 500) {
    chosenMethod = 'flight';
  } else if (distance > 200) {
    chosenMethod = 'train';
  } else if (distance > 50) {
    chosenMethod = 'car';
  } else {
    chosenMethod = 'car'; // Short distances
  }

  const methodData = travelMethods[chosenMethod];
  const travelTime = (distance / methodData.speed) * 60; // Convert to minutes
  const totalTime = travelTime + methodData.timeOverhead;

  return {
    duration: Math.round(totalTime),
    method: chosenMethod,
    cost: Math.round(methodData.cost * (distance / 100)) // Scale cost by distance
  };
}

// Function to detect city changes in itinerary
export function detectCityChanges(activities: Record<number, any[]>) {
  const cityChanges: Array<{
    day: number;
    fromCity: string;
    toCity: string;
    travelInfo: {
      duration: number;
      method: string;
      cost?: number;
      distance: number;
    }
  }> = [];

  const days = Object.keys(activities).map(Number).sort((a, b) => a - b);
  
  for (let i = 0; i < days.length - 1; i++) {
    const currentDay = days[i];
    const nextDay = days[i + 1];
    
    const currentDayActivities = activities[currentDay] || [];
    const nextDayActivities = activities[nextDay] || [];
    
    if (currentDayActivities.length > 0 && nextDayActivities.length > 0) {
      const lastActivityToday = currentDayActivities[currentDayActivities.length - 1];
      const firstActivityTomorrow = nextDayActivities[0];
      
      // Extract city from destination
      const currentCity = extractCityFromDestination(lastActivityToday.destination);
      const nextCity = extractCityFromDestination(firstActivityTomorrow.destination);
      
      if (currentCity !== nextCity && lastActivityToday.coordinates && firstActivityTomorrow.coordinates) {
        const distance = calculateDistance(
          lastActivityToday.coordinates.lat,
          lastActivityToday.coordinates.lon,
          firstActivityTomorrow.coordinates.lat,
          firstActivityTomorrow.coordinates.lon
        );
        
        // Only consider it a city change if distance > 50km
        if (distance > 50) {
          const travelInfo = estimateIntercityTravelTime(distance);
          
          cityChanges.push({
            day: nextDay,
            fromCity: currentCity,
            toCity: nextCity,
            travelInfo: {
              ...travelInfo,
              distance: Math.round(distance)
            }
          });
        }
      }
    }
  }
  
  return cityChanges;
}

// Helper function to extract city from destination string
function extractCityFromDestination(destination: string): string {
  if (!destination) return 'Unknown';
  
  // Handle formats like "Paris, France" or "Tokyo, Japan"
  const parts = destination.split(',');
  return parts[0].trim();
}

// Function to add travel time between activities
export function addTravelTime(activities: any[], coordinates: { lat: number; lon: number }[] = []): any[] {
  if (activities.length <= 1) return activities;

  return activities.map((activity, index) => {
    if (index === 0) {
      // First activity doesn't have travel time from previous
      return activity;
    }

    const prevActivity = activities[index - 1];
    let travelTime = 0;
    let method = 'walking';

    // If we have coordinates for both activities, calculate actual distance
    if (prevActivity.coordinates && activity.coordinates) {
      const distance = calculateDistance(
        prevActivity.coordinates.lat,
        prevActivity.coordinates.lon,
        activity.coordinates.lat,
        activity.coordinates.lon
      );

      // Determine travel method and time based on distance
      if (distance < 0.5) {
        // Less than 500m - walking
        travelTime = Math.max(5, Math.round(distance * 1000 / 80)); // 80m/min walking speed
        method = 'walking';
      } else if (distance < 2) {
        // Less than 2km - walking or short transport
        travelTime = Math.max(10, Math.round(distance * 15)); // ~4km/h walking
        method = 'walking';
      } else if (distance < 10) {
        // Less than 10km - local transport
        travelTime = Math.max(15, Math.round(distance * 5)); // ~12km/h with stops
        method = 'taxi/metro';
      } else {
        // Longer distances - faster transport
        travelTime = Math.max(20, Math.round(distance * 3)); // ~20km/h with traffic
        method = 'taxi/car';
      }
    } else {
      // Fallback: estimate based on activity order
      travelTime = 10 + Math.floor(Math.random() * 20); // 10-30 minutes
      method = 'walking';
    }

    return {
      ...activity,
      travelTime: {
        duration: travelTime,
        method: method,
        fromPrevious: true
      }
    };
  });
}

// Function to calculate total travel time for a day
export function calculateDayTravelTime(activities: any[]): number {
  return activities.reduce((total, activity) => {
    if (activity.travelTime && activity.travelTime.fromPrevious) {
      return total + activity.travelTime.duration;
    }
    return total;
  }, 0);
}

// Function to optimize activity order by minimizing travel time
export function optimizeActivityOrder(activities: any[]): any[] {
  if (activities.length <= 2) return activities;

  // Simple nearest neighbor optimization for activities with coordinates
  const activitiesWithCoords = activities.filter(a => a.coordinates);
  const activitiesWithoutCoords = activities.filter(a => !a.coordinates);

  if (activitiesWithCoords.length <= 1) {
    return activities; // Can't optimize without coordinates
  }

  let optimized = [activitiesWithCoords[0]]; // Start with first activity
  let remaining = activitiesWithCoords.slice(1);

  // Nearest neighbor algorithm
  while (remaining.length > 0) {
    const current = optimized[optimized.length - 1];
    let nearestIndex = 0;
    let shortestDistance = Infinity;

    remaining.forEach((activity, index) => {
      const distance = calculateDistance(
        current.coordinates.lat,
        current.coordinates.lon,
        activity.coordinates.lat,
        activity.coordinates.lon
      );

      if (distance < shortestDistance) {
        shortestDistance = distance;
        nearestIndex = index;
      }
    });

    optimized.push(remaining[nearestIndex]);
    remaining.splice(nearestIndex, 1);
  }

  // Insert activities without coordinates at reasonable positions
  activitiesWithoutCoords.forEach(activity => {
    const insertIndex = Math.floor(optimized.length / 2); // Insert in middle
    optimized.splice(insertIndex, 0, activity);
  });

  return optimized;
}

// Function to calculate travel time between two points
export function calculateTravelTime(
  fromCoords: { lat: number; lon: number },
  toCoords: { lat: number; lon: number },
  method: 'walking' | 'driving' | 'transit' = 'walking'
): {
  duration: number; // in minutes
  distance: number; // in kilometers
  method: string;
} {
  const distance = calculateDistance(
    fromCoords.lat,
    fromCoords.lon,
    toCoords.lat,
    toCoords.lon
  );

  // Average speeds for different transport methods (km/h)
  const speeds = {
    walking: 5,      // 5 km/h
    driving: 30,     // 30 km/h in city traffic
    transit: 20      // 20 km/h with stops
  };

  // Choose appropriate method based on distance
  let chosenMethod = method;
  if (distance > 10) {
    chosenMethod = 'driving';
  } else if (distance > 2) {
    chosenMethod = 'transit';
  } else {
    chosenMethod = 'walking';
  }

  const speed = speeds[chosenMethod];
  const duration = Math.max(5, Math.round((distance / speed) * 60)); // Minimum 5 minutes

  return {
    duration,
    distance: Math.round(distance * 100) / 100, // Round to 2 decimal places
    method: chosenMethod
  };
}

// Function to check if two activities are in the same city
export function isSameCity(destination1: string, destination2: string): boolean {
  if (!destination1 || !destination2) return false;
  
  const city1 = extractCityFromDestination(destination1);
  const city2 = extractCityFromDestination(destination2);
  
  return city1.toLowerCase() === city2.toLowerCase();
}

// Function to generate realistic activity times
export function generateActivityTimes(activitiesCount: number, startTime: string = "9:00 AM"): string[] {
  const times: string[] = [];
  const baseTimeSlots = [
    "9:00 AM", "10:30 AM", "12:00 PM", "1:30 PM", 
    "3:00 PM", "4:30 PM", "6:00 PM", "7:30 PM"
  ];
  
  for (let i = 0; i < activitiesCount && i < baseTimeSlots.length; i++) {
    times.push(baseTimeSlots[i]);
  }
  
  // If we need more times, generate them
  while (times.length < activitiesCount) {
    const lastTime = times[times.length - 1];
    const nextTime = addHoursToTime(lastTime, 1.5);
    times.push(nextTime);
  }
  
  return times;
}

// Helper function to add hours to a time string
function addHoursToTime(timeStr: string, hours: number): string {
  const [time, period] = timeStr.split(' ');
  const [hourStr, minuteStr] = time.split(':');
  let hour = parseInt(hourStr);
  const minute = parseInt(minuteStr);
  
  // Convert to 24-hour format
  if (period === 'PM' && hour !== 12) hour += 12;
  if (period === 'AM' && hour === 12) hour = 0;
  
  // Add hours
  const totalMinutes = hour * 60 + minute + hours * 60;
  let newHour = Math.floor(totalMinutes / 60) % 24;
  const newMinute = Math.floor(totalMinutes % 60);
  
  // Convert back to 12-hour format
  const newPeriod = newHour >= 12 ? 'PM' : 'AM';
  if (newHour === 0) newHour = 12;
  if (newHour > 12) newHour -= 12;
  
  return `${newHour}:${newMinute.toString().padStart(2, '0')} ${newPeriod}`;
}

// Function to validate coordinates
export function isValidCoordinates(lat: number, lon: number): boolean {
  return lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
}

// Function to get travel method based on distance
export function getTravelMethod(distance: number): 'walking' | 'taxi' | 'metro' | 'car' | 'flight' | 'train' {
  if (distance < 0.5) return 'walking';
  if (distance < 2) return 'walking';
  if (distance < 10) return 'metro';
  if (distance < 50) return 'car';
  if (distance < 200) return 'car';
  if (distance < 500) return 'train';
  return 'flight';
}

// Function to estimate cost based on distance and method
export function estimateCost(distance: number, method: string): number {
  const costPerKm = {
    walking: 0,
    metro: 2,
    taxi: 3,
    car: 0.5,
    train: 0.1,
    flight: 0.15
  };
  
  const baseCost = {
    walking: 0,
    metro: 5,
    taxi: 10,
    car: 20,
    train: 25,
    flight: 100
  };
  
  const rate = (costPerKm as any)[method] || 1;
  const base = (baseCost as any)[method] || 10;
  
  return Math.round(base + distance * rate);
}

// Function to format time duration for display
export function formatTime(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}min`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  
  return `${hours}h ${remainingMinutes}min`;
}

// Function to calculate walking time between coordinates
export function calculateWalkingTime(
  fromCoords: { lat: number; lon: number },
  toCoords: { lat: number; lon: number }
): number {
  const distance = calculateDistance(fromCoords.lat, fromCoords.lon, toCoords.lat, toCoords.lon);
  const walkingSpeedKmh = 5; // 5 km/h average walking speed
  const walkingTimeHours = distance / walkingSpeedKmh;
  return Math.max(5, Math.round(walkingTimeHours * 60)); // Minimum 5 minutes
}

// Function to generate activity coordinates around a center point
export function generateNearbyCoordinates(
  center: { lat: number; lon: number },
  count: number,
  radiusKm: number = 5
): Array<{ lat: number; lon: number }> {
  const coordinates: Array<{ lat: number; lon: number }> = [];
  
  for (let i = 0; i < count; i++) {
    const angle = (i * 137.5) * (Math.PI / 180); // Golden angle for good distribution
    const distance = Math.random() * radiusKm;
    
    // Convert distance to degrees (approximate)
    const latOffset = (distance / 111.32) * Math.cos(angle);
    const lonOffset = (distance / (111.32 * Math.cos(center.lat * Math.PI / 180))) * Math.sin(angle);
    
    coordinates.push({
      lat: center.lat + latOffset,
      lon: center.lon + lonOffset
    });
  }
  
  return coordinates;
}
