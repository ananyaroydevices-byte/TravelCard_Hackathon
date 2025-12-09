import { Flight, Hotel, Activity } from './supabase';
import { searchAmadeusFlights, searchAmadeusHotels, getIATACode } from './amadeus-service';

const TAVILY_API_KEY = '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';

interface TavilySearchResult {
  results: Array<{
    title: string;
    content: string;
    url: string;
  }>;
}

const cityToIATAMap: Record<string, string> = {
  'New York': 'NYC',
  'Los Angeles': 'LAX',
  'Chicago': 'CHI',
  'San Francisco': 'SFO',
  'Miami': 'MIA',
  'Boston': 'BOS',
  'Seattle': 'SEA',
  'London': 'LON',
  'Paris': 'PAR',
  'Rome': 'ROM',
  'Tokyo': 'TYO',
  'Dubai': 'DXB',
  'Singapore': 'SIN',
  'Hong Kong': 'HKG',
  'Sydney': 'SYD',
  'Barcelona': 'BCN',
  'Amsterdam': 'AMS',
  'Berlin': 'BER',
  'Madrid': 'MAD',
  'Toronto': 'YTO',
};

async function getIATACodeForCity(cityName: string): Promise<string> {
  if (cityToIATAMap[cityName]) {
    return cityToIATAMap[cityName];
  }

  const code = await getIATACode(cityName);
  if (code) {
    cityToIATAMap[cityName] = code;
    return code;
  }

  return cityName.substring(0, 3).toUpperCase();
}

export async function searchFlights(
  origin: string,
  destination: string,
  date: string
): Promise<Flight | null> {
  try {
    const originCode = await getIATACodeForCity(origin);
    const destCode = await getIATACodeForCity(destination);

    const amadeusResult = await searchAmadeusFlights(originCode, destCode, date, 1);

    if (amadeusResult) {
      return {
        ...amadeusResult,
        from: origin,
        to: destination,
      };
    }

    const airlines = ['Emirates', 'Qatar Airways', 'Lufthansa', 'Air France', 'British Airways', 'United Airlines', 'Delta', 'Singapore Airlines', 'Turkish Airlines'];
    const randomAirline = airlines[Math.floor(Math.random() * airlines.length)];

    const distance = calculateDistance(origin, destination);
    const basePrice = Math.max(150, Math.min(1200, distance * 0.15));
    const priceVariation = basePrice * (0.8 + Math.random() * 0.4);

    const duration = calculateFlightDuration(distance);

    const departureTime = `${8 + Math.floor(Math.random() * 10)}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')} AM`;
    const arrivalHours = Math.floor(parseFloat(duration));
    const flightNumber = `${randomAirline.substring(0, 2).toUpperCase()}${Math.floor(Math.random() * 9000) + 1000}`;

    return {
      from: origin,
      to: destination,
      date,
      departure_time: departureTime,
      arrival_time: 'TBD',
      airline: randomAirline,
      flight_number: flightNumber,
      price_per_person: Math.round(priceVariation),
      duration,
    };
  } catch (error) {
    console.error('Error searching flights:', error);
    return null;
  }
}

export async function searchHotels(
  city: string,
  checkIn: string,
  checkOut: string,
  purpose: string
): Promise<Hotel | null> {
  try {
    const amadeusResult = await searchAmadeusHotels(city, checkIn, checkOut);

    if (amadeusResult) {
      return amadeusResult;
    }

    const nights = Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24));

    const searchStrategies = [
      `${city} hotels prices ${purpose === 'Business' ? 'business district' : 'city center'} cost per night`,
      `best rated hotels ${city} average price accommodation`,
      `where to stay in ${city} hotel rates pricing`,
    ];

    for (const query of searchStrategies) {
      const response = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          api_key: TAVILY_API_KEY,
          query,
          max_results: 8,
        }),
      });

      if (!response.ok) continue;

      const data: TavilySearchResult = await response.json();

      if (data.results && data.results.length > 0) {
        const hotelInfo = extractHotelInfo(data.results, city, purpose);

        if (hotelInfo.name && hotelInfo.price > 0) {
          return {
            city,
            name: hotelInfo.name,
            check_in_date: checkIn,
            check_out_date: checkOut,
            price_per_night: hotelInfo.price,
            nights,
            total_price: hotelInfo.price * nights,
          };
        }
      }
    }

    return generateFallbackHotel(city, checkIn, checkOut, nights, purpose);
  } catch (error) {
    console.error('Error searching hotels:', error);
    const nights = Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24));
    return generateFallbackHotel(city, checkIn, checkOut, nights, purpose);
  }
}

