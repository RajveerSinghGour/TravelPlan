import Groq from "groq-sdk";

// Initialize Groq client with browser compatibility (ONLY FOR DEMO/DEVELOPMENT)
// WARNING: This exposes your API key in the browser. In production, move this to a backend service.
const groq = new Groq({
  apiKey: "",
  dangerouslyAllowBrowser: true, // Enable browser usage for demo purposes
});

// Function to call the Llama 4 Maverick model
export async function generateWithLlama(prompt: string) {
  try {
    const chatCompletion = await groq.chat.completions.create({
      model: "meta-llama/llama-4-maverick-17b-128e-instruct",
      messages: [
        {
          role: "system",
          content: "You are a helpful AI travel planner and general assistant.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 512,
    });

    return chatCompletion.choices[0]?.message?.content ?? "";
  } catch (error) {
    console.error("Error calling Llama model:", error);
    return "⚠️ Sorry, I ran into an issue generating a response.";
  }
}

export async function analyzeItinerary(activitiesJSON: any) {
  try {
    console.log("Starting AI analysis with data:", activitiesJSON);

    // Validate input data
    if (!activitiesJSON || !activitiesJSON.activities || activitiesJSON.activities.length === 0) {
      throw new Error("No activities data provided for analysis");
    }

    // Group activities by destination for better distribution
    const activitiesByDestination = activitiesJSON.activities.reduce((acc: any, activity: any) => {
      const destination = activity.destination;
      if (!acc[destination]) {
        acc[destination] = [];
      }
      acc[destination].push(activity);
      return acc;
    }, {});

    const destinations = Object.keys(activitiesByDestination);
    const totalDays = activitiesJSON.days;
    const daysPerDestination = Math.ceil(totalDays / destinations.length);

    console.log('Destinations found:', destinations);
    console.log('Days per destination:', daysPerDestination);

    const prompt = `
You are an expert AI travel planner that creates optimized multi-city itineraries with intelligent travel time calculations.

DESTINATION ANALYSIS:
- Available destinations: ${destinations.join(', ')}
- Total trip days: ${totalDays}
- Recommended days per destination: ${daysPerDestination}
- Total activities: ${activitiesJSON.totalActivities}

TRAVEL TIME CALCULATION RULES:
- Within same city: 5-30 minutes between activities
- Between different cities: Calculate based on distance
  * 0-50km: 1-2 hours by car/train
  * 50-200km: 2-4 hours by train/car
  * 200-500km: 3-6 hours by train or 1-2 hours by flight + airport time
  * 500km+: 2-4 hours by flight including airport procedures

DISTRIBUTION REQUIREMENTS:
1. Allocate approximately ${daysPerDestination} days per destination
2. Group consecutive days by destination to minimize intercity travel
3. Plan intercity travel for early morning or evening to maximize activity time
4. Include mandatory 1:00 PM food breaks daily
5. Balance activity types across all destinations

INPUT DATA:
${JSON.stringify(activitiesJSON, null, 2)}

REQUIRED JSON OUTPUT:
{
  "itinerary": [
    {
      "day": 1,
      "primary_destination": "City name from destinations",
      "intercity_travel": {
        "required": false,
        "from_city": null,
        "to_city": null,
        "estimated_duration_minutes": 0,
        "method": null,
        "departure_time": null
      },
      "activities": [
        {
          "order": 1,
          "activity": "EXACT name from input list",
          "destination": "destination from input",
          "category": "category from input",
          "cost": 25,
          "arrival_time": "9:00 AM",
          "duration_minutes": 120,
          "travel_time_to_next_minutes": 15,
          "travel_method": "walking/taxi/metro"
        },
        {
          "order": 2,
          "activity": "Local Restaurant Lunch",
          "destination": "same as primary_destination",
          "category": "Food",
          "cost": 35,
          "arrival_time": "1:00 PM",
          "duration_minutes": 90,
          "travel_time_to_next_minutes": 20,
          "travel_method": "walking"
        }
      ]
    }
  ],
  "distribution_summary": {
    "destinations_covered": ["City1", "City2"],
    "days_per_destination": {"City1": 2, "City2": 3},
    "total_intercity_transfers": 1,
    "estimated_total_travel_time_hours": 4.5
  }
}

CRITICAL OPTIMIZATION RULES:
1. EVEN DISTRIBUTION: Ensure ${daysPerDestination} ± 1 days per destination
2. MINIMIZE TRANSFERS: Group consecutive days by destination
3. SMART TIMING: Schedule intercity travel for 6-8 AM or after 6 PM
4. ACTIVITY BALANCE: Mix categories (culture, food, nature, etc.) across destinations
5. REALISTIC TIMING: Account for actual travel distances between cities
6. USE EXACT NAMES: Only use activity names from the provided input list
7. MANDATORY LUNCH: Always include food activity at 1:00 PM

Return ONLY valid JSON with no explanations or markdown formatting.
`;

    console.log("Sending enhanced multi-city prompt to Groq API...");

    const chatCompletion = await groq.chat.completions.create({
      model: "meta-llama/llama-4-maverick-17b-128e-instruct",
      messages: [
        {
          role: "system",
          content: "You are an expert multi-city travel planner. You must distribute days evenly across destinations and calculate realistic intercity travel times. Return only valid JSON responses using exact activity names from input data.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.4, // Lower temperature for more consistent distribution
      max_tokens: 3072, // Increased for multi-city responses
    });

    let rawResponse = chatCompletion.choices[0]?.message?.content ?? "";
    console.log("Raw multi-city response from Llama model:", rawResponse);

    // Clean up the response - remove markdown formatting if present
    rawResponse = rawResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    // Try to parse the JSON
    let parsed;
    try {
      parsed = JSON.parse(rawResponse);
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      
      // Try to extract JSON from the response if it's wrapped in text
      const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Could not parse AI response as JSON");
      }
    }

    // Validate the parsed response structure
    if (!parsed.itinerary || !Array.isArray(parsed.itinerary)) {
      throw new Error("Invalid AI response structure - missing itinerary array");
    }

    console.log("Successfully parsed multi-city AI response:", parsed);
    return parsed;

  } catch (error) {
    console.error("Error analyzing multi-city itinerary:", error);
    
    // Enhanced fallback with destination distribution
    const destinations = Object.keys(activitiesJSON.activities.reduce((acc: any, activity: any) => {
      acc[activity.destination] = true;
      return acc;
    }, {}));

    const fallback = {
      itinerary: destinations.slice(0, 2).map((destination, index) => ({
        day: index + 1,
        primary_destination: destination,
        intercity_travel: {
          required: index > 0,
          from_city: index > 0 ? destinations[index - 1] : null,
          to_city: index > 0 ? destination : null,
          estimated_duration_minutes: index > 0 ? 240 : 0,
          method: index > 0 ? "flight" : null,
          departure_time: index > 0 ? "7:00 AM" : null
        },
        activities: [
          {
            order: 1,
            activity: activitiesJSON.activities.find((a: any) => a.destination === destination)?.name || "City Walking Tour",
            destination: destination,
            category: "Culture",
            cost: 25,
            arrival_time: index > 0 ? "11:00 AM" : "9:00 AM",
            duration_minutes: 120,
            travel_time_to_next_minutes: 15,
            travel_method: "walking"
          },
          {
            order: 2,
            activity: "Local Restaurant Lunch",
            destination: destination,
            category: "Food",
            cost: 35,
            arrival_time: "1:00 PM",
            duration_minutes: 90,
            travel_time_to_next_minutes: 20,
            travel_method: "walking"
          },
          {
            order: 3,
            activity: activitiesJSON.activities.filter((a: any) => a.destination === destination)[1]?.name || "Museum Visit",
            destination: destination,
            category: "Culture",
            cost: 20,
            arrival_time: "3:30 PM",
            duration_minutes: 150,
            travel_time_to_next_minutes: 0,
            travel_method: "walking"
          }
        ]
      })),
      distribution_summary: {
        destinations_covered: destinations.slice(0, 2),
        days_per_destination: destinations.slice(0, 2).reduce((acc: any, dest, index) => {
          acc[dest] = 1;
          return acc;
        }, {}),
        total_intercity_transfers: 1,
        estimated_total_travel_time_hours: 4
      }
    };

    console.log("Returning enhanced multi-city fallback itinerary:", fallback);
    return fallback;
  }
}
