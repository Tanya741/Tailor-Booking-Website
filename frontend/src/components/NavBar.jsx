import React from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { UserCircle2 } from 'lucide-react';

export default function NavBar() {
  const { user, logout } = useAuth();
  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b">
      <div className="container h-16 flex items-center gap-6">
        <Link to="/" className="font-display text-2xl font-extrabold text-primary tracking-tight">Tailor It</Link>
        <nav className="hidden md:flex items-center gap-2 text-sm">
          <NavLink to="/" className={({isActive}) => `px-3 py-2 rounded-lg ${isActive? 'bg-primary/5 text-primary' : 'hover:bg-neutral/5'}`}>Home</NavLink>
          <NavLink to="/tailors" className={({isActive}) => `px-3 py-2 rounded-lg ${isActive? 'bg-primary/5 text-primary' : 'hover:bg-neutral/5'}`}>Search</NavLink>
          {user && (
            <>
              <NavLink to="/history" className={({isActive}) => `px-3 py-2 rounded-lg ${isActive? 'bg-primary/5 text-primary' : 'hover:bg-neutral/5'}`}>Booking History</NavLink>
              <NavLink to="/profile" className={({isActive}) => `px-3 py-2 rounded-lg ${isActive? 'bg-primary/5 text-primary' : 'hover:bg-neutral/5'}`}>Profile</NavLink>
            </>
          )}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          {user ? (
            <button onClick={logout} className="btn btn-accent">Logout</button>
          ) : (
            <Link to="/auth" className="btn btn-primary">Login / Signup</Link>
          )}
          <div className="hidden md:block">
            <UserCircle2 className="w-7 h-7 text-neutral/70" />
          </div>
        </div>
      </div>
    </header>
  );
}
