import { Link } from "react-router-dom";
import { Plane, MapPin, Sparkles, Globe, Calendar, Heart, ArrowRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <motion.header 
        className="container mx-auto px-4 py-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="flex items-center gap-3">
          <motion.div
            className="p-2 bg-blue-600 rounded-xl shadow-lg"
            whileHover={{ rotate: 360, scale: 1.1 }}
            transition={{ duration: 0.8 }}
          >
            <Plane className="h-7 w-7 text-white" />
          </motion.div>
          <h1 className="text-3xl font-bold text-blue-800">
            TravelPlan
          </h1>
        </div>
      </motion.header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-20">
        <motion.div
          className="text-center mb-20"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <div className="mb-6">
            <motion.h2 
              className="text-6xl md:text-7xl font-extrabold mb-6 leading-tight"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              <span className="text-blue-800">
                Plan Your Perfect
              </span>
              <br />
              <span className="text-gray-800">Journey</span>
            </motion.h2>
          </div>
          
          <motion.p
            className="text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto leading-relaxed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.6 }}
          >
            Create personalized travel itineraries with AI-powered suggestions and discover amazing destinations around the world
          </motion.p>
        </motion.div>

        {/* Action Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto mb-24">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            whileHover={{ y: -8, scale: 1.02 }}
            className="group"
          >
            <Link to="/destinations">
              <Card className="h-full border border-gray-200 shadow-lg hover:shadow-2xl transition-all cursor-pointer bg-white overflow-hidden relative">
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-blue-600/10 opacity-0 group-hover:opacity-100 transition-opacity"
                  initial={false}
                />
                <CardHeader className="relative z-10">
                  <motion.div 
                    className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-md"
                    whileHover={{ rotate: [0, -10, 10, 0] }}
                    transition={{ duration: 0.6 }}
                  >
                    <MapPin className="h-8 w-8 text-white" />
                  </motion.div>
                  <CardTitle className="text-3xl font-bold mb-3 text-gray-800">Create a New Trip</CardTitle>
                  <CardDescription className="text-base text-gray-600 leading-relaxed">
                    Select your dream destinations and let AI craft the perfect itinerary tailored just for you
                  </CardDescription>
                </CardHeader>
                <CardContent className="relative z-10">
                  <Button className="w-full shadow-md bg-blue-600 hover:bg-blue-700 text-white group-hover:scale-105 transition-transform" size="lg">
                    Start Planning
                    <motion.div
                      className="ml-2"
                      animate={{ x: [0, 5, 0] }}
                      transition={{ repeat: Infinity, duration: 1.5 }}
                    >
                      <ArrowRight className="h-4 w-4" />
                    </motion.div>
                  </Button>
                </CardContent>
              </Card>
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            whileHover={{ y: -8, scale: 1.02 }}
            className="group"
          >
            <Link to="/browse">
              <Card className="h-full border border-gray-200 shadow-lg hover:shadow-2xl transition-all cursor-pointer bg-white overflow-hidden relative">
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-green-500/10 to-green-600/10 opacity-0 group-hover:opacity-100 transition-opacity"
                  initial={false}
                />
                <CardHeader className="relative z-10">
                  <motion.div 
                    className="w-16 h-16 bg-green-600 rounded-2xl flex items-center justify-center mb-6 shadow-md"
                    whileHover={{ rotate: [0, -10, 10, 0] }}
                    transition={{ duration: 0.6 }}
                  >
                    <Sparkles className="h-8 w-8 text-white" />
                  </motion.div>
                  <CardTitle className="text-3xl font-bold mb-3 text-gray-800">Browse Premade Trips</CardTitle>
                  <CardDescription className="text-base text-gray-600 leading-relaxed">
                    Explore curated travel itineraries handpicked by travel experts and wanderers
                  </CardDescription>
                </CardHeader>
                <CardContent className="relative z-10">
                  <Button className="w-full shadow-md bg-green-600 hover:bg-green-700 text-white group-hover:scale-105 transition-transform" size="lg">
                    Explore Trips
                    <motion.div
                      className="ml-2"
                      animate={{ x: [0, 5, 0] }}
                      transition={{ repeat: Infinity, duration: 1.5 }}
                    >
                      <ArrowRight className="h-4 w-4" />
                    </motion.div>
                  </Button>
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        </div>

        {/* Features */}
        <motion.div
          className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
        >
          {[
            { icon: Globe, title: "AI-Powered", desc: "Smart itinerary suggestions", color: "text-blue-600" },
            { icon: Calendar, title: "Flexible Planning", desc: "Customize every detail", color: "text-green-600" },
            { icon: Heart, title: "Save & Share", desc: "Keep your favorite trips", color: "text-red-600" }
          ].map((feature, i) => (
            <motion.div
              key={feature.title}
              className="text-center p-6 rounded-2xl bg-white border border-gray-200 hover:border-blue-300 transition-all hover:shadow-lg group"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1 + i * 0.1 }}
              whileHover={{ y: -5 }}
            >
              <motion.div 
                className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:bg-blue-200 transition-colors"
                whileHover={{ rotate: 360 }}
                transition={{ duration: 0.6 }}
              >
                <feature.icon className={`h-6 w-6 ${feature.color}`} />
              </motion.div>
              <h3 className="font-semibold text-lg mb-2 text-gray-800">{feature.title}</h3>
              <p className="text-sm text-gray-600">{feature.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </main>
    </div>
  );
}
