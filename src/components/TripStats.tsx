import { Calendar, MapPin, Clock, TrendingUp, Star, Route, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { formatDuration, parseDuration, detectCityChanges } from "@/lib/travelTimeCalculator";

interface Activity {
  id: string;
  name: string;
  category: string;
  duration: string;
  time: string;
  destination: string;
  coordinates?: { lat: number; lon: number };
  travelTime?: { duration: number };
}

interface TripStatsProps {
  activities: Record<number, Activity[]>;
  tripDays: number[];
  destinations: string[];
  aiAnalysis?: any; // NEW: Optional AI analysis data
}

const TripStats = ({ activities, tripDays, destinations, aiAnalysis }: TripStatsProps) => {
  const totalActivities = Object.values(activities).flat().length;
  
  // Calculate total activity time and travel time
  const { totalActivityTime, totalTravelTime } = Object.values(activities).flat().reduce((acc, activity) => {
    const activityMinutes = parseDuration(activity.duration);
    const travelMinutes = activity.travelTime?.duration || 0;
    
    return {
      totalActivityTime: acc.totalActivityTime + activityMinutes,
      totalTravelTime: acc.totalTravelTime + travelMinutes
    };
  }, { totalActivityTime: 0, totalTravelTime: 0 });

  const categoryCounts = Object.values(activities).flat().reduce((acc, activity) => {
    acc[activity.category] = (acc[activity.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const topCategories = Object.entries(categoryCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3);

  const realLocationCount = Object.values(activities).flat()
    .filter(activity => activity.coordinates).length;

  const estimatedTotalHours = totalActivities * 2.5;

  // NEW: Calculate AI-specific stats
  const aiGeneratedCount = Object.values(activities).flat()
    .filter(activity => activity.id.startsWith('ai-')).length;

  const hasAIOptimization = aiGeneratedCount > 0;

  // Calculate intercity travel info
  const cityChanges = detectCityChanges(activities);
  const totalIntercityTravel = cityChanges.reduce((sum, change) => sum + change.travelInfo.duration, 0);
  const totalTravelCost = cityChanges.reduce((sum, change) => sum + (change.travelInfo.cost || 0), 0);
  
  return (
    <div className="space-y-4">
      {/* Main Stats Grid - Enhanced with Travel Stats */}
      <div className="grid grid-cols-2 gap-4">
        {/* Main Stats */}
        <motion.div
          whileHover={{ scale: 1.05 }}
          className="p-4 bg-blue-50 rounded-lg border border-blue-200"
        >
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="h-4 w-4 text-blue-600" />
            <span className="font-medium text-gray-700">Duration</span>
          </div>
          <p className="text-2xl font-bold text-blue-600">{tripDays.length} Days</p>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.05 }}
          className="p-4 bg-green-50 rounded-lg border border-green-200"
        >
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="h-4 w-4 text-green-600" />
            <span className="font-medium text-gray-700">Activities</span>
          </div>
          <p className="text-2xl font-bold text-green-600">{totalActivities}</p>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.05 }}
          className="p-4 bg-purple-50 rounded-lg border border-purple-200"
        >
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4 text-purple-600" />
            <span className="font-medium text-gray-700">Activity Time</span>
          </div>
          <p className="text-2xl font-bold text-purple-600">{formatDuration(totalActivityTime)}</p>
        </motion.div>

        {totalTravelTime > 0 && (
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="p-4 bg-orange-50 rounded-lg border border-orange-200"
          >
            <div className="flex items-center gap-2 mb-2">
              <Route className="h-4 w-4 text-orange-600" />
              <span className="font-medium text-gray-700">Travel Time</span>
            </div>
            <p className="text-2xl font-bold text-orange-600">{formatDuration(totalTravelTime)}</p>
          </motion.div>
        )}

        {hasAIOptimization && (
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="p-4 bg-purple-50 rounded-lg border border-purple-200"
          >
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-purple-600" />
              <span className="font-medium text-gray-700 text-sm">AI-Generated</span>
            </div>
            <p className="text-xl font-bold text-purple-600">{aiGeneratedCount}</p>
          </motion.div>
        )}

        {cityChanges.length > 0 && (
          <>
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="p-4 bg-indigo-50 rounded-lg border border-indigo-200"
            >
              <div className="flex items-center gap-2 mb-2">
                <Route className="h-4 w-4 text-indigo-600" />
                <span className="font-medium text-gray-700 text-sm">Cities</span>
              </div>
              <p className="text-xl font-bold text-indigo-600">{cityChanges.length + 1}</p>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.05 }}
              className="p-4 bg-cyan-50 rounded-lg border border-cyan-200"
            >
              <div className="flex items-center gap-2 mb-2">
                <Route className="h-4 w-4 text-cyan-600" />
                <span className="font-medium text-gray-700 text-sm">Travel Time</span>
              </div>
              <p className="text-xl font-bold text-cyan-600">{formatDuration(totalIntercityTravel)}</p>
            </motion.div>
          </>
        )}
      </div>

      {/* AI Enhancement Info */}
      {hasAIOptimization && (
        <Card className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-4 w-4 text-purple-600" />
            <span className="font-medium text-gray-700">AI Optimization</span>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">AI-generated activities:</span>
              <span className="font-medium text-purple-600">{aiGeneratedCount}</span>
            </div>
            {aiAnalysis && (
              <div className="flex justify-between">
                <span className="text-gray-600">Food breaks scheduled:</span>
                <span className="font-medium text-green-600">1:00 PM daily</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-600">Model used:</span>
              <span className="font-medium text-purple-600">Llama 4 Maverick</span>
            </div>
          </div>
        </Card>
      )}

      {/* Category Breakdown */}
      {topCategories.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="h-4 w-4 text-orange-600" />
            <span className="font-medium text-gray-700">Top Categories</span>
          </div>
          <div className="space-y-2">
            {topCategories.map(([category, count], index) => (
              <div key={category} className="flex items-center justify-between">
                <Badge variant="secondary" className="text-xs">
                  {category}
                </Badge>
                <div className="flex items-center gap-2">
                  <div className="w-16 bg-gray-200 rounded-full h-2">
                    <motion.div
                      className="bg-orange-500 h-2 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${(count / totalActivities) * 100}%` }}
                      transition={{ delay: index * 0.1 }}
                    />
                  </div>
                  <span className="text-xs font-medium text-gray-600">{count}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Time Breakdown */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Clock className="h-4 w-4 text-blue-600" />
          <span className="font-medium text-gray-700">Time Breakdown</span>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Activities:</span>
            <span className="font-medium text-purple-600">{formatDuration(totalActivityTime)}</span>
          </div>
          {totalTravelTime > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Travel:</span>
              <span className="font-medium text-orange-600">{formatDuration(totalTravelTime)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm border-t pt-2">
            <span className="text-gray-800 font-medium">Total:</span>
            <span className="font-bold text-blue-600">{formatDuration(totalActivityTime + totalTravelTime)}</span>
          </div>
        </div>
      </Card>

      {/* Intercity Travel Breakdown */}
      {cityChanges.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Route className="h-4 w-4 text-indigo-600" />
            <span className="font-medium text-gray-700">Intercity Travel</span>
          </div>
          <div className="space-y-2">
            {cityChanges.map((change, index) => (
              <div key={index} className="flex justify-between items-center text-sm">
                <span className="text-gray-600">
                  Day {change.day}: {change.fromCity} → {change.toCity}
                </span>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {formatDuration(change.travelInfo.duration)}
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    {change.travelInfo.method}
                  </Badge>
                </div>
              </div>
            ))}
            <div className="flex justify-between text-sm border-t pt-2 mt-2">
              <span className="text-gray-800 font-medium">Total Travel Cost:</span>
              <span className="font-bold text-indigo-600">${totalTravelCost}</span>
            </div>
          </div>
        </Card>
      )}

      {/* Data Quality */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Star className="h-4 w-4 text-yellow-600" />
          <span className="font-medium text-gray-700">Data Quality</span>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Real coordinates:</span>
            <span className="font-medium text-green-600">
              {realLocationCount}/{totalActivities} ({Math.round((realLocationCount / totalActivities) * 100)}%)
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Destinations:</span>
            <span className="font-medium text-blue-600">{destinations.length}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Avg per day:</span>
            <span className="font-medium text-purple-600">
              {(totalActivities / tripDays.length).toFixed(1)} activities
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default TripStats;
