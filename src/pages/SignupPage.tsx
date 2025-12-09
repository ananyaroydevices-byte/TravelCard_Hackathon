import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plane } from 'lucide-react';
import { useAuth } from '../lib/auth-context';
import { GlossyCard } from '../components/GlossyCard';
import { AnimatedButton } from '../components/AnimatedButton';
import { Input } from '../components/Input';
import { Toast, ToastProps } from '../components/Toast';

export function SignupPage() {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<ToastProps | null>(null);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) newErrors.name = 'Name is required';
    if (!email.trim()) newErrors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors.email = 'Invalid email format';
    if (!password) newErrors.password = 'Password is required';
    else if (password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    if (password !== confirmPassword) newErrors.confirmPassword = 'Passwords do not match';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    try {
      await signUp(email, password, name);
      setToast({
        message: 'Account created successfully! Welcome to TravelCard.',
        type: 'success',
        duration: 2000,
        onClose: () => {
          navigate('/trip-details');
        },
      });
    } catch (error: any) {
      setToast({
        message: error.message || 'Failed to create account. Please try again.',
        type: 'error',
        onClose: () => setToast(null),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-teal-800 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md animate-slide-in">
        <GlossyCard className="p-8">
          <div className="flex justify-center mb-8">
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-primary to-accent">
              <Plane className="text-white" size={32} />
            </div>
          </div>

          <h1 className="text-3xl font-bold text-white text-center mb-2">TravelCard</h1>
          <p className="text-white/60 text-center mb-8">Create your travel adventures</p>

          <form onSubmit={handleSignup} className="space-y-4">
            <Input
              placeholder="Full Name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) setErrors({ ...errors, name: '' });
              }}
              error={errors.name}
              disabled={loading}
            />

            <Input
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errors.email) setErrors({ ...errors, email: '' });
              }}
              error={errors.email}
              disabled={loading}
            />

            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errors.password) setErrors({ ...errors, password: '' });
              }}
              error={errors.password}
              disabled={loading}
            />

            <Input
              type="password"
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: '' });
              }}
              error={errors.confirmPassword}
              disabled={loading}
            />

            <AnimatedButton
              type="submit"
              size="lg"
              className="w-full mt-6"
              disabled={loading}
            >
              {loading ? 'Creating Account...' : 'Sign Up'}
            </AnimatedButton>
          </form>

          <p className="text-white/60 text-sm text-center mt-6">
            Already have an account?{' '}
            <button
              type="button"
              onClick={() => navigate('/signin')}
              className="text-primary hover:text-accent transition-colors font-medium"
            >
              Sign In
            </button>
          </p>
        </GlossyCard>
      </div>

      {toast && (
        <Toast
          {...toast}
          onClose={() => {
            if (toast.type === 'success') {
              toast.onClose();
            } else {
              setToast(null);
            }
          }}
        />
      )}
    </div>
  );
}
