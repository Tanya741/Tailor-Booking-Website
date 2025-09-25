import React from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../services/apiClient';
import { useAuth } from '../context/AuthContext.jsx';

export default function BookingsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    const hasToken = !!apiClient.accessToken;
    if (!user && !hasToken) navigate('/auth?next=/bookings', { replace: true });
  }, [user, navigate]);

  React.useEffect(() => {
    let cancelled = false;
    async function fetchData() {
      setLoading(true);
      setError('');
      try {
        const data = await apiClient.getMyBookings();
        if (!cancelled) setItems(Array.isArray(data) ? data : (data?.results ?? []));
      } catch (e) {
        if (!cancelled) setError('Failed to load bookings');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchData();
    return () => { cancelled = true; };
  }, []);

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
                </div>
                <div className="text-right text-sm">
                  <div className="uppercase tracking-wide text-neutral">{b.status}</div>
                  <div className="text-neutral/80">{new Date(b.scheduled_time).toLocaleString()}</div>
                  {'price_snapshot' in b && (
                    <div className="text-neutral/90">₹{b.price_snapshot}</div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
