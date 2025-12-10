import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload } from 'lucide-react';
import { GlossyCard } from '../components/GlossyCard';
import { AnimatedButton } from '../components/AnimatedButton';
import { Input } from '../components/Input';
import { Select } from '../components/Select';
import { Toast, ToastProps } from '../components/Toast';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { useAuth } from '../lib/auth-context';
import { supabase } from '../lib/supabase';

const DESTINATION_REGIONS: Record<string, string[]> = {
  Europe: ['Paris', 'London', 'Rome', 'Barcelona', 'Amsterdam', 'Vienna', 'Prague', 'Athens', 'Venice', 'Berlin'],
  'Southeast Asia': ['Bangkok', 'Bali', 'Ho Chi Minh City', 'Hanoi', 'Singapore', 'Kuala Lumpur', 'Manila', 'Chiang Mai', 'Phuket'],
  'Middle East': ['Dubai', 'Abu Dhabi', 'Istanbul', 'Jerusalem', 'Cairo', 'Doha', 'Riyadh'],
  'East Asia': ['Tokyo', 'Seoul', 'Bangkok', 'Beijing', 'Shanghai', 'Hong Kong', 'Taipei'],
  Americas: ['New York', 'Los Angeles', 'Miami', 'Mexico City', 'Toronto', 'Vancouver', 'Buenos Aires', 'Rio de Janeiro'],
  'South Asia': ['Mumbai', 'Delhi', 'Bangalore', 'Jaipur', 'Kathmandu', 'Colombo'],
  Africa: ['Cairo', 'Nairobi', 'Cape Town', 'Marrakech', 'Lagos', 'Addis Ababa'],
};

const PURPOSE_OPTIONS = [
  { value: 'Vacation', label: 'Vacation' },
  { value: 'Business', label: 'Business' },
  { value: 'Staycation', label: 'Staycation' },
];

const TRAVELER_TYPE_OPTIONS = [
  { value: 'Solo', label: 'Solo' },
  { value: 'Friends and Family', label: 'Friends and Family' },
  { value: 'Business Travelers', label: 'Business Travelers' },
  { value: 'Content Creators', label: 'Content Creators' },
];

