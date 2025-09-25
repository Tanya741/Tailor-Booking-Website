import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SPECIALIZATIONS } from '../constants/specializations';
import useGeolocation from '../hooks/useGeolocation';
import { geocodeAddress, reverseGeocode } from '../services/geocode';

export default function Home() {
  const navigate = useNavigate();
  const [location, setLocation] = useState('');
  const [spec, setSpec] = useState('');
  const { coords, loading: geoLoading, error: geoError, getOnce, startWatch, stopWatch } = useGeolocation();
  const [watching, setWatching] = useState(false);

  const [geoTextError, setGeoTextError] = useState('');
  const [textGeoLoading, setTextGeoLoading] = useState(false);

  // Auto-fill location with a human-friendly address from coords when no typed address
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!location && coords?.latitude && coords?.longitude) {
        const rev = await reverseGeocode(coords.latitude, coords.longitude);
        if (!cancelled && rev?.name) {
          // Only set if user hasn't started typing a value
          setLocation((prev) => (prev ? prev : rev.name));
        }
      }
    })();
    return () => { cancelled = true; };
  }, [location, coords?.latitude, coords?.longitude]);

  const onSearch = async (e) => {
    e.preventDefault();
    setGeoTextError('');
    const params = new URLSearchParams();
    if (location) params.set('location', location);
    if (spec) params.set('specialization', spec);
    const hasTypedAddress = Boolean(location && location.trim());
    let latLng = null;
    if (hasTypedAddress) {
      // Geocode typed address
      try {
        setTextGeoLoading(true);
        const g = await geocodeAddress(location);
        if (g) latLng = g;
        else setGeoTextError('This address is not serviceable.');
      } catch (err) {
        setGeoTextError('This address is not serviceable.');
      } finally {
        setTextGeoLoading(false);
      }
      if (!latLng) return; // stop if typed address could not be geocoded
    } else if (coords?.latitude && coords?.longitude) {
      // Fallback to device coordinates when no typed address
      latLng = { lat: coords.latitude, lng: coords.longitude };
    }
    if (latLng) {
      params.set('lat', String(latLng.lat));
      params.set('lng', String(latLng.lng));
    }
    navigate(`/tailors?${params.toString()}`);
  };
  return (
    <div>
      {/* Hero */}
      <section className="bg-primary text-white">
        <div className="container min-h-screen py-20 flex flex-col justify-center">
          <div className="grid grid-cols-2 gap-12 items-center max-lg:grid-cols-1">
          <div>
            <h1 className="font-display text-white text-6xl leading-tight max-w-2xl">
              We assure that you find the best fit near you
            </h1>
            <p className="mt-4 text-white/90 text-lg max-w-xl">
              Discover trusted tailors nearby. Book appointments, share your fits, and get your clothes delivered — all in one place.
            </p>
          </div>
          <div className="group relative aspect-[16/11] rounded-3xl overflow-hidden ring-1 ring-white/20 shadow-2xl bg-white/10 transition-all duration-500 ease-out hover:ring-accent/40 hover:shadow-[0_20px_40px_rgba(0,0,0,0.25)]">
            <img
              src="/images/hero-sewing-machine.jpg"
              alt="Modern sewing machine with colorful threads"
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
            {/* subtle overlay to blend with primary background */}
            <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 via-transparent to-white/10 transition-opacity duration-500 group-hover:from-primary/20" />
          </div>
          </div>

          {/* Search bar - below hero image & text, full width container */}
          <form className="mt-10" onSubmit={onSearch}>
            <div className="bg-white rounded-2xl p-3 shadow-lg w-full max-w-6xl mx-auto flex flex-col gap-3 sm:flex-row sm:items-center">
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
              <button className="btn btn-accent font-semibold w-full sm:w-auto" type="submit">
                {textGeoLoading ? 'Searching…' : 'Find Tailor Now'}
              </button>
            </div>
            {geoError && (
              <p className="text-sm text-red-600 text-center mt-2">{geoError.message || 'Unable to get location'}.</p>
            )}
            {geoTextError && (
              <p className="text-sm text-red-600 text-center mt-2">{geoTextError}</p>
            )}
          </form>
        </div>
      </section>

      {/* How it works */}
      <section className="container py-16">
        <h2 className="font-display text-3xl text-center">How it works</h2>
        {/* Steps with images - fit within screen, no horizontal scroll */}
        <div className="mt-10">
          <div className="grid grid-cols-4 gap-8 items-start">
            {[
              { label: 'Find suitable tailor', file: 'category04' },
              { label: 'Give Fit at your doorstep', file: 'category02' },
              { label: 'Your fit in progress', file: 'category03' },
              { label: 'Get delivery & enjoy', file: 'category01' },
            ].map(({ label, file }) => (
                <div key={label} className="group text-center space-y-3 min-w-0 cursor-pointer transition-transform duration-300 ease-out hover:-translate-y-0.5">
                  <div className="mx-auto w-30 h-30 md:w-28 md:h-30 lg:w-44 lg:h-46 ">
                  <img
                    src={`/images/${file}.jpg`}
                    alt={label}
                      className="w-full h-full object-cover transition-transform duration-300 ease-out group-hover:scale-105"
                    onError={(e) => {
                      // jpg -> png -> webp fallback chain
                      if (!e.currentTarget.dataset.try) {
                        e.currentTarget.dataset.try = 'png';
                        e.currentTarget.src = `/images/${file}.png`;
                      } else if (e.currentTarget.dataset.try === 'png') {
                        e.currentTarget.dataset.try = 'webp';
                        e.currentTarget.src = `/images/${file}.webp`;
                      } else {
                        e.currentTarget.style.display = 'none';
                      }
                    }}
                  />
                </div>
                <p className="font-medium">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why TailorIt */}
      <section className="container py-14">
        <div className="flex justify-center mb-8">
          <span className="inline-block px-8 py-2 rounded-full bg-accent text-primary font-display text-2xl font-semibold shadow-md border-2 border-accent">
            Why TailorIt
          </span>
        </div>
          <div className="grid grid-cols-4 gap-10 max-lg:grid-cols-2">
          {[
            ['Your time matters','Book and get service from the comfort of your home'],
            ['Your fit is unique','Custom tailored to your measurements'],
            ['Craft meets technology','Skilled tailoring with digital convenience'],
            ['For every wardrobe','Festive, office, daily wear'],
          ].map(([title, desc]) => (
            <div key={title} className="card p-6 border-2 border-accent/80 shadow-lg bg-white/80 backdrop-blur-sm transition-transform duration-300 ease-out hover:-translate-y-1 hover:shadow-xl hover:border-accent cursor-pointer">
              <h3 className="font-semibold text-lg mb-1 text-primary">{title}</h3>
              <p className="text-neutral/70 text-sm">{desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}