import { ItineraryData, Flight, Hotel, DayItinerary, Activity } from './supabase';
import { searchFlights, searchHotels, searchActivities } from './search-service';
import { fetchDestinationImage } from './image-service';
import { generatePersonalizedDestinationImage } from './gemini-service';

export async function generateItinerary(
  destinations: string[],
  startDate: string,
  endDate: string,
  purpose: string,
  travelerType: string,
  numberOfTravelers: number,
  originCity: string,
  mandatoryActivities: Record<string, string[]>,
  travelerImages: string[] = [],
  userId?: string
): Promise<ItineraryData> {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const daysCount = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) - 1);

  const flights: Flight[] = [];
  const hotels: Hotel[] = [];
  const days: DayItinerary[] = [];

  const baseDaysPerDestination = Math.floor(daysCount / destinations.length);
  const remainderDays = daysCount % destinations.length;

  let currentDate = new Date(startDate);

  for (let destIdx = 0; destIdx < destinations.length; destIdx++) {
    const destination = destinations[destIdx];
    const isFirstDest = destIdx === 0;
    const isLastDest = destIdx === destinations.length - 1;

    const daysForThisDestination = baseDaysPerDestination + (destIdx < remainderDays ? 1 : 0);

    const flightOrigin = isFirstDest ? originCity : destinations[destIdx - 1];
    const arrivalDate = currentDate.toISOString().split('T')[0];

    const inboundFlight = await searchFlights(flightOrigin, destination, arrivalDate);
    if (inboundFlight) {
      flights.push(inboundFlight);
    }

    const checkInDate = currentDate.toISOString().split('T')[0];
    const checkOutDate = new Date(currentDate);
    checkOutDate.setDate(checkOutDate.getDate() + daysForThisDestination);
    const checkOutDateStr = checkOutDate.toISOString().split('T')[0];

    const hotel = await searchHotels(destination, checkInDate, checkOutDateStr, purpose);
    if (hotel) {
      hotels.push(hotel);
    }

    const mandatoryForDest = mandatoryActivities[destination] || [];

    const idealActivitiesPerDay = purpose === 'Business'
      ? 3
      : purpose === 'Staycation'
      ? 4
      : 6;

    const totalActivitiesNeeded = idealActivitiesPerDay * daysForThisDestination;
    const cityActivities = await searchActivities(
      destination,
      purpose,
      travelerType,
      mandatoryForDest,
      totalActivitiesNeeded
    );

    const minActivitiesPerDay = purpose === 'Business' ? 2 : purpose === 'Staycation' ? 3 : 4;

    const dayActivitiesMap: Activity[][] = Array.from({ length: daysForThisDestination }, () => []);

    for (let actIdx = 0; actIdx < cityActivities.length; actIdx++) {
      const dayIdx = actIdx % daysForThisDestination;
      dayActivitiesMap[dayIdx].push(cityActivities[actIdx]);
    }

    for (let dayIdx = 0; dayIdx < daysForThisDestination; dayIdx++) {
      const dayDate = new Date(checkInDate);
      dayDate.setDate(dayDate.getDate() + dayIdx);

      days.push({
        day: days.length + 1,
        date: dayDate.toISOString().split('T')[0],
        city: destination,
        activities: dayActivitiesMap[dayIdx].map(act => ({
          time: act.time,
          title: act.activity,
          description: act.description,
          duration: act.duration,
          opening_hours: '9:00 AM',
          closing_hours: '6:00 PM',
        })),
      });
    }

    currentDate.setDate(currentDate.getDate() + daysForThisDestination);

    if (isLastDest) {
      const returnFlight = await searchFlights(destination, originCity, endDate);
      if (returnFlight) {
        flights.push(returnFlight);
      }
    }
  }

  let destinationImage = '';
  let isAiGenerated = false;
  let aiMetadata = {};

  if (travelerImages.length > 0 && userId) {
    console.log('🖼️ Generating personalized destination image with AI...');
    console.log('Using traveler photo:', travelerImages[0]);

    const aiResult = await generatePersonalizedDestinationImage(
      travelerImages[0],
      destinations[0],
      userId
    );

    if (aiResult.url) {
      console.log('✅ AI-generated image created successfully');
      destinationImage = aiResult.url;
      isAiGenerated = aiResult.isAiGenerated;
      aiMetadata = aiResult.metadata;
    } else {
      console.log('⚠️ AI generation failed, falling back to stock image');
      console.log('Error:', aiResult.metadata?.error);
      destinationImage = await fetchDestinationImage(destinations[0]);
    }
  } else {
    console.log('📸 No traveler photos provided, using stock image');
    destinationImage = await fetchDestinationImage(destinations[0]);
  }

  return {
    destination_image: destinationImage,
    is_ai_generated_image: isAiGenerated,
    ai_image_metadata: aiMetadata,
    flights,
    hotels,
    days,
  };
}

export function calculateTotalCost(
  flights: Flight[],
  hotels: Hotel[],
  numberOfTravelers: number
) {
  const flightsCost = flights.reduce((sum, f) => sum + f.price_per_person * numberOfTravelers, 0);
  const hotelsCost = hotels.reduce((sum, h) => sum + h.total_price, 0);

  return {
    flights_total: Math.round(flightsCost),
    hotels_total: Math.round(hotelsCost),
    total: Math.round(flightsCost + hotelsCost),
  };
}