export function TripDetailsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<ToastProps | null>(null);

  const [selectedRegion, setSelectedRegion] = useState('');
  const [destinations, setDestinations] = useState<string[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [purpose, setPurpose] = useState('');
  const [travelerType, setTravelerType] = useState('');
  const [numberOfTravelers, setNumberOfTravelers] = useState('1');
  const [originCity, setOriginCity] = useState('');
  const [mandatoryActivities, setMandatoryActivities] = useState<Record<string, string[]>>({});
  const [travelerImages, setTravelerImages] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

  const handleDestinationSelect = (destination: string) => {
    setDestinations((prev) =>
      prev.includes(destination) ? prev.filter((d) => d !== destination) : [...prev, destination]
    );
  };

  const handleMandatoryActivityChange = (city: string, activities: string) => {
    setMandatoryActivities((prev) => ({
      ...prev,
      [city]: activities.split(',').map((a) => a.trim()).filter((a) => a),
    }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setTravelerImages((prev) => [...prev, ...files]);

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrls((prev) => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setTravelerImages((prev) => prev.filter((_, i) => i !== index));
    setPreviewUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const validateStep = () => {
    if (step === 1) {
      if (selectedRegion && destinations.length > 0) return true;
      setToast({
        message: 'Please select a region and at least one destination',
        type: 'error',
        onClose: () => setToast(null),
      });
      return false;
    } else if (step === 2) {
      if (startDate && endDate && new Date(endDate) > new Date(startDate)) return true;
      setToast({
        message: 'Please select valid travel dates',
        type: 'error',
        onClose: () => setToast(null),
      });
      return false;
    } else if (step === 3) {
      if (purpose && travelerType && numberOfTravelers && originCity) return true;
      setToast({
        message: 'Please fill in all required fields',
        type: 'error',
        onClose: () => setToast(null),
      });
      return false;
    }
    return true;
  };

  const handleNextStep = () => {
    if (validateStep()) {
      setStep(step + 1);
    }
  };

  const handleSubmit = async () => {
    if (!user) {
      setToast({
        message: 'You must be logged in to create a trip',
        type: 'error',
        onClose: () => setToast(null),
      });
      return;
    }

    setLoading(true);
    try {
      const uploadedImageUrls: string[] = [];

      if (travelerImages.length > 0) {
        for (const file of travelerImages) {
          const fileName = `${user.id}/${Date.now()}-${file.name}`;

          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('traveler-photos')
            .upload(fileName, file, {
              contentType: file.type,
              upsert: false
            });

          if (uploadError) {
            throw new Error(`Failed to upload image: ${uploadError.message}`);
          }

          const { data: urlData } = supabase.storage
            .from('traveler-photos')
            .getPublicUrl(uploadData.path);

          const cacheBustedUrl = `${urlData.publicUrl}?t=${Date.now()}`;
          uploadedImageUrls.push(cacheBustedUrl);
        }
      }

      navigate('/itinerary/new', {
        state: {
          tripData: {
            user_id: user.id,
            destinations,
            travel_start_date: startDate,
            travel_end_date: endDate,
            purpose,
            traveler_type: travelerType,
            number_of_travelers: parseInt(numberOfTravelers),
            origin_city: originCity,
            mandatory_activities: mandatoryActivities,
            traveler_images: uploadedImageUrls,
          },
        },
      });
    } catch (error: any) {
      setToast({
        message: error.message || 'Failed to upload images',
        type: 'error',
        onClose: () => setToast(null),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-teal-800 px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => (step > 1 ? setStep(step - 1) : navigate('/trips'))}
          className="flex items-center gap-2 text-white/70 hover:text-white transition-colors mb-8"
        >
          <ArrowLeft size={20} />
          <span>{step > 1 ? 'Back' : 'Back to Trips'}</span>
        </button>

        <GlossyCard className="p-8 animate-slide-in">
          {/* Step 1: Destination */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">Choose Your Destination</h2>
                <p className="text-white/60">Where would you like to travel?</p>
              </div>

              <div>
                <label className="block text-white font-medium mb-3">Region</label>
                <Select
                  options={Object.keys(DESTINATION_REGIONS).map((region) => ({
                    value: region,
                    label: region,
                  }))}
                  value={selectedRegion}
                  onChange={setSelectedRegion}
                  placeholder="Select a region"
                />
              </div>

              {selectedRegion && (
                <div>
                  <label className="block text-white font-medium mb-3">
                    Destinations in {selectedRegion}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {DESTINATION_REGIONS[selectedRegion].map((city) => (
                      <button
                        key={city}
                        onClick={() => handleDestinationSelect(city)}
                        className={`p-3 rounded-lg transition-all text-sm font-medium ${
                          destinations.includes(city)
                            ? 'bg-primary text-white'
                            : 'bg-white/10 text-white/70 hover:bg-white/20'
                        }`}
                      >
                        {city}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {destinations.length > 0 && (
                <div>
                  <p className="text-white text-sm">
                    Selected: {destinations.join(', ')}
                  </p>
                </div>
              )}

              <AnimatedButton onClick={handleNextStep} size="lg" className="w-full">
                Next
              </AnimatedButton>
            </div>
          )}

          {/* Step 2: Travel Dates */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">Travel Dates</h2>
                <p className="text-white/60">When are you planning to travel?</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-white font-medium mb-2">Start Date</label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-white font-medium mb-2">End Date</label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>

              <AnimatedButton onClick={handleNextStep} size="lg" className="w-full">
                Next
              </AnimatedButton>
            </div>
          )}

          {/* Step 3: Travel Details */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">Travel Details</h2>
                <p className="text-white/60">Tell us more about your trip</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-white font-medium mb-2">Purpose</label>
                  <Select
                    options={PURPOSE_OPTIONS}
                    value={purpose}
                    onChange={setPurpose}
                    placeholder="Select purpose"
                  />
                </div>
                <div>
                  <label className="block text-white font-medium mb-2">Traveler Type</label>
                  <Select
                    options={TRAVELER_TYPE_OPTIONS}
                    value={travelerType}
                    onChange={setTravelerType}
                    placeholder="Select type"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-white font-medium mb-2">Number of Travelers</label>
                  <Input
                    type="number"
                    value={numberOfTravelers}
                    onChange={(e) => setNumberOfTravelers(e.target.value)}
                    min="1"
                  />
                </div>
                <div>
                  <label className="block text-white font-medium mb-2">Traveling From</label>
                  <Input
                    placeholder="Enter city name"
                    value={originCity}
                    onChange={(e) => setOriginCity(e.target.value)}
                  />
                </div>
              </div>

              <AnimatedButton onClick={handleNextStep} size="lg" className="w-full">
                Next
              </AnimatedButton>
            </div>
          )}

          {/* Step 4: Mandatory Activities */}
          {step === 4 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">Mandatory Activities</h2>
                <p className="text-white/60">Any specific activities you must do? (optional)</p>
              </div>

              <div className="space-y-4">
                {destinations.map((city) => (
                  <div key={city}>
                    <label className="block text-white font-medium mb-2">{city}</label>
                    <Input
                      placeholder="e.g., Visit Eiffel Tower, Museum tour (comma-separated)"
                      value={mandatoryActivities[city]?.join(', ') || ''}
                      onChange={(e) => handleMandatoryActivityChange(city, e.target.value)}
                    />
                  </div>
                ))}
              </div>

              <AnimatedButton onClick={handleNextStep} size="lg" className="w-full">
                Next
              </AnimatedButton>
            </div>
          )}

          {/* Step 5: Traveler Photos */}
          {step === 5 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">Traveler Photos</h2>
                <p className="text-white/60">Upload photos of travelers (optional)</p>
              </div>

              <div className="border-2 border-dashed border-white/30 rounded-xl p-6 text-center">
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="image-upload"
                />
                <label htmlFor="image-upload" className="cursor-pointer flex flex-col items-center gap-2">
                  <Upload className="text-white/50" size={32} />
                  <span className="text-white/70">Click to upload images</span>
                </label>
              </div>

              {previewUrls.length > 0 && (
                <div className="grid grid-cols-2 gap-4">
                  {previewUrls.map((url, idx) => (
                    <div key={idx} className="relative">
                      <img src={url} alt="preview" className="w-full h-32 object-cover rounded-lg" />
                      <button
                        onClick={() => removeImage(idx)}
                        className="absolute top-1 right-1 bg-error rounded-full p-1 text-white"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-3">
                <AnimatedButton variant="outline" onClick={() => setStep(4)} className="flex-1">
                  Back
                </AnimatedButton>
                <AnimatedButton
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex-1"
                >
                  {loading ? 'Saving...' : 'Generate Itinerary'}
                </AnimatedButton>
              </div>
            </div>
          )}
        </GlossyCard>

        {/* Step Indicator */}
        <div className="flex gap-2 mt-8 justify-center">
          {[1, 2, 3, 4, 5].map((s) => (
            <div
              key={s}
              className={`h-2 w-2 rounded-full transition-all ${
                s <= step ? 'bg-primary w-6' : 'bg-white/20'
              }`}
            />
          ))}
        </div>
      </div>

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      {loading && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
          <LoadingSpinner
            text={
              travelerImages.length > 0
                ? "Creating your personalized AI itinerary image..."
                : "Generating your itinerary..."
            }
          />
        </div>
      )}
    </div>
  );
}
