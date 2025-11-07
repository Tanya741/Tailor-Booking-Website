import React from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../services/apiClient';
import { useAuth } from '../context/AuthContext.jsx';
import toast from 'react-hot-toast';
import ReviewImageUpload from '../components/ReviewImageUpload';

export default function BookingsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = React.useState([]);
  const [loading, setLoading] = React.useState(true); // Start with true for initial load
  const [error, setError] = React.useState('');
  
  // Review modal state
  const [showReviewModal, setShowReviewModal] = React.useState(false);
  const [reviewingBooking, setReviewingBooking] = React.useState(null);
  const [reviewRating, setReviewRating] = React.useState(5);
  const [reviewComment, setReviewComment] = React.useState('');
  const [reviewImages, setReviewImages] = React.useState([]);
  const [submittingReview, setSubmittingReview] = React.useState(false);

  React.useEffect(() => {
    const hasToken = !!apiClient.accessToken;
    if (!user && !hasToken) navigate('/auth?next=/bookings', { replace: true });
  }, [user, navigate]);

  const fetchBookings = React.useCallback(async (isPolling = false) => {
    try {
      const data = await apiClient.getMyBookings();
      const bookings = Array.isArray(data) ? data : (data?.results ?? []);
      
      // Update items state
      setItems(bookings);
      
      // Clear error on successful fetch
      setError('');
      
      // Only set loading to false after first successful fetch
      if (loading) {
        setLoading(false);
      }
    } catch (e) {
      // Only show error for non-polling requests to avoid error spam
      if (!isPolling) {
        setError('Failed to load bookings');
        setLoading(false);
      }
    }
  }, [loading]);

  // Handle booking status updates
  const handleStatusUpdate = async (bookingId, newStatus, booking) => {
    try {
      // Validate status transitions
      if (newStatus === 'pickup_ready' && booking.payment_status?.toLowerCase() !== 'paid') {
        toast.error('Cannot mark as ready for pickup until payment is received');
        return;
      }

      await apiClient.updateBookingStatus(bookingId, newStatus);
      toast.success(`Booking ${newStatus.toLowerCase().replace('_', ' ')} successfully`);
      fetchBookings(false); // Refresh bookings list immediately
    } catch (err) {
      toast.error(err.response?.data?.[0] || err.message || 'Failed to update booking status');
    }
  };

  // Handle payment initiation
  const handlePayment = async (bookingId) => {
    try {
      const response = await apiClient.initiatePayment(bookingId);
      
      if (response.checkout_url) {
        // Redirect to Stripe Checkout
        window.location.href = response.checkout_url;
      } else {
        toast.error('Failed to initialize payment');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to process payment');
    }
  };

  // Handle review modal
  const handleOpenReviewModal = (booking) => {
    setReviewingBooking(booking);
    setReviewRating(5);
    setReviewComment('');
    setShowReviewModal(true);
  };

  const handleCloseReviewModal = () => {
    setShowReviewModal(false);
    setReviewingBooking(null);
    setReviewRating(5);
    setReviewComment('');
    // Clean up image previews
    reviewImages.forEach(img => {
      if (img.isLocal && img.preview) {
        URL.revokeObjectURL(img.preview);
      }
    });
    setReviewImages([]);
    setSubmittingReview(false);
  };

  // Handle review submission
  const handleSubmitReview = async () => {
    if (!reviewingBooking || submittingReview) return;

    setSubmittingReview(true);
    try {
      // First create the review
      const createdReview = await apiClient.createReview(reviewingBooking.id, reviewRating, reviewComment);
      
      // Then upload images if any
      const localImages = reviewImages.filter(img => img.isLocal);
      
      if (localImages.length > 0) {
        if (!createdReview?.id) {
          throw new Error('Review was created but no ID returned');
        }
        
        toast.loading('Uploading review images...');
        
        try {
          // Upload images one by one to better handle errors
          for (let i = 0; i < localImages.length; i++) {
            const img = localImages[i];
            if (img.file) {
              await apiClient.uploadReviewImage(createdReview.id, img.file);
            }
          }
          toast.dismiss(); // Remove loading toast
          toast.success(`Review with ${localImages.length} image(s) submitted successfully!`);
        } catch (imageError) {
          toast.dismiss(); // Remove loading toast
          toast.success('Review submitted successfully!');
          toast.error(`Some images failed to upload: ${imageError.message}`);
        }
      } else {
        toast.success('Review submitted successfully!');
      }
      
      handleCloseReviewModal();
      fetchBookings(false); // Refresh to show review status
    } catch (err) {
      toast.error(err.message || 'Failed to submit review');
      setSubmittingReview(false);
    }
  };

  // Real-time polling for booking updates every second
  React.useEffect(() => {
    let cancelled = false;
    let intervalId = null;

    const fetchAndRefresh = async (isPolling = false) => {
      if (cancelled) return;
      await fetchBookings(isPolling);
    };

    // Initial fetch
    fetchAndRefresh(false);

    // Set up real-time polling every 1 second
    intervalId = setInterval(() => fetchAndRefresh(true), 1000);

    return () => {
      cancelled = true;
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [fetchBookings]);

  return (
    <section className="container py-10">
      <h2 className="text-2xl font-bold text-primary mb-4">My Bookings</h2>
      {loading && <div className="text-neutral">Loading…</div>}
      {error && <div className="text-red-600">{error}</div>}
      {!loading && !error && items.length === 0 && (
        <div className="text-neutral">No bookings yet.</div>
      )}
      {!loading && !error && items.length > 0 && (
        <div className="grid gap-4">
          {items.map(b => (
            <div key={b.id} className="rounded-xl border ring-1 ring-accent/20 p-4 bg-white">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="font-semibold">{b.service_name || `Service #${b.service}`}</div>
                  <div className="text-sm text-neutral/80">
                    {user?.role === 'customer' ? `Tailor: ${b.tailor_username}` : `Customer: ${b.customer_username}`}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                      ${b.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                        b.status === 'ACCEPTED' ? 'bg-blue-100 text-blue-800' :
                        b.status === 'PICKUP_READY' ? 'bg-purple-100 text-purple-800' :
                        b.status === 'PICKED_UP' ? 'bg-indigo-100 text-indigo-800' :
                        b.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                        b.status === 'CANCELLED' || b.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'}`}>
                      {b.status}
                    </span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                      ${b.payment_status === 'PAID' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {b.payment_status || 'UNPAID'}
                    </span>
                  </div>
                </div>
                <div className="text-right text-sm">
                  <div className="text-neutral/80">
                    <div>Pickup: {new Date(b.pickup_date).toLocaleDateString()}</div>
                    <div>Delivery: {new Date(b.delivery_date).toLocaleDateString()}</div>
                  </div>
                  {'price_snapshot' in b && (
                    <div className="text-neutral/90 font-medium">₹{b.price_snapshot}</div>
                  )}
                  
                  {/* Action buttons based on role and booking status */}
                  <div className="mt-3 space-y-2">
                    {user?.role === 'tailor' && b.status?.toLowerCase() === 'pending' && (
                      <>
                        <button
                          onClick={() => handleStatusUpdate(b.id, 'accepted', b)}
                          className="w-full px-3 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-primary/90"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => handleStatusUpdate(b.id, 'rejected', b)}
                          className="w-full px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
                        >
                          Reject
                        </button>
                      </>
                    )}
                    
                    {user?.role === 'tailor' && b.status?.toLowerCase() === 'accepted' && (
                      b.payment_status?.toLowerCase() === 'paid' ? (
                        <button
                          onClick={() => handleStatusUpdate(b.id, 'pickup_ready', b)}
                          className="w-full px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700"
                        >
                          Mark Ready for Pickup
                        </button>
                      ) : (
                        <div className="text-sm text-yellow-600 font-medium text-center py-1.5">
                          Waiting for Payment
                        </div>
                      )
                    )}
                    
                    {user?.role === 'tailor' && b.status?.toLowerCase() === 'pickup_ready' && (
                      <button
                        onClick={() => handleStatusUpdate(b.id, 'picked_up', b)}
                        className="w-full px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        Mark as Picked Up
                      </button>
                    )}
                    
                    {user?.role === 'tailor' && b.status?.toLowerCase() === 'picked_up' && (
                      <button
                        onClick={() => handleStatusUpdate(b.id, 'completed', b)}
                        className="w-full px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700"
                      >
                        Mark Complete
                      </button>
                    )}
                    
                    {user?.role === 'customer' && b.status?.toLowerCase() === 'pending' && (
                      <button
                        onClick={() => handleStatusUpdate(b.id, 'cancelled', b)}
                        className="w-full px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
                      >
                        Cancel Booking
                      </button>
                    )}
                    
                    {user?.role === 'customer' && 
                      b.status?.toLowerCase() === 'accepted' && 
                      (!b.payment_status || b.payment_status?.toLowerCase() === 'unpaid') && (
                      <button
                        onClick={() => handlePayment(b.id)}
                        className="w-full px-3 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-primary/90"
                      >
                        Pay Now
                      </button>
                    )}
                    
                    {user?.role === 'customer' && 
                      b.status?.toLowerCase() === 'completed' && 
                      !b.has_review && (
                      <button
                        onClick={() => handleOpenReviewModal(b)}
                        className="w-full px-3 py-1.5 text-sm bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
                      >
                        Write Review
                      </button>
                    )}
                    
                    {user?.role === 'customer' && 
                      b.status?.toLowerCase() === 'completed' && 
                      b.has_review && (
                      <div className="w-full px-3 py-1.5 text-sm bg-green-100 text-green-800 rounded-lg text-center">
                        Review Submitted
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Review Modal */}
      {showReviewModal && reviewingBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <h3 className="text-lg font-semibold mb-4">Write Review</h3>
            <p className="text-sm text-gray-600 mb-4">
              Review for: {reviewingBooking.service_name} by {reviewingBooking.tailor_username}
            </p>
            
            {/* Rating */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rating
              </label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setReviewRating(star)}
                    className={`text-2xl ${
                      star <= reviewRating ? 'text-yellow-400' : 'text-gray-300'
                    } hover:text-yellow-400`}
                  >
                    ★
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {reviewRating} star{reviewRating !== 1 ? 's' : ''}
              </p>
            </div>
            
            {/* Comment */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Comment (optional)
              </label>
              <textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={4}
                placeholder="Share your experience with this tailor..."
              />
            </div>

            {/* Images */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Photos (optional)
              </label>
              <p className="text-xs text-gray-500 mb-3">
                Add photos to showcase the work you received (max 5 images)
              </p>
              <ReviewImageUpload
                images={reviewImages}
                onImagesChange={setReviewImages}
                maxImages={5}
                disabled={submittingReview}
              />
            </div>
            
            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={handleCloseReviewModal}
                disabled={submittingReview}
                className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitReview}
                disabled={submittingReview}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submittingReview ? 'Submitting...' : 'Submit Review'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}