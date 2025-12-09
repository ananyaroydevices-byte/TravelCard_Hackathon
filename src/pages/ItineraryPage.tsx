import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Plane, Hotel, Clock, Plus } from 'lucide-react';
import { GlossyCard } from '../components/GlossyCard';
import { AnimatedButton } from '../components/AnimatedButton';
import { Textarea } from '../components/Textarea';
import { Modal } from '../components/Modal';
import { Toast, ToastProps } from '../components/Toast';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { MapMockup } from '../components/MapMockup';
import { supabase, Trip, ItineraryData, CostBreakdown } from '../lib/supabase';
import { generateItinerary, calculateTotalCost } from '../lib/itinerary-service';
import { useAuth } from '../lib/auth-context';

export function ItineraryPage() {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [trip, setTrip] = useState<Trip | null>(null);
  const [itinerary1, setItinerary1] = useState<ItineraryData | null>(null);
  const [itinerary2, setItinerary2] = useState<ItineraryData | null>(null);
  const [selectedItinerary, setSelectedItinerary] = useState<1 | 2 | null>(null);
  const [currentDay, setCurrentDay] = useState(1);
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [newNote, setNewNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [comparing, setComparing] = useState(false);
  const [showAlternateModal, setShowAlternateModal] = useState(false);
  const [toast, setToast] = useState<ToastProps | null>(null);

  useEffect(() => {
    loadTrip();
  }, [tripId]);

  const loadTrip = async () => {
    if (!tripId || !user) return;

    try {
      const { data, error } = await supabase
        .from('trips')
        .select('*')
        .eq('id', tripId)
        .eq('user_id', user.id)
        .single();

      if (error) throw error;

      setTrip(data);

      // Generate first itinerary
      const itiner = await generateItinerary(
        data.destinations,
        data.travel_start_date,
        data.travel_end_date,
        data.purpose,
        data.traveler_type,
        data.number_of_travelers,
        data.origin_city,
        data.mandatory_activities
      );

      const costBreakdown = calculateTotalCost(itiner.flights, itiner.hotels, data.number_of_travelers);

      // Save to database
      await supabase.from('itineraries').insert({
        trip_id: tripId,
        itinerary_data: itiner,
        total_cost: costBreakdown.total,
        cost_breakdown: costBreakdown,
        is_selected: false,
        version_number: 1,
      });

      setItinerary1(itiner);
    } catch (error: any) {
      setToast({
        message: error.message || 'Failed to load trip',
        type: 'error',
        onClose: () => setToast(null),
      });
    } finally {
      setLoading(false);
    }
  };

  const generateAlternateItinerary = async () => {
    if (!trip) return;

    setLoading(true);
    try {
      const itiner = await generateItinerary(
        trip.destinations,
        trip.travel_start_date,
        trip.travel_end_date,
        trip.purpose,
        trip.traveler_type,
        trip.number_of_travelers,
        trip.origin_city,
        trip.mandatory_activities
      );

      const costBreakdown = calculateTotalCost(itiner.flights, itiner.hotels, trip.number_of_travelers);

      await supabase.from('itineraries').insert({
        trip_id: tripId,
        itinerary_data: itiner,
        total_cost: costBreakdown.total,
        cost_breakdown: costBreakdown,
        is_selected: false,
        version_number: 2,
      });

      setItinerary2(itiner);
      setComparing(true);
      setShowAlternateModal(false);

      setToast({
        message: 'Alternate itinerary generated!',
        type: 'success',
        onClose: () => setToast(null),
      });
    } catch (error: any) {
      setToast({
        message: error.message || 'Failed to generate alternate itinerary',
        type: 'error',
        onClose: () => setToast(null),
      });
    } finally {
      setLoading(false);
    }
  };

  const addNote = () => {
    if (newNote.trim()) {
      setNotes({
        ...notes,
        [currentDay]: (notes[currentDay] || '') + (notes[currentDay] ? '\n' : '') + newNote,
      });
      setNewNote('');
    }
  };

  const saveTrip = async () => {
    if (!tripId || !selectedItinerary) {
      setToast({
        message: 'Please select an itinerary before saving',
        type: 'error',
        onClose: () => setToast(null),
      });
      return;
    }

    setLoading(true);
    try {
      const selectedVersion = selectedItinerary === 1 ? itinerary1 : itinerary2;
      if (!selectedVersion) throw new Error('No itinerary selected');

      await supabase.from('itineraries').update({ is_selected: true }).eq('trip_id', tripId).eq('version_number', selectedItinerary);

      for (const [day, noteContent] of Object.entries(notes)) {
        if (noteContent) {
          const { data: itineraryData } = await supabase
            .from('itineraries')
            .select('id')
            .eq('trip_id', tripId)
            .eq('is_selected', true)
            .single();

          if (itineraryData) {
            await supabase.from('notes').insert({
              itinerary_id: itineraryData.id,
              day_number: parseInt(day),
              note_content: noteContent,
            });
          }
        }
      }

      if (user?.email && trip) {
        const costBreakdown = calculateTotalCost(
          selectedVersion.flights,
          selectedVersion.hotels,
          trip.number_of_travelers
        );

        try {
          const emailResponse = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-itinerary-email`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
              },
              body: JSON.stringify({
                userEmail: user.email,
                tripData: {
                  destinations: trip.destinations,
                  travel_start_date: trip.travel_start_date,
                  travel_end_date: trip.travel_end_date,
                  purpose: trip.purpose,
                },
                itinerary: selectedVersion,
                costBreakdown,
              }),
            }
          );

          if (emailResponse.ok) {
            setToast({
              message: 'Trip saved! Check your email for the full itinerary.',
              type: 'success',
              duration: 3000,
              onClose: () => navigate('/trips'),
            });
          } else {
            setToast({
              message: 'Trip saved! (Email delivery pending)',
              type: 'success',
              duration: 2000,
              onClose: () => navigate('/trips'),
            });
          }
        } catch (emailError) {
          console.error('Failed to send email:', emailError);
          setToast({
            message: 'Trip saved successfully!',
            type: 'success',
            duration: 2000,
            onClose: () => navigate('/trips'),
          });
        }
      } else {
        setToast({
          message: 'Trip saved successfully!',
          type: 'success',
          duration: 2000,
          onClose: () => navigate('/trips'),
        });
      }
    } catch (error: any) {
      setToast({
        message: error.message || 'Failed to save trip',
        type: 'error',
        onClose: () => setToast(null),
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading && !itinerary1) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-teal-800 flex items-center justify-center">
        <LoadingSpinner size="lg" text="Generating your itinerary..." />
      </div>
    );
  }

  if (!trip || !itinerary1) return null;

  const currentItinerary = selectedItinerary === 2 && itinerary2 ? itinerary2 : itinerary1;
  const costBreakdown = calculateTotalCost(currentItinerary.flights, currentItinerary.hotels, trip.number_of_travelers);
  const dayItinerary = currentItinerary.days[currentDay - 1];

  const costBreakdown1 = calculateTotalCost(itinerary1.flights, itinerary1.hotels, trip.number_of_travelers);
  const costBreakdown2 = itinerary2 ? calculateTotalCost(itinerary2.flights, itinerary2.hotels, trip.number_of_travelers) : null;

  const renderItineraryCard = (itinerary: ItineraryData, version: 1 | 2, costs: CostBreakdown) => (
    <div
      onClick={() => setSelectedItinerary(version)}
      className={`cursor-pointer transition-all duration-300 ${
        selectedItinerary === version
          ? 'ring-4 ring-primary scale-[1.02]'
          : 'hover:scale-[1.01] opacity-90 hover:opacity-100'
      }`}
    >
      <GlossyCard className="p-6 relative">
        {selectedItinerary === version && (
          <div className="absolute top-4 right-4 bg-primary text-white px-3 py-1 rounded-full text-sm font-semibold">
            Selected
          </div>
        )}
        <h3 className="text-white font-bold text-xl mb-4">Option {version}</h3>

        {/* Cost Summary */}
        <div className="bg-white/10 p-4 rounded-lg mb-4">
          <p className="text-white/60 text-sm mb-1">Total Cost</p>
          <p className="text-white font-bold text-3xl">${costs.total}</p>
          <div className="mt-2 space-y-1 text-sm">
            <div className="flex justify-between text-white/70">
              <span>Flights</span>
              <span>${costs.flights_total}</span>
            </div>
            <div className="flex justify-between text-white/70">
              <span>Hotels</span>
              <span>${costs.hotels_total}</span>
            </div>
          </div>
        </div>

        {/* Flights */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Plane className="text-primary" size={20} />
            <h4 className="text-white font-semibold">Flights</h4>
          </div>
          <div className="space-y-2">
            {itinerary.flights.map((flight, idx) => (
              <div key={idx} className="bg-white/5 p-3 rounded-lg text-sm">
                <p className="text-white font-semibold">
                  {flight.from} → {flight.to}
                </p>
                <p className="text-white/60 text-xs">
                  {flight.airline} {flight.flight_number}
                </p>
                <p className="text-primary text-sm mt-1">
                  ${Math.round(flight.price_per_person * trip.number_of_travelers)}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Hotels */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Hotel className="text-accent" size={20} />
            <h4 className="text-white font-semibold">Hotels</h4>
          </div>
          <div className="space-y-2">
            {itinerary.hotels.map((hotel, idx) => (
              <div key={idx} className="bg-white/5 p-3 rounded-lg text-sm">
                <p className="text-white font-semibold">{hotel.name}</p>
                <p className="text-white/60 text-xs">
                  {new Date(hotel.check_in_date).toLocaleDateString()} - {new Date(hotel.check_out_date).toLocaleDateString()}
                </p>
                <p className="text-accent text-sm mt-1">
                  ${Math.round(hotel.total_price)}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Sample Activities */}
        <div>
          <h4 className="text-white font-semibold mb-3">Sample Activities (Day 1)</h4>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {itinerary.days[0]?.activities.slice(0, 3).map((activity, idx) => (
              <div key={idx} className="bg-white/5 p-2 rounded-lg text-sm">
                <p className="text-white font-semibold">{activity.title}</p>
                <p className="text-white/60 text-xs">{activity.time}</p>
              </div>
            ))}
          </div>
        </div>
      </GlossyCard>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-teal-800 px-4 py-8">
      <div className={comparing && itinerary2 ? "max-w-7xl mx-auto" : "max-w-4xl mx-auto"}>
        <button
          onClick={() => navigate('/trips')}
          className="flex items-center gap-2 text-white/70 hover:text-white transition-colors mb-8"
        >
          <ArrowLeft size={20} />
          <span>Back to Trips</span>
        </button>

        {/* Trip Header */}
        <GlossyCard className="p-6 mb-6 animate-slide-in">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-white/60 text-sm">Destinations</p>
              <p className="text-white font-semibold">{trip.destinations.join(', ')}</p>
            </div>
            <div>
              <p className="text-white/60 text-sm">Travel Period</p>
              <p className="text-white font-semibold">
                {new Date(trip.travel_start_date).toLocaleDateString()} - {new Date(trip.travel_end_date).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-white/60 text-sm">Travelers</p>
              <p className="text-white font-semibold">{trip.number_of_travelers} {trip.traveler_type}</p>
            </div>
          </div>
        </GlossyCard>

        {/* Comparison View */}
        {comparing && itinerary2 && (
          <>
            <div className="text-center mb-6">
              <h2 className="text-3xl font-bold text-white mb-2">Compare Itineraries</h2>
              <p className="text-white/70">Select your preferred option to continue</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {renderItineraryCard(itinerary1, 1, costBreakdown1)}
              {renderItineraryCard(itinerary2, 2, costBreakdown2!)}
            </div>

            {selectedItinerary && (
              <div className="flex gap-4 mb-6">
                <AnimatedButton
                  variant="outline"
                  onClick={() => {
                    setComparing(false);
                    setCurrentDay(1);
                  }}
                  className="flex-1"
                >
                  View Full Details
                </AnimatedButton>
                <AnimatedButton
                  onClick={saveTrip}
                  className="flex-1"
                  disabled={loading}
                >
                  {loading ? 'Saving...' : 'Save Selected Trip'}
                </AnimatedButton>
              </div>
            )}
          </>
        )}

        {/* Detailed View - Only show when not comparing */}
        {!comparing && (
          <>

        {/* Destination Image */}
        {currentItinerary.destination_image && (
          <GlossyCard className="p-0 mb-6 overflow-hidden h-64">
            <img
              src={currentItinerary.destination_image}
              alt="destination"
              className="w-full h-full object-cover"
            />
          </GlossyCard>
        )}

        {/* Flight and Hotel Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Flights */}
          <GlossyCard className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Plane className="text-primary" size={24} />
              <h3 className="text-white font-bold text-lg">Flights</h3>
            </div>
            <div className="space-y-3">
              {currentItinerary.flights.map((flight, idx) => (
                <div key={idx} className="bg-white/5 p-3 rounded-lg">
                  <p className="text-white text-sm font-semibold">
                    {flight.from} → {flight.to}
                  </p>
                  <p className="text-white/60 text-xs">
                    {flight.date} • {flight.airline} {flight.flight_number}
                  </p>
                  <p className="text-white/70 text-xs">
                    Departure: {flight.departure_time} • Arrival: {flight.arrival_time}
                  </p>
                  <p className="text-white/60 text-xs">Duration: {flight.duration}</p>
                  <div className="mt-2 space-y-1">
                    <p className="text-primary text-sm font-semibold">
                      ${Math.round(flight.price_per_person)}/person
                    </p>
                    <p className="text-white/70 text-xs">
                      Total: ${Math.round(flight.price_per_person * trip.number_of_travelers)} for {trip.number_of_travelers} traveler{trip.number_of_travelers > 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </GlossyCard>

          {/* Hotels */}
          <GlossyCard className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Hotel className="text-accent" size={24} />
              <h3 className="text-white font-bold text-lg">Hotels</h3>
            </div>
            <div className="space-y-3">
              {currentItinerary.hotels.map((hotel, idx) => (
                <div key={idx} className="bg-white/5 p-3 rounded-lg">
                  <p className="text-white text-sm font-semibold">{hotel.name}</p>
                  <p className="text-white/60 text-xs">
                    {new Date(hotel.check_in_date).toLocaleDateString()} - {new Date(hotel.check_out_date).toLocaleDateString()}
                  </p>
                  <p className="text-accent text-sm font-semibold mt-1">
                    ${Math.round(hotel.total_price)}/total (${hotel.price_per_night}/night)
                  </p>
                </div>
              ))}
            </div>
          </GlossyCard>
        </div>

        {/* Day-by-Day Itinerary */}
        <GlossyCard className="p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-white">Day {currentDay}</h2>
              {dayItinerary && <p className="text-white/60">{dayItinerary.city}</p>}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentDay(Math.max(1, currentDay - 1))}
                className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
              >
                ←
              </button>
              <button
                onClick={() => setCurrentDay(Math.min(currentItinerary.days.length, currentDay + 1))}
                className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
              >
                →
              </button>
            </div>
          </div>

          {dayItinerary && (
            <div className="space-y-3 mb-6">
              {dayItinerary.activities.map((activity, idx) => (
                <div key={idx} className="bg-white/5 p-4 rounded-lg border border-white/10">
                  <div className="flex items-start gap-3">
                    <div className="flex items-center gap-2 text-primary font-semibold min-w-fit">
                      <Clock size={16} />
                      {activity.time}
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-semibold">{activity.title}</p>
                      <p className="text-white/60 text-sm">{activity.description}</p>
                      {activity.opening_hours && (
                        <p className="text-white/50 text-xs mt-2">
                          {activity.opening_hours} - {activity.closing_hours}
                        </p>
                      )}
                    </div>
                    <p className="text-white/50 text-sm min-w-fit">{activity.duration}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Notes for the day */}
          <div className="mt-6 pt-6 border-t border-white/10">
            <h4 className="text-white font-semibold mb-3">Day Notes</h4>
            {notes[currentDay] && (
              <div className="bg-white/5 p-3 rounded-lg mb-3 max-h-32 overflow-y-auto">
                <p className="text-white/70 text-sm whitespace-pre-wrap">{notes[currentDay]}</p>
              </div>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Add a note..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addNote()}
                className="flex-1 px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:border-primary"
              />
              <button
                onClick={addNote}
                className="px-4 py-2 bg-primary rounded-lg text-white hover:bg-primary/80 transition-colors flex items-center gap-2"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>
        </GlossyCard>

        {/* Map */}
        <GlossyCard className="p-6 mb-6">
          <h3 className="text-white font-bold mb-4">Trip Map</h3>
          <MapMockup destinations={trip.destinations} />
        </GlossyCard>

        {/* Cost Breakdown */}
        <GlossyCard className="p-6 mb-6">
          <h3 className="text-white font-bold text-lg mb-4">Cost Breakdown</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-white/70">
              <span>Flights</span>
              <span>${costBreakdown.flights_total}</span>
            </div>
            <div className="flex justify-between text-white/70 pb-2 border-b border-white/10">
              <span>Hotels</span>
              <span>${costBreakdown.hotels_total}</span>
            </div>
            <div className="flex justify-between text-white font-bold text-lg pt-2">
              <span>Total</span>
              <span>${costBreakdown.total}</span>
            </div>
            <p className="text-white/50 text-sm mt-4 pt-4 border-t border-white/10">
              Note: Activities and intra-city travel costs are not included in this cost estimate.
            </p>
          </div>
        </GlossyCard>

        {/* Alternate Itinerary */}
        {!itinerary2 && (
          <GlossyCard className="p-6 mb-6">
            <p className="text-white mb-4">Would you like to see an alternate itinerary?</p>
            <div className="flex gap-3">
              <AnimatedButton
                variant="outline"
                onClick={() => {
                  setSelectedItinerary(1);
                  navigate('/trips');
                }}
                className="flex-1"
              >
                No, Save This
              </AnimatedButton>
              <AnimatedButton
                onClick={() => setShowAlternateModal(true)}
                className="flex-1"
              >
                Yes, Show Alternate
              </AnimatedButton>
            </div>
          </GlossyCard>
        )}

        {/* Save Button */}
        <AnimatedButton
          onClick={saveTrip}
          size="lg"
          className="w-full"
          disabled={loading}
        >
          {loading ? 'Saving...' : 'Save This Trip'}
        </AnimatedButton>
        </>
        )}
      </div>

      <Modal
        title="Generate Alternate Itinerary"
        isOpen={showAlternateModal}
        onClose={() => setShowAlternateModal(false)}
        primaryAction={{
          label: 'Generate',
          onClick: generateAlternateItinerary,
        }}
      >
        <p>This will generate an alternative itinerary with different activities, flights, and hotels.</p>
      </Modal>

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </div>
  );
}
