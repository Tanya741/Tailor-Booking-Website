import React from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import AuthPage from './AuthPage.jsx';
import TailorsList from './TailorsList.jsx';
import ServicesPage from './ServicesPage.jsx';
import BookingsPage from './BookingsPage.jsx';
import Home from './Home.jsx';
import NavBar from '../components/NavBar.jsx';
import Drawer from '../components/Drawer.jsx';
import Footer from '../components/Footer.jsx';
import { AuthProvider, useAuth } from '../context/AuthContext.jsx';
import apiClient from '../services/apiClient';
import Profile from './Profile.jsx';
import TailorProfilePage from './TailorProfilePage.jsx';

// Removed legacy placeholders (BookingHistory, ProfileEdit)

function SessionWatcher() {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  const [expired, setExpired] = React.useState(false);
  React.useEffect(() => {
    const off = apiClient.onSessionExpired(() => {
      setExpired(true);
      logout?.();
    });
    return off;
  }, [logout]);
  if (!expired) return null;
  const next = encodeURIComponent(location.pathname + (location.search || ''));
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[200]">
      <div className="px-4 py-3 rounded-xl bg-red-600 text-white shadow-lg flex items-center gap-3">
        <span>Session expired. Please log in again.</span>
        <button onClick={() => navigate(`/auth?next=${next}`)} className="px-3 py-1 rounded bg-white/20 hover:bg-white/30">Login</button>
      </div>
    </div>
  );
}

export default function App() {
  // Manage a global drawer for profile quick view
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const drawerApi = React.useMemo(() => ({ open: () => setDrawerOpen(true), close: () => setDrawerOpen(false) }), []);
  return (
    <AuthProvider>
      <div className="min-h-screen flex flex-col">
        <NavBar onOpenProfileDrawer={drawerApi.open} />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/tailors" element={<TailorsList />} />
            <Route path="/services" element={<ServicesPage />} />
            <Route path="/bookings" element={<BookingsPage />} />
            <Route path="/tailor/:username" element={<TailorProfilePage />} />
            {/* Profile is now shown in a drawer; no direct route */}
          </Routes>
        </main>
        <Footer />
        <Drawer open={drawerOpen} onClose={drawerApi.close} title="My Profile">
          {drawerOpen && <Profile onCloseDrawer={drawerApi.close} />}
        </Drawer>
        <SessionWatcher />
      </div>
    </AuthProvider>
  );
}
