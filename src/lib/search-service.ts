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

function generateActivityTime(activityIndex: number, purpose: string): string {
  if (purpose === 'Business') {
    const businessHours = ['9:00 AM', '11:00 AM', '2:00 PM', '4:00 PM'];
    return businessHours[activityIndex % businessHours.length];
  }

  const morningHours = ['9:00 AM', '10:30 AM', '12:00 PM'];
  const afternoonHours = ['2:00 PM', '4:00 PM', '6:00 PM'];
  const eveningHours = ['7:30 PM'];

  if (activityIndex < 3) {
    return morningHours[activityIndex];
  } else if (activityIndex < 6) {
    return afternoonHours[activityIndex - 3];
  } else {
    return eveningHours[(activityIndex - 6) % eveningHours.length];
  }
}

export async function searchActivities(
  city: string,
  purpose: string,
  travelerType: string,
  mandatoryActivities: string[] = [],
  targetCount: number = 6
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
    const usedActivityNames = new Set<string>();

    if (mandatoryActivities.length > 0) {
      mandatoryActivities.forEach((activityName, idx) => {
        activities.push({
          time: generateActivityTime(idx, purpose),
          activity: activityName,
          description: `Experience ${activityName}`,
          duration: purpose === 'Business' ? '2-3 hours' : '2-4 hours',
        });
        usedActivityNames.add(activityName.toLowerCase());
      });
    }

    if (data.results && data.results.length > 0) {
      data.results.forEach((result) => {
        if (activities.length < targetCount) {
          const activityName = extractActivityName(result.title, city);
          const normalizedName = activityName.toLowerCase();

          if (!usedActivityNames.has(normalizedName)) {
            const activityIdx = activities.length;
            activities.push({
              time: generateActivityTime(activityIdx, purpose),
              activity: activityName,
              description: result.content.substring(0, 120) + '...',
              duration: purpose === 'Business' ? '1-2 hours' : '2-3 hours',
            });
            usedActivityNames.add(normalizedName);
          }
        }
      });
    }

    const defaultActivities = getDefaultActivities(city, purpose);

    for (const defaultActivity of defaultActivities) {
      if (activities.length >= targetCount) break;

      const normalizedName = defaultActivity.activity.toLowerCase();
      if (!usedActivityNames.has(normalizedName)) {
        activities.push({
          ...defaultActivity,
          time: generateActivityTime(activities.length, purpose),
        });
        usedActivityNames.add(normalizedName);
      }
    }

    const mealActivities = generateMealActivities(city, purpose);
    for (const mealActivity of mealActivities) {
      if (activities.length >= targetCount) break;

      const normalizedName = mealActivity.activity.toLowerCase();
      if (!usedActivityNames.has(normalizedName)) {
        activities.push({
          ...mealActivity,
          time: generateActivityTime(activities.length, purpose),
        });
        usedActivityNames.add(normalizedName);
      }
    }

    return activities;
  } catch (error) {
    console.error('Error searching activities:', error);
    const defaultActivities = getDefaultActivities(city, purpose);
    return defaultActivities.slice(0, Math.min(targetCount, defaultActivities.length));
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
        description: 'Explore the main business area and key commercial zones',
        duration: '2 hours',
      },
      {
        time: '11:00 AM',
        activity: 'Networking Lunch',
        description: 'Meet with local business professionals',
        duration: '1-2 hours',
      },
      {
        time: '2:00 PM',
        activity: 'Co-working Space Visit',
        description: 'Experience modern work environment and network',
        duration: '2-3 hours',
      },
      {
        time: '4:00 PM',
        activity: 'Business Conference Center',
        description: 'Visit local conference venues and facilities',
        duration: '1-2 hours',
      },
    ];
  }

  const cityActivities: Record<string, Activity[]> = {
    Paris: [
      { time: '9:00 AM', activity: 'Eiffel Tower', description: 'Visit the iconic landmark and enjoy panoramic views', duration: '2-3 hours' },
      { time: '12:00 PM', activity: 'Louvre Museum', description: 'Explore world-class art and see the Mona Lisa', duration: '3-4 hours' },
      { time: '4:00 PM', activity: 'Seine River Cruise', description: 'Relaxing boat tour past historic monuments', duration: '1-2 hours' },
      { time: '6:00 PM', activity: 'Montmartre Walk', description: 'Explore the artistic neighborhood and Sacré-Cœur', duration: '2 hours' },
      { time: '7:30 PM', activity: 'French Dinner Experience', description: 'Authentic Parisian cuisine at a local bistro', duration: '2 hours' },
      { time: '10:00 AM', activity: 'Musée d\'Orsay', description: 'Impressionist and post-impressionist masterpieces', duration: '2-3 hours' },
      { time: '3:00 PM', activity: 'Arc de Triomphe', description: 'Historical monument and Champs-Élysées views', duration: '1-2 hours' },
      { time: '5:00 PM', activity: 'Latin Quarter Stroll', description: 'Charming streets, cafés, and bookstores', duration: '2 hours' },
    ],
    Rome: [
      { time: '9:00 AM', activity: 'Colosseum', description: 'Ancient Roman amphitheater and gladiator arena', duration: '2-3 hours' },
      { time: '12:00 PM', activity: 'Vatican Museums', description: 'Sistine Chapel and St. Peters Basilica visit', duration: '3-4 hours' },
      { time: '4:00 PM', activity: 'Trevi Fountain', description: 'Famous baroque fountain and coin toss tradition', duration: '1 hour' },
      { time: '6:00 PM', activity: 'Roman Forum', description: 'Walk through ancient Roman ruins', duration: '2 hours' },
      { time: '7:30 PM', activity: 'Italian Dinner', description: 'Traditional Roman pasta and wine', duration: '2 hours' },
      { time: '10:00 AM', activity: 'Pantheon', description: 'Ancient Roman temple with impressive dome', duration: '1 hour' },
      { time: '3:00 PM', activity: 'Spanish Steps', description: 'Historic stairway and shopping district', duration: '1-2 hours' },
      { time: '5:00 PM', activity: 'Trastevere Walk', description: 'Bohemian neighborhood with cobblestone streets', duration: '2 hours' },
    ],
    London: [
      { time: '9:00 AM', activity: 'Tower of London', description: 'Historic castle and Crown Jewels', duration: '2-3 hours' },
      { time: '12:00 PM', activity: 'British Museum', description: 'World history and cultural exhibits', duration: '3 hours' },
      { time: '4:00 PM', activity: 'London Eye', description: 'Giant observation wheel with city views', duration: '1 hour' },
      { time: '6:00 PM', activity: 'Covent Garden', description: 'Shopping, street performers, and dining', duration: '2 hours' },
      { time: '7:30 PM', activity: 'West End Theatre', description: 'World-class theatrical performance', duration: '2-3 hours' },
      { time: '10:00 AM', activity: 'Buckingham Palace', description: 'Royal residence and Changing of the Guard', duration: '1-2 hours' },
      { time: '3:00 PM', activity: 'Westminster Abbey', description: 'Gothic church with royal history', duration: '1-2 hours' },
      { time: '5:00 PM', activity: 'Borough Market', description: 'Historic food market with diverse offerings', duration: '1-2 hours' },
    ],
    Tokyo: [
      { time: '9:00 AM', activity: 'Senso-ji Temple', description: 'Ancient Buddhist temple in Asakusa', duration: '2 hours' },
      { time: '12:00 PM', activity: 'Tokyo Skytree', description: 'Panoramic city views from observation deck', duration: '2 hours' },
      { time: '4:00 PM', activity: 'Shibuya Crossing', description: 'Iconic intersection and shopping district', duration: '2 hours' },
      { time: '6:00 PM', activity: 'Harajuku District', description: 'Trendy fashion and youth culture hub', duration: '2 hours' },
      { time: '7:30 PM', activity: 'Sushi Dinner', description: 'Authentic Japanese sushi experience', duration: '2 hours' },
      { time: '10:00 AM', activity: 'Meiji Shrine', description: 'Peaceful Shinto shrine in forested grounds', duration: '1-2 hours' },
      { time: '3:00 PM', activity: 'Akihabara District', description: 'Electronics and anime culture center', duration: '2 hours' },
      { time: '5:00 PM', activity: 'Tsukiji Outer Market', description: 'Fresh seafood and street food', duration: '1-2 hours' },
    ],
  };

  return cityActivities[city] || [
    { time: '9:00 AM', activity: `${city} City Center`, description: 'Explore the historic downtown area and main attractions', duration: '2-3 hours' },
    { time: '12:00 PM', activity: `${city} Museum`, description: 'Discover local history, art, and culture', duration: '2-3 hours' },
    { time: '4:00 PM', activity: 'Local Market', description: 'Browse local crafts, food, and souvenirs', duration: '2 hours' },
    { time: '6:00 PM', activity: `${city} Waterfront`, description: 'Scenic views and waterfront promenade', duration: '1-2 hours' },
    { time: '7:30 PM', activity: 'Local Cuisine Experience', description: 'Taste authentic regional specialties', duration: '2 hours' },
    { time: '10:00 AM', activity: `${city} Art Gallery`, description: 'Contemporary and traditional art collections', duration: '2 hours' },
    { time: '3:00 PM', activity: `${city} Park`, description: 'Relax in green spaces and gardens', duration: '1-2 hours' },
    { time: '5:00 PM', activity: `${city} Shopping District`, description: 'Browse local boutiques and stores', duration: '2 hours' },
  ];
}

