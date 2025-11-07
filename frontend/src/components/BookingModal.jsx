import React, { useState, useEffect } from 'react';
import { add } from 'date-fns';
import apiClient from '../services/apiClient';
import { SPECIALIZATIONS } from '../constants/specializations';

export default function BookingModal({ tailor, service, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSpecialization, setSelectedSpecialization] = useState(service ? undefined : '');
  const [selectedService, setSelectedService] = useState(service || null);
  const [availableServices, setAvailableServices] = useState([]);
  
  // Fetch tailor's services when modal opens
  useEffect(() => {
    const fetchServices = async () => {
      try {
        const services = await apiClient.request(`/api/marketplace/${tailor.username}/services/`);
        setAvailableServices(services);
      } catch (err) {
        setError('Failed to fetch tailor services.');
      }
    };
    
    if (!service) {  
      fetchServices();
    }
  }, [tailor.username, service]);
  
  // Calculate completion date based on service duration
  const completionDate = selectedDate && selectedService ? 
    add(new Date(selectedDate), { days: selectedService.duration_days }) : null;

  const handleSpecializationChange = (serviceId) => {
    setSelectedSpecialization(serviceId);
    setError('');
    
    if (!serviceId) {
      setSelectedService(null);
      return;
    }

    const matchingService = availableServices.find(s => s.id === Number(serviceId));
    if (matchingService) {
      setSelectedService(matchingService);
    } else {
      setError('This service is not available from the selected tailor.');
      setSelectedService(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedDate) {
      setError('Please select a pickup date');
      return;
    }
    if (!selectedService) {
      setError('Please select a service');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await apiClient.createBooking({
        service: selectedService.id,
        pickup_date: new Date(selectedDate).toISOString(),
        delivery_date: completionDate.toISOString(),
      });
      onSuccess?.(response);
    } catch (err) {
      setError(err.message || 'Failed to create booking. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Get minimum date (today) and maximum date (3 months from now)
  const today = new Date().toISOString().split('T')[0];
  const maxDate = add(new Date(), { months: 3 }).toISOString().split('T')[0];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl">
        <h2 className="text-xl font-bold mb-4">Book Service</h2>
        
        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Show specialization dropdown only if no service was pre-selected */}
          {!service && (
            <div>
              <label className="block font-medium mb-2">
                Select Service Type <span className="text-red-600">*</span>
              </label>
              <select
                value={selectedService?.id || ''}
                onChange={(e) => handleSpecializationChange(e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
                required
              >
                <option value="">Choose a service...</option>
                {availableServices.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name} - ₹{service.price}
                  </option>
                ))}
              </select>
              {availableServices.length === 0 && !error && (
                <div className="text-sm text-gray-500 mt-1">Loading available services...</div>
              )}
            </div>
          )}

          {selectedService && (
            <div>
              <h3 className="font-medium mb-2">Service Details</h3>
              <div className="bg-accent/10 p-3 rounded-lg">
                <div className="font-medium">{selectedService.name}</div>
                <div className="text-sm text-neutral/80">₹{selectedService.price}</div>
                <div className="text-sm text-neutral/80">Duration: {selectedService.duration_days} days</div>
              </div>
            </div>
          )}

          <div>
            <label className="block font-medium mb-2">
              Select Pickup Date <span className="text-red-600">*</span>
            </label>
            <input
              type="date"
              min={today}
              max={maxDate}
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
              required
            />
          </div>

          {completionDate && (
            <div className="bg-accent/10 p-3 rounded-lg text-sm">
              <div className="font-medium">Estimated Completion</div>
              <div>{completionDate.toLocaleDateString(undefined, {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}</div>
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={loading || !selectedService}
              className="flex-1 px-4 py-2 bg-primary text-white rounded-lg disabled:opacity-50"
            >
              {loading ? 'Creating Booking...' : 'Confirm Booking'}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 bg-neutral/10 rounded-lg"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
