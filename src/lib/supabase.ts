import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Tables<T extends keyof any> = T extends 'trips'
  ? Trip
  : T extends 'itineraries'
    ? Itinerary
    : T extends 'notes'
      ? Note
      : never;

export interface Trip {
  id: string;
  user_id: string;
  destinations: string[];
  travel_start_date: string;
  travel_end_date: string;
  purpose: 'Business' | 'Vacation' | 'Staycation';
  traveler_type: 'Solo' | 'Friends and Family' | 'Business Travelers' | 'Content Creators';
  number_of_travelers: number;
  origin_city: string;
  mandatory_activities: Record<string, string[]>;
  traveler_images: string[];
  created_at: string;
  updated_at: string;
}

export interface Itinerary {
  id: string;
  trip_id: string;
  itinerary_data: ItineraryData;
  total_cost: number;
  cost_breakdown: CostBreakdown;
  is_selected: boolean;
  version_number: number;
  created_at: string;
}

export interface ItineraryData {
  destination_image: string;
  flights: Flight[];
  hotels: Hotel[];
  days: DayItinerary[];
}

export interface Flight {
  from: string;
  to: string;
  date: string;
  departure_time: string;
  arrival_time: string;
  airline: string;
  flight_number: string;
  price_per_person: number;
  duration: string;
}

export interface Hotel {
  city: string;
  name: string;
  check_in_date: string;
  check_out_date: string;
  price_per_night: number;
  nights: number;
  total_price: number;
}

export interface DayItinerary {
  day: number;
  date: string;
  city: string;
  activities: Activity[];
}

export interface Activity {
  time: string;
  title: string;
  description: string;
  duration: string;
  opening_hours?: string;
  closing_hours?: string;
}

export interface CostBreakdown {
  flights_total: number;
  hotels_total: number;
  activities_total: number;
  total: number;
}

export interface Note {
  id: string;
  itinerary_id: string;
  day_number: number;
  note_content: string;
  created_at: string;
  updated_at: string;
}
