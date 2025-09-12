import React from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import AuthPage from './AuthPage.jsx';
import TailorsList from './TailorsList.jsx';
import ServicesPage from './ServicesPage.jsx';
import BookingsPage from './BookingsPage.jsx';
import Home from './Home.jsx';
import NavBar from '../components/NavBar.jsx';
import Footer from '../components/Footer.jsx';
import { AuthProvider } from '../context/AuthContext.jsx';

function BookingHistory() { return <div className="container py-10"><h2 className="text-2xl font-bold">Booking History</h2><p className="text-gray-600">Coming soon (UI only).</p></div>; }
function ProfileEdit() { return <div className="container py-10"><h2 className="text-2xl font-bold">Edit Profile</h2><p className="text-gray-600">Coming soon (UI only).</p></div>; }

export default function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen flex flex-col">
        <NavBar />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/tailors" element={<TailorsList />} />
            <Route path="/services" element={<ServicesPage />} />
            <Route path="/bookings" element={<BookingsPage />} />
            <Route path="/history" element={<BookingHistory />} />
            <Route path="/profile" element={<ProfileEdit />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </AuthProvider>
  );
}
