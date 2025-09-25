import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Card from '../components/Card.jsx';
import Button from '../components/Button.jsx';
import RatingStars from '../components/RatingStars.jsx';
import { SPECIALIZATIONS, getSpecializationLabel } from '../constants/specializations';
import apiClient from '../services/apiClient';
import useGeolocation from '../hooks/useGeolocation';
import { useAuth } from '../context/AuthContext.jsx';
import { geocodeAddress, reverseGeocode } from '../services/geocode';


export default function TailorsList() {
  const { search } = useLocation();
  const navigate = useNavigate();
  const params = useMemo(() => new URLSearchParams(search), [search]);
  const activeSpec = params.get('specialization') || '';
  const activeLocation = params.get('location') || '';
  const lat = params.get('lat');
  const lng = params.get('lng');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Local search form state (prefilled from URL)
  const [location, setLocation] = useState(activeLocation);
  const [spec, setSpec] = useState(activeSpec);
  const { coords, loading: geoLoading, error: geoError, getOnce } = useGeolocation();
  const [geoTextError, setGeoTextError] = useState('');
  const [textGeoLoading, setTextGeoLoading] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    // Keep local form in sync with URL changes
    setLocation(activeLocation);
    setSpec(activeSpec);
  }, [activeLocation, activeSpec]);

  // Reverse geocode URL lat/lng into a readable address if no typed location
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!activeLocation && lat && lng) {
        const latNum = Number(lat);
        const lngNum = Number(lng);
        if (!Number.isNaN(latNum) && !Number.isNaN(lngNum)) {
          const rev = await reverseGeocode(latNum, lngNum);
          if (!cancelled && rev?.name) {
            setLocation(rev.name);
          }
        }
      }
    })();
    return () => { cancelled = true; };
  }, [activeLocation, lat, lng]);

  const handleCardClick = (tailor) => {
    const username = tailor.username || tailor.name || '';
    if (username) navigate(`/tailor/${encodeURIComponent(username)}`);
  };
  const handleRequestClick = (e, tailor) => {
    e.stopPropagation();
    // If not authenticated, redirect to auth with next URL
    if (!user && !apiClient.accessToken) {
      const next = `/tailors${search || ''}`;
      navigate(`/auth?mode=register&next=${encodeURIComponent(next)}`);
      return;
    }
    // TODO: open a booking flow
  };

  useEffect(() => {
    const controller = new AbortController();
    async function fetchTailors() {
      setLoading(true);
      setError('');
      try {
        const filters = {};
        if (activeLocation) filters.location = activeLocation;
        if (activeSpec) filters.specialization = activeSpec;
        if (lat != null && lng != null) {
          const latNum = Number(lat);
          const lngNum = Number(lng);
          if (!Number.isNaN(latNum) && !Number.isNaN(lngNum)) {
            filters.lat = latNum;
            filters.lng = lngNum;
          }
        }
        const data = await apiClient.getTailors(filters);
        setItems(Array.isArray(data) ? data : (data?.results ?? []));
      } catch (e) {
        if (e.name !== 'AbortError') setError('Failed to load tailors');
      } finally {
        setLoading(false);
      }
    }
    fetchTailors();
    return () => controller.abort();
  }, [activeLocation, activeSpec, lat, lng]);

  const onSearch = async (e) => {
    e.preventDefault();
    setGeoTextError('');
    const qp = new URLSearchParams();
    if (location) qp.set('location', location);
    if (spec) qp.set('specialization', spec);
    const hasTypedAddress = Boolean(location && location.trim());
    let latLng = null;
    if (hasTypedAddress) {
      try {
        setTextGeoLoading(true);
        const g = await geocodeAddress(location);
        if (g) latLng = g; else setGeoTextError('This address is not serviceable.');
      } catch (err) {
        setGeoTextError('This address is not serviceable.');
      } finally {
        setTextGeoLoading(false);
      }
      // If user typed an address but we couldn't geocode it, stop here
      if (!latLng) return;
    } else if (coords?.latitude && coords?.longitude) {
      latLng = { lat: coords.latitude, lng: coords.longitude };
    }
    if (latLng) {
      qp.set('lat', String(latLng.lat));
      qp.set('lng', String(latLng.lng));
    }
    navigate(`/tailors?${qp.toString()}`);
  };
  return (
    <section className="py-10">
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-primary">Tailors around you</h2>
          <p className="text-gray-500">Find the right fit with golden-standard service</p>
          {/* Inline search bar (same style as Home) */}
          <form className="mt-4" onSubmit={onSearch}>
            <div className="bg-white rounded-2xl p-3 shadow-lg w-full max-w-6xl mx-auto flex flex-col gap-3 sm:flex-row sm:items-center">
              {/** Prefer URL lat/lng for placeholder if present, then browser coords, else generic */}
              {(() => {
                return null;
              })()}
              <input
                className="flex-1 w-full px-4 py-3 rounded-xl border outline-none text-neutral"
                placeholder={'Your address'}
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
              <button
                type="button"
                onClick={getOnce}
                className="px-4 py-3 rounded-xl border text-primary bg-accent/20 hover:bg-accent/30 transition-colors"
                title="Use my current location"
              >
                {geoLoading ? 'Getting location…' : (coords ? 'Using current location' : 'Use my location')}
              </button>
              <select
                className="w-full sm:w-auto px-4 py-3 rounded-xl border text-neutral"
                value={spec}
                onChange={(e) => setSpec(e.target.value)}
              >
                <option value="">Specialization</option>
                {SPECIALIZATIONS.map((s) => (
                  <option key={s.slug} value={s.slug}>{s.label}</option>
                ))}
              </select>
              <button className="px-4 py-3 rounded-xl bg-primary text-white font-semibold hover:bg-primary/90 transition-colors w-full sm:w-auto" type="submit">
                {textGeoLoading ? 'Searching…' : 'Change & Search'}
              </button>
            </div>
            {/* {!location && lat && lng && (
              <p className="text-sm text-neutral text-center mt-2">
                Current location: Lat {Number(lat).toFixed(5)}, Lng {Number(lng).toFixed(5)}
              </p>
            )} */}
            {geoError && (
              <p className="text-sm text-red-600 text-center mt-2">{geoError.message || 'Unable to get location'}.</p>
            )}
            {geoTextError && (
              <p className="text-sm text-red-600 text-center mt-2">{geoTextError}</p>
            )}
          </form>
        </div>

        {(activeSpec || activeLocation) && (
          <div className="mb-6 flex flex-wrap items-center gap-3">
            {activeLocation && (
              <span className="px-3 py-1 rounded-full border border-accent text-primary text-sm bg-accent/10">
                Location: {activeLocation}
              </span>
            )}
            {activeSpec && (
              <span className="px-3 py-1 rounded-full border border-accent text-primary text-sm bg-accent/10">
                Specialization: {getSpecializationLabel(activeSpec)}
              </span>
            )}
          </div>
        )}

        {loading && (
          <div className="py-12 text-center text-gray-500">Loading tailors…</div>
        )}
        {!loading && error && (
          <div className="py-12 text-center text-red-600">{error}</div>
        )}
        {!loading && !error && (items.length === 0) && (
          <div className="py-12 text-center text-gray-500">No tailors found. Try changing filters.</div>
        )}
        {!loading && !error && items.length > 0 && (
          <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 items-stretch">
            {items.map((t) => {
              // Map API fields to UI
              const name = t.username || t.name || 'Tailor';
              const rating = typeof t.avg_rating === 'number' ? t.avg_rating : (t.rating ?? 0);
              const reviews = t.total_reviews ?? t.reviews ?? 0;
              const specialties = Array.isArray(t.specializations)
                ? t.specializations.map((s) => s.name).join(', ')
                : (t.specialty || '');
              const distance = typeof t.distance_km === 'number' ? t.distance_km : null;
              const matched = t.matched_service || null; // { id, name, price, duration_minutes }
              const searchedSpecLabel = activeSpec ? getSpecializationLabel(activeSpec) : '';
              // Simple initials avatar since we don't have a photo field
              const initials = (name || '').trim().slice(0, 2).toUpperCase();
              return (
                <div
                  key={t.id || t.user_id || name}
                  className="group cursor-pointer h-full"
                  role="button"
                  tabIndex={0}
                  onClick={() => handleCardClick(t)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCardClick(t)}
                >
                  <Card className="h-full flex flex-col overflow-hidden transition-all ring-1 ring-accent/20 hover:ring-accent/70 hover:shadow-xl hover:-translate-y-0.5">
                    <div className="relative aspect-video bg-gray-100 grid place-items-center text-gray-400">
                      {/* Cover area; show avatar badge */}
                      <div className="absolute bottom-2 left-2 h-12 w-12 rounded-full bg-white ring-1 ring-gray-200 overflow-hidden grid place-items-center">
                        <span className="text-sm font-semibold text-gray-700">{initials}</span>
                      </div>
                      {distance != null && (
                        <span className="absolute top-2 right-2 text-xs px-2 py-1 rounded-full bg-accent text-primary shadow">
                          {distance.toFixed(1)} km
                        </span>
                      )}
                    </div>
                    <div className="p-4 space-y-2 flex flex-col grow">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-lg truncate" title={name}>{name}</h3>
                      </div>
                      {specialties && (
                        <p className="text-sm text-gray-600 truncate" title={specialties}>{specialties}</p>
                      )}
                      {/* Searched specialization, price, and duration on separate lines */}
                      {searchedSpecLabel && (
                        <div className="text-sm text-gray-700 space-y-0.5">
                          <div className="font-medium">{searchedSpecLabel}</div>
                          <div>₹{matched?.price ?? 'N/A'}</div>
                          <div>{matched?.duration_minutes != null ? `${matched.duration_minutes} min` : 'N/A'}</div>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <RatingStars value={Math.round(rating)} />
                        <span className="text-sm text-gray-500">{rating?.toFixed ? rating.toFixed(1) : rating} • {reviews} reviews</span>
                      </div>
                      <div className="pt-2 mt-auto">
                        <Button className="w-full bg-primary text-white hover:bg-primary/90" onClick={(e) => handleRequestClick(e, t)}>
                          Request Tailor
                        </Button>
                      </div>
                    </div>
                  </Card>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
