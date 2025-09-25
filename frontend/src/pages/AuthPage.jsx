import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import apiClient from '../services/apiClient.js';
import { useAuth } from '../context/AuthContext.jsx';
import useGeolocation from '../hooks/useGeolocation';
import { reverseGeocode } from '../services/geocode';

export default function AuthPage() {
  const navigate = useNavigate();
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  const next = params.get('next') || '/';
  const { login: setAuthUser } = useAuth();
  const [mode, setMode] = useState(params.get('mode') === 'register' ? 'register' : 'login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('customer');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [lat, setLat] = useState(''); // hidden, not displayed
  const [lng, setLng] = useState(''); // hidden, not displayed
  const [address, setAddress] = useState('');
  const [output, setOutput] = useState('');
  const { coords, loading: geoLoading, error: geoError, getOnce } = useGeolocation();

  useEffect(() => {
    // If geolocation available and we don't have lat/lng yet, populate and reverse geocode
    (async () => {
      if (coords?.latitude && coords?.longitude && (!lat || !lng)) {
        const latNum = Number(coords.latitude);
        const lngNum = Number(coords.longitude);
        setLat(String(latNum));
        setLng(String(lngNum));
        const rev = await reverseGeocode(latNum, lngNum);
        if (rev?.name) setAddress((prev) => prev || rev.name);
      }
    })();
  }, [coords, lat, lng]);

  async function submit(e) {
    e.preventDefault();
    try {
      if (mode === 'register') {
        // Resolve lat/lng: if user typed an address, geocode it; else use coords if present
        let latVal = lat ? Number(lat) : null;
        let lngVal = lng ? Number(lng) : null;
        if (address && address.trim()) {
          const g = await (await import('../services/geocode')).geocodeAddress(address.trim());
          if (!g) {
            setOutput('This address is not serviceable.');
            return;
          }
          latVal = g.lat;
          lngVal = g.lng;
        }
        const payload = {
          action: 'register',
          username,
          email,
          password,
          role,
          latitude: latVal,
          longitude: lngVal,
          first_name: firstName || undefined,
          last_name: lastName || undefined,
        };
        const res = await apiClient.register(payload);
        // CombinedAuth returns tokens and user; apiClient persists them. Update UI auth state.
        if (res?.access) {
          const uiUser = res.user || { username, email, role };
          setAuthUser(uiUser);
          setOutput('Registered! Redirecting...');
          navigate(next, { replace: true });
        } else {
          setOutput('Registered. You can now login.');
          setMode('login');
        }
      } else {
        const res = await apiClient.login({ username, password });
        // Update UI auth state with returned user if available
        const uiUser = res.user || { username };
        setAuthUser(uiUser);
        setOutput('Logged in! Redirecting...');
        navigate(next, { replace: true });
      }
    } catch (err) {
      setOutput('Error: ' + (err.message || 'Unknown'));
    }
  }

  return (
    <div className="container py-10">
      <div className="max-w-xl mx-auto bg-white rounded-2xl p-6 shadow">
        <h2 className="text-2xl font-bold text-primary mb-4">{mode === 'login' ? 'Login' : 'Create your account'}</h2>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Username <span className="text-red-600">*</span></label>
            <input className="mt-1 w-full px-3 py-2 rounded border" value={username} onChange={e => setUsername(e.target.value)} type="text" required />
          </div>
          {mode === 'register' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email <span className="text-red-600">*</span></label>
                <input className="mt-1 w-full px-3 py-2 rounded border" value={email} onChange={e => setEmail(e.target.value)} type="email" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">First name</label>
                  <input className="mt-1 w-full px-3 py-2 rounded border" value={firstName} onChange={e => setFirstName(e.target.value)} type="text" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Last name</label>
                  <input className="mt-1 w-full px-3 py-2 rounded border" value={lastName} onChange={e => setLastName(e.target.value)} type="text" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Role <span className="text-red-600">*</span></label>
                <select className="mt-1 w-full px-3 py-2 rounded border" value={role} onChange={e => setRole(e.target.value)} required>
                  <option value="customer">Customer</option>
                  <option value="tailor">Tailor</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Address</label>
                <input className="mt-1 w-full px-3 py-2 rounded border" value={address} onChange={e => setAddress(e.target.value)} type="text" placeholder="Type your address or use current location" />
              </div>
              <div className="flex items-center gap-3">
                <button type="button" onClick={getOnce} className="px-3 py-2 rounded border bg-accent/20 text-primary hover:bg-accent/30">
                  {geoLoading ? 'Getting location…' : (address ? 'Using current location' : 'Use my location')}
                </button>
                {geoError && (
                  <span className="text-sm text-red-600">{geoError.message || 'Geolocation failed'}</span>
                )}
              </div>
            </>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700">Password <span className="text-red-600">*</span></label>
            <input className="mt-1 w-full px-3 py-2 rounded border" value={password} onChange={e => setPassword(e.target.value)} type="password" required />
            <p className="text-xs text-gray-500 mt-1">At least 6 characters.</p>
          </div>
          <button className="w-full bg-primary text-white rounded py-2 hover:bg-primary/90" type="submit">{mode === 'login' ? 'Login' : 'Register'}</button>
        </form>
        <button onClick={() => setMode(m => m === 'login' ? 'register' : 'login')} className="w-full mt-3 text-sm text-primary hover:underline">
          Switch to {mode === 'login' ? 'Register' : 'Login'}
        </button>
        {output && <div className="mt-4 text-sm text-gray-700 bg-gray-100 rounded p-3">{output}</div>}
      </div>
    </div>
  );
}
