import { Link } from "react-router-dom";
import { MapPin, ArrowLeft, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center px-4 max-w-md mx-auto">
        <div className="flex items-center justify-center mb-6">
          <div className="p-4 bg-blue-600 rounded-xl shadow-lg">
            <MapPin className="h-12 w-12 text-white" />
          </div>
        </div>
        
        <h1 className="text-6xl font-bold text-gray-800 mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-gray-700 mb-4">Page Not Found</h2>
        <p className="text-gray-600 mb-8 leading-relaxed">
          Looks like this destination doesn't exist on our map. Let's get you back on track to plan your next adventure!
        </p>
        
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild className="bg-blue-600 hover:bg-blue-700 text-white">
            <Link to="/">
              <Home className="mr-2 h-4 w-4" />
              Back to Home
            </Link>
          </Button>
          
          <Button variant="outline" asChild>
            <Link to="/destinations">
              <MapPin className="mr-2 h-4 w-4" />
              Plan a Trip
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
