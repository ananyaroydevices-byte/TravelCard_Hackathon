import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Plus, MapPin, Calendar, Users } from 'lucide-react';
import { GlossyCard } from '../components/GlossyCard';
import { AnimatedButton } from '../components/AnimatedButton';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { Toast, ToastProps } from '../components/Toast';
import { supabase, Trip } from '../lib/supabase';
import { useAuth } from '../lib/auth-context';

export function TripsListPage() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<ToastProps | null>(null);

  useEffect(() => {
    loadTrips();
  }, [user]);

  const loadTrips = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('trips')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTrips(data || []);
    } catch (error: any) {
      setToast({
        message: error.message || 'Failed to load trips',
        type: 'error',
        onClose: () => setToast(null),
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/signin');
    } catch (error: any) {
      setToast({
        message: error.message || 'Failed to sign out',
        type: 'error',
        onClose: () => setToast(null),
      });
    }
  };

  const handleDeleteTrip = async (tripId: string) => {
    try {
      const { error } = await supabase.from('trips').delete().eq('id', tripId);
      if (error) throw error;
      setTrips(trips.filter((t) => t.id !== tripId));
      setToast({
        message: 'Trip deleted',
        type: 'success',
        onClose: () => setToast(null),
      });
    } catch (error: any) {
      setToast({
        message: error.message || 'Failed to delete trip',
        type: 'error',
        onClose: () => setToast(null),
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-teal-800 flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading your trips..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-teal-800 px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 animate-slide-in">
          <div>
            <h1 className="text-4xl font-bold text-white">My Trips</h1>
            <p className="text-white/60 mt-2">Welcome back, {user?.email}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <LogOut size={20} />
            Sign Out
          </button>
        </div>

        {/* New Trip Button */}
        <div className="mb-8">
          <AnimatedButton
            onClick={() => navigate('/trip-details')}
            size="lg"
            className="w-full flex items-center justify-center gap-2"
          >
            <Plus size={20} />
            Plan a New Trip
          </AnimatedButton>
        </div>

        {/* Trips Grid */}
        {trips.length === 0 ? (
          <GlossyCard className="p-12 text-center">
            <div className="flex flex-col items-center gap-4">
              <MapPin className="text-white/50" size={48} />
              <p className="text-white/70 text-lg">No trips yet</p>
              <p className="text-white/50">Start planning your first adventure!</p>
            </div>
          </GlossyCard>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {trips.map((trip, idx) => (
              <GlossyCard
                key={trip.id}
                className="p-6 cursor-pointer hover:bg-white/15 transition-colors animate-slide-in"
                onClick={() => navigate(`/itinerary/${trip.id}`)}
                style={{
                  animationDelay: `${idx * 50}ms`,
                }}
              >
                <h3 className="text-white font-bold text-lg mb-3">
                  {trip.destinations.join(' → ')}
                </h3>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-white/70 text-sm">
                    <Calendar size={16} />
                    {new Date(trip.travel_start_date).toLocaleDateString()} -{' '}
                    {new Date(trip.travel_end_date).toLocaleDateString()}
                  </div>

                  <div className="flex items-center gap-2 text-white/70 text-sm">
                    <Users size={16} />
                    {trip.number_of_travelers} {trip.traveler_type}
                  </div>

                  <div className="flex items-center gap-2 text-white/70 text-sm">
                    <MapPin size={16} />
                    From {trip.origin_city}
                  </div>
                </div>

                <div className="pt-4 border-t border-white/10 flex gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/itinerary/${trip.id}`);
                    }}
                    className="flex-1 px-3 py-2 rounded-lg bg-primary hover:bg-primary/80 text-white text-sm font-medium transition-colors"
                  >
                    View
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteTrip(trip.id);
                    }}
                    className="flex-1 px-3 py-2 rounded-lg bg-error/20 hover:bg-error/30 text-error text-sm font-medium transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </GlossyCard>
            ))}
          </div>
        )}
      </div>

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </div>
  );
}
