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

  function getErrorMessage(error, currentMode) {
    // First, try to extract the actual error message from various possible locations
    let errorMessage = '';
    
    // Check for Django REST Framework 'detail' field
    if (error?.response?.data?.detail) {
      errorMessage = error.response.data.detail;
    }
    // Check for non_field_errors array
    else if (error?.response?.data?.non_field_errors && Array.isArray(error.response.data.non_field_errors)) {
      errorMessage = error.response.data.non_field_errors[0];
    }
    // Check for field-specific errors
    else if (error?.response?.data && typeof error.response.data === 'object') {
      const errorData = error.response.data;
      const fieldErrors = [];
      Object.keys(errorData).forEach(field => {
        if (Array.isArray(errorData[field])) {
          const fieldName = field === 'non_field_errors' ? '' : field.charAt(0).toUpperCase() + field.slice(1);
          fieldErrors.push(`${fieldName ? fieldName + ': ' : ''}${errorData[field][0]}`);
        }
      });
      if (fieldErrors.length > 0) {
        errorMessage = fieldErrors.join('. ');
      }
    }
    // Check if error.response.data is a string
    else if (typeof error?.response?.data === 'string') {
      errorMessage = error.response.data;
    }
    // Check if it's a direct string error
    else if (typeof error === 'string') {
      errorMessage = error;
    }
    // Check error message property
    else if (error?.message) {
      errorMessage = error.message;
    }
    
    // If we still don't have a message, provide a generic one
    if (!errorMessage) {
      errorMessage = "An unexpected error occurred";
    }
    
    // Now process the error message to make it user-friendly
    const errorLower = errorMessage.toLowerCase();
    
    if (currentMode === 'login') {
      if (errorLower.includes('no active account') || 
          errorLower.includes('invalid credentials') || 
          errorLower.includes('authentication failed') ||
          errorLower.includes('incorrect')) {
        return "Invalid username or password. Don't have an account? Click 'Switch to Register' below.";
      }
      if (errorLower.includes('user') && (errorLower.includes('not found') || errorLower.includes('does not exist'))) {
        return "This account doesn't exist. Would you like to create a new account? Click 'Switch to Register' below.";
      }
      if (errorLower.includes('inactive') || errorLower.includes('disabled')) {
        return "Your account has been deactivated. Please contact support.";
      }
    } else {
      // Registration errors
      if (errorLower.includes('username') && errorLower.includes('already')) {
        return "This username is already taken. Please choose a different username or login if this is your account.";
      }
      if (errorLower.includes('email') && errorLower.includes('already')) {
        return "An account with this email already exists. Please login instead or use a different email.";
      }
      if (errorLower.includes('password') && errorLower.includes('short')) {
        return "Password is too short. Please use at least 8 characters.";
      }
      if (errorLower.includes('password') && errorLower.includes('common')) {
        return "This password is too common. Please choose a stronger password.";
      }
      if (errorLower.includes('username') && errorLower.includes('required')) {
        return "Username is required. Please enter a valid username.";
      }
      if (errorLower.includes('email') && errorLower.includes('invalid')) {
        return "Please enter a valid email address.";
      }
    }
    
    // Network/connection errors
    if (errorLower.includes('network') || errorLower.includes('fetch') || errorLower.includes('connection')) {
      return "Unable to connect to server. Please check your internet connection and try again.";
    }
    
    // Handle HTTP status codes if we have them
    if (error?.response?.status) {
      switch (error.response.status) {
        case 400:
          return currentMode === 'login' 
            ? "Invalid login credentials. Please check your username and password."
            : "Please check your information and try again.";
        case 401:
          return "Invalid username or password. Don't have an account? Click 'Switch to Register' below.";
        case 403:
          return "Access denied. Your account may be inactive or restricted.";
        case 404:
          return "Service not found. Please try again later.";
        case 500:
          return "Server error. Please try again in a few minutes.";
      }
    }
    
    // If no specific handling matched, return the original error message
    return errorMessage;
  }

  async function submit(e) {
    e.preventDefault();
    setOutput(''); // Clear previous messages
    
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
          setOutput('✅ Account created successfully! Redirecting...');
          navigate(next, { replace: true });
        } else {
          setOutput('✅ Account created successfully! You can now login.');
          setMode('login');
        }
      } else {
        const res = await apiClient.login({ username, password });
        // Update UI auth state with returned user if available
        const uiUser = res.user || { username };
        setAuthUser(uiUser);
        setOutput('✅ Login successful! Redirecting...');
        navigate(next, { replace: true });
      }
    } catch (err) {
      const errorMessage = getErrorMessage(err, mode);
      setOutput('❌ ' + errorMessage);
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
        {output && (
          <div className={`mt-4 text-sm rounded p-3 ${
            output.startsWith('✅') 
              ? 'text-green-700 bg-green-100 border border-green-200' 
              : output.startsWith('❌')
              ? 'text-red-700 bg-red-100 border border-red-200'
              : 'text-gray-700 bg-gray-100 border border-gray-200'
          }`}>
            {output}
          </div>
        )}
      </div>
    </div>
  );
}
