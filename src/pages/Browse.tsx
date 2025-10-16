import { Plane, Calendar, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { getCoordinates } from "@/lib/opentripmap";

const Browse = () => {
  const navigate = useNavigate();
  const premadeTrips = [
    {
      id: 1,
      title: "Paris Romance",
      city: "Paris",
      country: "France",
      description: "A perfect 3-day romantic getaway through the City of Light",
      duration: "3 days",
      image: "🗼",
      color: "from-red-400/20 to-pink-400/20",
    },
    {
      id: 2,
      title: "Tokyo Adventure",
      city: "Tokyo",
      country: "Japan",
      description: "Explore ancient temples and modern culture in 5 exciting days",
      duration: "5 days",
      image: "🗾",
      color: "from-blue-400/20 to-purple-400/20",
    },
    {
      id: 3,
      title: "Barcelona Highlights",
      city: "Barcelona",
      country: "Spain",
      description: "Art, architecture, and beaches in this 4-day Spanish escape",
      duration: "4 days",
      image: "🏖️",
      color: "from-orange-400/20 to-yellow-400/20",
    },
    {
      id: 4,
      title: "New York Experience",
      city: "New York",
      country: "USA",
      description: "The ultimate 4-day guide to the Big Apple",
      duration: "4 days",
      image: "🗽",
      color: "from-green-400/20 to-blue-400/20",
    },
    {
      id: 5,
      title: "Bali Paradise",
      city: "Bali",
      country: "Indonesia",
      description: "Beach, culture, and relaxation in 6 tropical days",
      duration: "6 days",
      image: "🌴",
      color: "from-emerald-400/20 to-teal-400/20",
    },
    {
      id: 6,
      title: "Rome History Tour",
      city: "Rome",
      country: "Italy",
      description: "Ancient wonders and Italian cuisine in 3 unforgettable days",
      duration: "3 days",
      image: "🏛️",
      color: "from-amber-400/20 to-orange-400/20",
    },
  ];

  const handleSelectPremade = async (trip: any) => {
    const fullDestination = `${trip.city}, ${trip.country}`;
    const geo = await getCoordinates(fullDestination);

    navigate("/itinerary", {
      state: {
        destinations: [fullDestination], // Send full destination string
        preferences: [],
        destinationData: [
          {
            name: trip.city,
            country: trip.country,
            coordinates: geo ? { lat: geo.lat, lon: geo.lon } : undefined,
          },
        ],
      },
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <motion.header 
        className="container mx-auto px-4 py-6 border-b border-gray-200 bg-white sticky top-0 z-50 shadow-sm"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <motion.div
              className="p-2 bg-blue-600 rounded-xl shadow-md"
              whileHover={{ rotate: 360, scale: 1.1 }}
              transition={{ duration: 0.8 }}
            >
              <Plane className="h-6 w-6 text-white" />
            </motion.div>
            <span className="text-2xl font-bold text-blue-800">
              TravelPlan
            </span>
          </Link>
          
          <Button variant="outline" asChild className="shadow-sm">
            <Link to="/">Back to Home</Link>
          </Button>
        </div>
      </motion.header>

      <div className="container mx-auto px-4 py-12">
        <motion.div
          className="mb-12 text-center"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <motion.h1
            className="text-5xl md:text-6xl font-extrabold mb-4 text-blue-800"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            Premade Trip Collections
          </motion.h1>
          <motion.p
            className="text-xl text-gray-600 max-w-2xl mx-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.6 }}
          >
            Handcrafted itineraries from popular destinations around the world
          </motion.p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {premadeTrips.map((trip, index) => (
            <motion.div
              key={trip.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 * index }}
              whileHover={{ y: -8, scale: 1.02 }}
              className="group"
            >
              <Card className="h-full border border-gray-200 shadow-lg hover:shadow-2xl transition-all overflow-hidden bg-white relative">
                <motion.div
                  className={`absolute inset-0 bg-gradient-to-br ${trip.color} opacity-0 group-hover:opacity-100 transition-opacity`}
                  initial={false}
                />
                <CardHeader className="p-0 relative z-10">
                  <div className="relative w-full h-56 bg-gray-100 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                    <motion.div 
                      className="absolute inset-0 flex items-center justify-center"
                      whileHover={{ scale: 1.2, rotate: [0, -5, 5, 0] }}
                      transition={{ duration: 0.6 }}
                    >
                      <span className="text-7xl drop-shadow-lg">{trip.image}</span>
                    </motion.div>
                    <div className="absolute bottom-4 left-4 right-4">
                      <motion.span
                        className="inline-flex items-center gap-2 px-3 py-1 bg-white/90 rounded-full text-xs font-semibold text-gray-700 shadow-sm"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.2 * index }}
                      >
                        <Calendar className="h-3 w-3" />
                        {trip.duration}
                      </motion.span>
                    </div>
                  </div>
                  <div className="p-6 relative z-10">
                    <CardTitle className="text-2xl mb-2 text-gray-800 group-hover:text-blue-800 transition-colors">
                      {trip.title}
                    </CardTitle>
                    <CardDescription className="text-base text-gray-600">
                      {trip.description}
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="px-6 pb-6 relative z-10">
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button 
                      className="w-full shadow-md bg-blue-600 hover:bg-blue-700 text-white group-hover:scale-105 transition-transform" 
                      onClick={() => handleSelectPremade(trip)}
                    >
                      View Itinerary
                      <motion.div
                        className="ml-2"
                        animate={{ x: [0, 3, 0] }}
                        transition={{ repeat: Infinity, duration: 1.5 }}
                      >
                        <ArrowRight className="h-4 w-4" />
                      </motion.div>
                    </Button>
                  </motion.div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Call to Action */}
        <motion.div
          className="mt-16 text-center"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.2 }}
        >
          <div className="p-8 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-200 max-w-2xl mx-auto">
            <motion.h2
              className="text-2xl font-bold text-blue-800 mb-4"
              animate={{ scale: [1, 1.02, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              Don't see your dream destination?
            </motion.h2>
            <p className="text-blue-700 mb-6">
              Create a personalized itinerary with our AI-powered trip planner!
            </p>
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button 
                size="lg" 
                className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
                asChild
              >
                <Link to="/destinations">
                  Create Custom Trip
                  <motion.div
                    className="ml-2"
                    animate={{ x: [0, 5, 0] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                  >
                    <ArrowRight className="h-5 w-5" />
                  </motion.div>
                </Link>
              </Button>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Browse;