function generateMealActivities(city: string, purpose: string): Activity[] {
  if (purpose === 'Business') {
    return [
      { time: '8:00 AM', activity: 'Business Breakfast Meeting', description: 'Morning networking over coffee and breakfast', duration: '1 hour' },
      { time: '12:00 PM', activity: 'Executive Lunch', description: 'Fine dining with business associates', duration: '1-2 hours' },
      { time: '6:00 PM', activity: 'Corporate Dinner', description: 'Evening meal at upscale restaurant', duration: '2 hours' },
    ];
  }

  return [
    { time: '8:00 AM', activity: `${city} Breakfast Spot`, description: 'Start your day with local breakfast specialties', duration: '1 hour' },
    { time: '12:00 PM', activity: `${city} Lunch Restaurant`, description: 'Enjoy midday meal at popular local eatery', duration: '1-2 hours' },
    { time: '7:00 PM', activity: `${city} Dinner Experience`, description: 'Evening dining at renowned restaurant', duration: '2 hours' },
    { time: '3:00 PM', activity: `${city} Café Break`, description: 'Afternoon coffee or tea at charming café', duration: '30 min - 1 hour' },
    { time: '9:00 PM', activity: `${city} Dessert & Nightcap`, description: 'Sweet treats and drinks to end the day', duration: '1 hour' },
  ];
}
