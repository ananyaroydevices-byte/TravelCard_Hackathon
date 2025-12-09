import { ItineraryData, Flight, Hotel, DayItinerary, Activity } from './supabase';
import { searchFlights, searchHotels, searchActivities } from './search-service';
import { fetchDestinationImage } from './image-service';

export async function generateItinerary(
  destinations: string[],
  startDate: string,
  endDate: string,
  purpose: string,
  travelerType: string,
  numberOfTravelers: number,
  originCity: string,
  mandatoryActivities: Record<string, string[]>
): Promise<ItineraryData> {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const daysCount = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  const flights: Flight[] = [];
  const hotels: Hotel[] = [];
  const days: DayItinerary[] = [];

  const daysPerDestination = Math.max(1, Math.floor(daysCount / destinations.length));

  let currentDate = new Date(startDate);

  for (let destIdx = 0; destIdx < destinations.length; destIdx++) {
    const destination = destinations[destIdx];
    const isFirstDest = destIdx === 0;
    const isLastDest = destIdx === destinations.length - 1;

    const flightOrigin = isFirstDest ? originCity : destinations[destIdx - 1];
    const arrivalDate = currentDate.toISOString().split('T')[0];

    const inboundFlight = await searchFlights(flightOrigin, destination, arrivalDate);
    if (inboundFlight) {
      flights.push(inboundFlight);
    }

    const checkInDate = currentDate.toISOString().split('T')[0];
    currentDate.setDate(currentDate.getDate() + daysPerDestination);
    const checkOutDate = currentDate.toISOString().split('T')[0];

    const hotel = await searchHotels(destination, checkInDate, checkOutDate, purpose);
    if (hotel) {
      hotels.push(hotel);
    }

    const mandatoryForDest = mandatoryActivities[destination] || [];

    const idealActivitiesPerDay = purpose === 'Business'
      ? 3
      : purpose === 'Staycation'
      ? 4
      : 6;

    const totalActivitiesNeeded = idealActivitiesPerDay * daysPerDestination;
    const cityActivities = await searchActivities(
      destination,
      purpose,
      travelerType,
      mandatoryForDest,
      totalActivitiesNeeded
    );

    const actualActivitiesPerDay = Math.min(
      idealActivitiesPerDay,
      Math.floor(cityActivities.length / daysPerDestination)
    );

    const minActivitiesPerDay = purpose === 'Business' ? 2 : purpose === 'Staycation' ? 3 : 4;
    const finalActivitiesPerDay = Math.max(minActivitiesPerDay, actualActivitiesPerDay);

    for (let dayIdx = 0; dayIdx < daysPerDestination; dayIdx++) {
      const dayDate = new Date(checkInDate);
      dayDate.setDate(dayDate.getDate() + dayIdx);

      const startIdx = dayIdx * finalActivitiesPerDay;
      const endIdx = Math.min(startIdx + finalActivitiesPerDay, cityActivities.length);
      const activitiesForDay = cityActivities.slice(startIdx, endIdx);

      if (activitiesForDay.length === 0 && dayIdx > 0) {
        continue;
      }

      days.push({
        day: days.length + 1,
        date: dayDate.toISOString().split('T')[0],
        city: destination,
        activities: activitiesForDay.map(act => ({
          time: act.time,
          title: act.activity,
          description: act.description,
          duration: act.duration,
          opening_hours: '9:00 AM',
          closing_hours: '6:00 PM',
        })),
      });
    }

    if (isLastDest) {
      const returnFlight = await searchFlights(destination, originCity, endDate);
      if (returnFlight) {
        flights.push(returnFlight);
      }
    }
  }

  const destinationImage = await fetchDestinationImage(destinations[0]);

  return {
    destination_image: destinationImage,
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
