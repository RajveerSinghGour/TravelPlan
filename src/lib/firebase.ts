import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';

// Firebase configuration (you'll need to add your own config)
const firebaseConfig = {
  // Replace with your Firebase config
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com", 
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-app-id"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

export interface TripData {
  trip_id: string;
  created_at: any;
  updated_at: any;
  destinations: string[];
  preferences: string[];
  tripName: string;
  activities: Record<number, any[]>;
  tripDays: number[];
  share_token: string;
  is_public: boolean;
}

// Generate unique trip ID and share token
export const generateTripId = (): string => uuidv4();
export const generateShareToken = (): string => uuidv4().replace(/-/g, '').substring(0, 16);

// Save trip to Firestore
export const saveTrip = async (tripData: Omit<TripData, 'trip_id' | 'created_at' | 'updated_at' | 'share_token'>): Promise<{ tripId: string; shareToken: string }> => {
  try {
    const tripId = generateTripId();
    const shareToken = generateShareToken();
    
    const fullTripData: TripData = {
      ...tripData,
      trip_id: tripId,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
      share_token: shareToken,
      is_public: true
    };

    await setDoc(doc(db, 'trips', tripId), fullTripData);
    
    // Store trip ID in localStorage for user's session
    const userTrips = JSON.parse(localStorage.getItem('userTrips') || '[]');
    userTrips.push(tripId);
    localStorage.setItem('userTrips', JSON.stringify(userTrips));
    
    return { tripId, shareToken };
  } catch (error) {
    console.error('Error saving trip:', error);
    throw new Error('Failed to save trip');
  }
};

// Load trip from Firestore
export const loadTrip = async (tripId: string): Promise<TripData | null> => {
  try {
    const docRef = doc(db, 'trips', tripId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return docSnap.data() as TripData;
    } else {
      return null;
    }
  } catch (error) {
    console.error('Error loading trip:', error);
    return null;
  }
};

// Load trip by share token (public access)
export const loadTripByShareToken = async (shareToken: string): Promise<TripData | null> => {
  try {
    // Note: This requires a Firestore query, which needs an index
    // For now, we'll implement a simpler approach
    const tripId = localStorage.getItem(`shareToken_${shareToken}`);
    if (tripId) {
      return await loadTrip(tripId);
    }
    return null;
  } catch (error) {
    console.error('Error loading trip by share token:', error);
    return null;
  }
};

// Update existing trip
export const updateTrip = async (tripId: string, updates: Partial<TripData>): Promise<void> => {
  try {
    const docRef = doc(db, 'trips', tripId);
    await updateDoc(docRef, {
      ...updates,
      updated_at: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating trip:', error);
    throw new Error('Failed to update trip');
  }
};

// Get user's trips from localStorage
export const getUserTrips = (): string[] => {
  return JSON.parse(localStorage.getItem('userTrips') || '[]');
};
