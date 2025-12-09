import { Flight, Hotel } from './supabase';

const API_KEY = import.meta.env.VITE_AMADEUS_API_KEY;
const API_SECRET = import.meta.env.VITE_AMADEUS_API_SECRET;
const ENVIRONMENT = import.meta.env.VITE_AMADEUS_ENVIRONMENT || 'test';

const BASE_URL = ENVIRONMENT === 'production'
  ? 'https://api.amadeus.com'
  : 'https://test.api.amadeus.com';

interface AmadeusAuthResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

interface AmadeusFlightOffer {
  id: string;
  price: {
    total: string;
    currency: string;
  };
  itineraries: Array<{
    duration: string;
    segments: Array<{
      departure: {
        iataCode: string;
        at: string;
      };
      arrival: {
        iataCode: string;
        at: string;
      };
      carrierCode: string;
      number: string;
    }>;
  }>;
  validatingAirlineCodes: string[];
}

interface AmadeusFlightOffersResponse {
  data: AmadeusFlightOffer[];
  dictionaries?: {
    carriers?: Record<string, string>;
  };
}

interface AmadeusHotelOffer {
  hotel: {
    hotelId: string;
    name: string;
    cityCode: string;
  };
  offers: Array<{
    id: string;
    checkInDate: string;
    checkOutDate: string;
    price: {
      total: string;
      currency: string;
    };
  }>;
}

interface AmadeusHotelOffersResponse {
  data: AmadeusHotelOffer[];
}

let cachedToken: string | null = null;
let tokenExpiresAt: number = 0;

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiresAt) {
    return cachedToken;
  }

  const params = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: API_KEY,
    client_secret: API_SECRET,
  });

  const response = await fetch(`${BASE_URL}/v1/security/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to authenticate with Amadeus API: ${error}`);
  }

  const data: AmadeusAuthResponse = await response.json();
  cachedToken = data.access_token;
  tokenExpiresAt = Date.now() + (data.expires_in * 1000) - 60000;

  return cachedToken;
}

function formatDuration(isoDuration: string): string {
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!match) return 'N/A';

  const hours = match[1] || '0';
  const minutes = match[2] || '0';
  return `${hours}h ${minutes}m`;
}

function formatTime(isoDateTime: string): string {
  const date = new Date(isoDateTime);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function getAirlineName(carrierCode: string, dictionaries?: { carriers?: Record<string, string> }): string {
  if (dictionaries?.carriers && dictionaries.carriers[carrierCode]) {
    return dictionaries.carriers[carrierCode];
  }

  const commonAirlines: Record<string, string> = {
    'AA': 'American Airlines',
    'DL': 'Delta Air Lines',
    'UA': 'United Airlines',
    'BA': 'British Airways',
    'LH': 'Lufthansa',
    'AF': 'Air France',
    'EK': 'Emirates',
    'QR': 'Qatar Airways',
    'SQ': 'Singapore Airlines',
    'TK': 'Turkish Airlines',
    'AC': 'Air Canada',
    'NH': 'ANA',
    'JL': 'Japan Airlines',
    'KL': 'KLM',
    'IB': 'Iberia',
  };

  return commonAirlines[carrierCode] || carrierCode;
}

export async function searchAmadeusFlights(
  origin: string,
  destination: string,
  date: string,
  adults: number = 1
): Promise<Flight | null> {
  try {
    const token = await getAccessToken();

    const params = new URLSearchParams({
      originLocationCode: origin.substring(0, 3).toUpperCase(),
      destinationLocationCode: destination.substring(0, 3).toUpperCase(),
      departureDate: date,
      adults: adults.toString(),
      currencyCode: 'USD',
      max: '5',
    });

    const response = await fetch(`${BASE_URL}/v2/shopping/flight-offers?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Amadeus API error:', error);
      return null;
    }

    const data: AmadeusFlightOffersResponse = await response.json();

    if (!data.data || data.data.length === 0) {
      console.log('No flights found for this route');
      return null;
    }

    const bestOffer = data.data[0];
    const itinerary = bestOffer.itineraries[0];
    const firstSegment = itinerary.segments[0];
    const lastSegment = itinerary.segments[itinerary.segments.length - 1];

    const airlineCode = bestOffer.validatingAirlineCodes?.[0] || firstSegment.carrierCode;
    const airlineName = getAirlineName(airlineCode, data.dictionaries);

    return {
      from: firstSegment.departure.iataCode,
      to: lastSegment.arrival.iataCode,
      date: firstSegment.departure.at.split('T')[0],
      departure_time: formatTime(firstSegment.departure.at),
      arrival_time: formatTime(lastSegment.arrival.at),
      airline: airlineName,
      flight_number: `${firstSegment.carrierCode}${firstSegment.number}`,
      price_per_person: Math.round(parseFloat(bestOffer.price.total)),
      duration: formatDuration(itinerary.duration),
    };
  } catch (error) {
    console.error('Error searching Amadeus flights:', error);
    return null;
  }
}

export async function getIATACode(cityName: string): Promise<string | null> {
  try {
    const token = await getAccessToken();

    const params = new URLSearchParams({
      keyword: cityName,
      subType: 'CITY',
      max: '1',
    });

    const response = await fetch(`${BASE_URL}/v1/reference-data/locations?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return null;
    }

    const data: any = await response.json();

    if (data.data && data.data.length > 0) {
      return data.data[0].iataCode;
    }

    return null;
  } catch (error) {
    console.error('Error getting IATA code:', error);
    return null;
  }
}

export async function searchAmadeusHotels(
  city: string,
  checkInDate: string,
  checkOutDate: string
): Promise<Hotel | null> {
  try {
    const token = await getAccessToken();
    const cityCode = await getIATACode(city);

    if (!cityCode) {
      console.log('Could not get city code for hotel search');
      return null;
    }

    const params = new URLSearchParams({
      cityCode: cityCode,
      checkInDate: checkInDate,
      checkOutDate: checkOutDate,
      adults: '1',
      radius: '20',
      radiusUnit: 'KM',
      ratings: '3,4,5',
      amenities: 'WIFI',
      bestRateOnly: 'true',
    });

    const response = await fetch(`${BASE_URL}/v3/shopping/hotel-offers?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Amadeus Hotel API error:', error);
      return null;
    }

    const data: AmadeusHotelOffersResponse = await response.json();

    if (!data.data || data.data.length === 0) {
      console.log('No hotels found for this city');
      return null;
    }

    const bestHotel = data.data[0];
    const bestOffer = bestHotel.offers[0];

    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);
    const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));

    const totalPrice = parseFloat(bestOffer.price.total);
    const pricePerNight = Math.round(totalPrice / nights);

    return {
      city: city,
      name: bestHotel.hotel.name,
      check_in_date: checkInDate,
      check_out_date: checkOutDate,
      price_per_night: pricePerNight,
      nights: nights,
      total_price: Math.round(totalPrice),
    };
  } catch (error) {
    console.error('Error searching Amadeus hotels:', error);
    return null;
  }
}
