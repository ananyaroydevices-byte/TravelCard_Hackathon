import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth-context';
import { GlossyCard } from '../components/GlossyCard';
import { AnimatedButton } from '../components/AnimatedButton';
import { Input } from '../components/Input';
import { Toast, ToastProps } from '../components/Toast';

export function SigninPage() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<ToastProps | null>(null);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!email.trim()) newErrors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors.email = 'Invalid email format';
    if (!password) newErrors.password = 'Password is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    try {
      await signIn(email, password);
      setToast({
        message: 'Signed in successfully!',
        type: 'success',
        duration: 2000,
        onClose: () => setToast(null),
      });
      navigate('/trips');
    } catch (error: any) {
      setToast({
        message: error.message || 'Failed to sign in. Please check your credentials.',
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
          <div className="flex justify-center mb-6">
            <img
              src="/journeygenius_logo.jpeg"
              alt="JourneyGenius Logo"
              className="w-64 h-auto"
            />
          </div>

          <p className="text-white/60 text-center mb-8">Welcome back!</p>

          <form onSubmit={handleSignin} className="space-y-4">
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

            <AnimatedButton
              type="submit"
              size="lg"
              className="w-full mt-6"
              disabled={loading}
            >
              {loading ? 'Signing In...' : 'Sign In'}
            </AnimatedButton>
          </form>

          <p className="text-white/60 text-sm text-center mt-6">
            Don't have an account?{' '}
            <button
              type="button"
              onClick={() => navigate('/signup')}
              className="text-primary hover:text-accent transition-colors font-medium"
            >
              Sign Up
            </button>
          </p>
        </GlossyCard>
      </div>

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </div>
  );
}