function extractHotelInfo(results: Array<{ title: string; content: string }>, city: string, purpose: string): { name: string; price: number } {
  let hotelName = '';
  let hotelPrice = 0;

  for (const result of results) {
    const text = `${result.title} ${result.content}`;

    if (!hotelName) {
      const hotelPatterns = [
        /(?:^|\s)([A-Z][a-zA-Z\s&'-]+(?:Hotel|Inn|Resort|Suites?|Lodge|Hostel))/,
        /(?:Hotel|Inn|Resort|Suites?)\s+([A-Z][a-zA-Z\s&'-]+)/,
        /([A-Z][a-zA-Z\s]+)\s+(?:Hotel|Inn|Resort)/,
      ];

      for (const pattern of hotelPatterns) {
        const match = text.match(pattern);
        if (match) {
          hotelName = match[0].trim();
          if (hotelName.length > 5 && hotelName.length < 60) {
            break;
          }
        }
      }
    }

    if (!hotelPrice) {
      const pricePatterns = [
        /\$\s*(\d{2,4})(?:\s*(?:per|\/)\s*night)/i,
        /(?:from|starting at|average)\s*\$\s*(\d{2,4})/i,
        /\$\s*(\d{2,4})\s*(?:USD|per night)/i,
        /(?:price|rate|cost).*?\$\s*(\d{2,4})/i,
      ];

      for (const pattern of pricePatterns) {
        const match = result.content.match(pattern);
        if (match) {
          const price = parseInt(match[1], 10);
          if (price >= 40 && price <= 800) {
            hotelPrice = price;
            break;
          }
        }
      }
    }

    if (hotelName && hotelPrice) {
      break;
    }
  }

  if (!hotelPrice) {
    const avgPrices = getCityAveragePrices(city, purpose);
    hotelPrice = avgPrices.min + Math.floor(Math.random() * (avgPrices.max - avgPrices.min));
  }

  return { name: hotelName, price: hotelPrice };
}

function generateFallbackHotel(city: string, checkIn: string, checkOut: string, nights: number, purpose: string): Hotel {
  const hotelBrands = ['Marriott', 'Hilton', 'Hyatt', 'InterContinental', 'Radisson', 'Crowne Plaza', 'Sheraton', 'Westin'];
  const boutiqueNames = ['Grand', 'Royal', 'Imperial', 'Plaza', 'Palace', 'Central', 'Park', 'Garden'];

  let hotelName: string;

  if (Math.random() > 0.5) {
    const brand = hotelBrands[Math.floor(Math.random() * hotelBrands.length)];
    hotelName = `${city} ${brand}`;
  } else {
    const boutique = boutiqueNames[Math.floor(Math.random() * boutiqueNames.length)];
    hotelName = `${city} ${boutique} Hotel`;
  }

  const avgPrices = getCityAveragePrices(city, purpose);
  const pricePerNight = avgPrices.min + Math.floor(Math.random() * (avgPrices.max - avgPrices.min));

  return {
    city,
    name: hotelName,
    check_in_date: checkIn,
    check_out_date: checkOut,
    price_per_night: pricePerNight,
    nights,
    total_price: pricePerNight * nights,
  };
}

function getCityAveragePrices(city: string, purpose: string): { min: number; max: number } {
  const luxuryCities = ['Paris', 'London', 'Tokyo', 'Dubai', 'New York', 'Singapore', 'Hong Kong', 'Zurich'];
  const expensiveCities = ['Sydney', 'San Francisco', 'Los Angeles', 'Amsterdam', 'Barcelona', 'Rome', 'Miami'];

  const isLuxury = luxuryCities.some(c => city.includes(c));
  const isExpensive = expensiveCities.some(c => city.includes(c));

  if (purpose === 'Business') {
    if (isLuxury) return { min: 200, max: 450 };
    if (isExpensive) return { min: 150, max: 320 };
    return { min: 110, max: 250 };
  } else {
    if (isLuxury) return { min: 120, max: 300 };
    if (isExpensive) return { min: 90, max: 220 };
    return { min: 70, max: 180 };
  }
}

export async function searchActivities(
  city: string,
  purpose: string,
  travelerType: string,
  mandatoryActivities: string[] = []
): Promise<Activity[]> {
  try {
    const query = purpose === 'Business'
      ? `business activities and places in ${city} coworking spaces conference centers`
      : `top tourist attractions in ${city} things to do landmarks museums`;

    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: TAVILY_API_KEY,
        query,
        max_results: 10,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to search activities');
    }

    const data: TavilySearchResult = await response.json();

    const activities: Activity[] = [];

    if (mandatoryActivities.length > 0) {
      mandatoryActivities.forEach((activityName, idx) => {
        activities.push({
          time: `${9 + idx * 2}:00 AM`,
          activity: activityName,
          description: `Experience ${activityName}`,
          duration: '2-3 hours',
        });
      });
    }

    const defaultActivities = getDefaultActivities(city, purpose);
    const startIdx = mandatoryActivities.length;

    if (data.results && data.results.length > 0) {
      data.results.slice(0, 5).forEach((result, idx) => {
        if (activities.length < 8) {
          const activityName = extractActivityName(result.title, city);
          const time = startIdx + idx < 4
            ? `${9 + (startIdx + idx) * 2}:00 AM`
            : `${(startIdx + idx - 3) * 2}:00 PM`;

          activities.push({
            time,
            activity: activityName,
            description: result.content.substring(0, 100) + '...',
            duration: '2-3 hours',
          });
        }
      });
    }

    while (activities.length < 6) {
      const defaultActivity = defaultActivities[activities.length - mandatoryActivities.length];
      if (defaultActivity) {
        activities.push(defaultActivity);
      } else {
        break;
      }
    }

    return activities;
  } catch (error) {
    console.error('Error searching activities:', error);
    return getDefaultActivities(city, purpose);
  }
}

function calculateDistance(origin: string, destination: string): number {
  const distances: Record<string, number> = {
    'local': 500,
    'regional': 1500,
    'continental': 3000,
    'intercontinental': 8000,
  };

  return distances['continental'] + Math.random() * 2000;
}

function calculateFlightDuration(distance: number): string {
  const hours = Math.floor(distance / 800);
  const minutes = Math.floor((distance % 800) / 13.33);
  return `${hours}h ${minutes}m`;
}

function extractActivityName(title: string, city: string): string {
  const cleaned = title
    .replace(/\d+\.\s*/, '')
    .replace(/^(Top|Best|Visit|See|Explore)\s+/i, '')
    .replace(new RegExp(city, 'gi'), '')
    .trim();

  if (cleaned.length > 50) {
    return cleaned.substring(0, 50) + '...';
  }

  return cleaned || 'Local Attraction';
}

function getDefaultActivities(city: string, purpose: string): Activity[] {
  if (purpose === 'Business') {
    return [
      {
        time: '9:00 AM',
        activity: `${city} Business District Tour`,
        description: 'Explore the main business area',
        duration: '2 hours',
      },
      {
        time: '2:00 PM',
        activity: 'Co-working Space Visit',
        description: 'Network with local professionals',
        duration: '3 hours',
      },
    ];
  }

  const cityActivities: Record<string, Activity[]> = {
    Paris: [
      { time: '9:00 AM', activity: 'Eiffel Tower', description: 'Visit the iconic landmark', duration: '2-3 hours' },
      { time: '12:00 PM', activity: 'Louvre Museum', description: 'Explore world-class art', duration: '3-4 hours' },
      { time: '4:00 PM', activity: 'Seine River Cruise', description: 'Relaxing boat tour', duration: '1-2 hours' },
    ],
    Rome: [
      { time: '9:00 AM', activity: 'Colosseum', description: 'Ancient Roman amphitheater', duration: '2-3 hours' },
      { time: '12:00 PM', activity: 'Vatican Museums', description: 'Sistine Chapel visit', duration: '3-4 hours' },
      { time: '4:00 PM', activity: 'Trevi Fountain', description: 'Famous baroque fountain', duration: '1 hour' },
    ],
    London: [
      { time: '9:00 AM', activity: 'Tower of London', description: 'Historic castle', duration: '2-3 hours' },
      { time: '12:00 PM', activity: 'British Museum', description: 'World history exhibits', duration: '3 hours' },
      { time: '4:00 PM', activity: 'London Eye', description: 'Observation wheel ride', duration: '1 hour' },
    ],
    Tokyo: [
      { time: '9:00 AM', activity: 'Senso-ji Temple', description: 'Ancient Buddhist temple', duration: '2 hours' },
      { time: '12:00 PM', activity: 'Tokyo Skytree', description: 'Panoramic city views', duration: '2 hours' },
      { time: '4:00 PM', activity: 'Shibuya Crossing', description: 'Iconic intersection', duration: '1 hour' },
    ],
  };

  return cityActivities[city] || [
    { time: '9:00 AM', activity: `${city} City Center`, description: 'Explore downtown area', duration: '2 hours' },
    { time: '12:00 PM', activity: `${city} Museum`, description: 'Local history and culture', duration: '2 hours' },
    { time: '4:00 PM', activity: 'Local Market', description: 'Shopping and dining', duration: '2 hours' },
  ];
}
