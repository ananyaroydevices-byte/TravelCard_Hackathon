import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './lib/auth-context';
import { LoadingSpinner } from './components/LoadingSpinner';
import { SignupPage } from './pages/SignupPage';
import { SigninPage } from './pages/SigninPage';
import { TripDetailsPage } from './pages/TripDetailsPage';
import { TripsListPage } from './pages/TripsListPage';
import { ItineraryPage } from './pages/ItineraryPage';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-teal-800 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return session ? <>{children}</> : <Navigate to="/signin" replace />;
}

export default function App() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-teal-800 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/signin" element={<SigninPage />} />
      <Route
        path="/trip-details"
        element={
          <PrivateRoute>
            <TripDetailsPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/trips"
        element={
          <PrivateRoute>
            <TripsListPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/itinerary/:tripId"
        element={
          <PrivateRoute>
            <ItineraryPage />
          </PrivateRoute>
        }
      />
      <Route path="/" element={<Navigate to={session ? '/trips' : '/signup'} replace />} />
    </Routes>
  );
}
