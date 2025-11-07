import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import apiClient from '../services/apiClient';

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isProcessing, setIsProcessing] = useState(true);
  
  const bookingId = searchParams.get('booking_id');
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    const processPayment = async () => {
      if (!bookingId || !sessionId) {
        toast.error('Invalid payment data');
        navigate('/bookings');
        return;
      }

      try {
        await apiClient.markPaymentComplete(bookingId, sessionId);
        toast.success('Payment successful! Your booking has been confirmed.');
        setTimeout(() => {
          navigate('/bookings');
        }, 2000);
      } catch (error) {
        console.error('Payment verification failed:', error);
        toast.error('Payment verification failed. Please contact support.');
        setTimeout(() => {
          navigate('/bookings');
        }, 3000);
      } finally {
        setIsProcessing(false);
      }
    };

    processPayment();
  }, [bookingId, sessionId, navigate]);

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8 text-center">
        {isProcessing ? (
          <>
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Processing Payment
            </h2>
            <p className="text-gray-600">
              Please wait while we verify your payment...
            </p>
          </>
        ) : (
          <>
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Payment Successful!
            </h2>
            <p className="text-gray-600 mb-4">
              Your booking has been confirmed. You will be redirected to your bookings page shortly.
            </p>
            <button
              onClick={() => navigate('/bookings')}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition duration-200"
            >
              View Bookings
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default PaymentSuccess;