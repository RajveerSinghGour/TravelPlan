import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Clock, MapPin, Calendar, Tag, Edit3 } from "lucide-react";

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

interface EditActivityDialogProps {
  activity: Activity | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedActivity: Activity) => void;
}

const EditActivityDialog = ({ activity, isOpen, onClose, onSave }: EditActivityDialogProps) => {
  const [formData, setFormData] = useState<Activity | null>(null);

  // Time slots for dropdown
  const timeSlots = [
    "6:00 AM", "7:00 AM", "8:00 AM", "9:00 AM", "10:00 AM", "11:00 AM",
    "12:00 PM", "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM", "5:00 PM",
    "6:00 PM", "7:00 PM", "8:00 PM", "9:00 PM", "10:00 PM"
  ];

  // Duration options
  const durationOptions = [
    "30 minutes", "1 hour", "1.5 hours", "2 hours", "2.5 hours", 
    "3 hours", "3.5 hours", "4 hours", "5 hours", "6 hours", "All day"
  ];

  // Activity categories
  const categories = [
    "Culture", "Food", "Nature", "Shopping", "Entertainment", "Historic Site",
    "Museum", "Landmark", "Architecture", "Beach", "Religious Site", 
    "Activity", "Transportation", "Custom", "AI Suggested", "Intercity Travel"
  ];

  useEffect(() => {
    if (activity) {
      setFormData({ ...activity });
    }
  }, [activity]);

  const handleSave = () => {
    if (formData) {
      onSave(formData);
      onClose();
    }
  };

  const handleInputChange = (field: keyof Activity, value: string) => {
    if (formData) {
      setFormData({
        ...formData,
        [field]: value
      });
    }
  };

  if (!formData) return null;

  const isAIActivity = formData.id.startsWith('ai-');
  const isTravelActivity = formData.category === 'Intercity Travel';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit3 className="h-5 w-5 text-blue-600" />
            Edit Activity
          </DialogTitle>
          <DialogDescription>
            Make changes to your activity details. Click save when you're done.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Activity Type Badges */}
          <div className="flex flex-wrap gap-2">
            {isAIActivity && (
              <Badge variant="outline" className="bg-purple-50 text-purple-700">
                🤖 AI-Generated
              </Badge>
            )}
            {isTravelActivity && (
              <Badge variant="outline" className="bg-blue-50 text-blue-700">
                🚗 Travel Activity
              </Badge>
            )}
            {formData.coordinates && (
              <Badge variant="outline" className="bg-green-50 text-green-700">
                📍 Real Location
              </Badge>
            )}
          </div>

          {/* Activity Name */}
          <div className="space-y-2">
            <Label htmlFor="activity-name" className="flex items-center gap-2">
              <Tag className="h-4 w-4" />
              Activity Name
            </Label>
            <Input
              id="activity-name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Enter activity name"
              className="w-full"
            />
          </div>

          {/* Time and Duration Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="activity-time" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Start Time
              </Label>
              <Select 
                value={formData.time} 
                onValueChange={(value) => handleInputChange('time', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select time" />
                </SelectTrigger>
                <SelectContent>
                  {timeSlots.map((time) => (
                    <SelectItem key={time} value={time}>
                      {time}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="activity-duration" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Duration
              </Label>
              <Select 
                value={formData.duration} 
                onValueChange={(value) => handleInputChange('duration', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent>
                  {durationOptions.map((duration) => (
                    <SelectItem key={duration} value={duration}>
                      {duration}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="activity-category">Category</Label>
            <Select 
              value={formData.category} 
              onValueChange={(value) => handleInputChange('category', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Destination */}
          <div className="space-y-2">
            <Label htmlFor="activity-destination" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Destination
            </Label>
            <Input
              id="activity-destination"
              value={formData.destination}
              onChange={(e) => handleInputChange('destination', e.target.value)}
              placeholder="Enter destination"
              className="w-full"
            />
          </div>

          {/* Travel Time Info (if applicable) */}
          {formData.travelTime && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <h4 className="font-medium text-amber-800 mb-2">Travel Information</h4>
              <div className="text-sm text-amber-700 space-y-1">
                <p>🕒 Travel time: {formData.travelTime.duration} minutes</p>
                <p>🚶 Method: {formData.travelTime.method}</p>
                <p>📍 From previous activity: {formData.travelTime.fromPrevious ? 'Yes' : 'No'}</p>
              </div>
            </div>
          )}

          {/* Coordinates Info (if available) */}
          {formData.coordinates && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <h4 className="font-medium text-green-800 mb-2">Location Details</h4>
              <div className="text-sm text-green-700">
                <p>📍 Latitude: {formData.coordinates.lat.toFixed(6)}</p>
                <p>📍 Longitude: {formData.coordinates.lon.toFixed(6)}</p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditActivityDialog;
