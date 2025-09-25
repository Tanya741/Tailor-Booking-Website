import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Link } from 'react-router-dom';
import apiClient from '../services/apiClient';

export default function Profile({ onCloseDrawer }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  // No recent bookings on profile per request

  // Redirect to auth if not logged in and no tokens
  React.useEffect(() => {
    const hasToken = !!apiClient.accessToken;
    if (!user && !hasToken) {
      // If not authenticated, send them home (profile lives in a drawer now)
      onCloseDrawer?.();
      navigate('/', { replace: true });
    }
  }, [user, navigate, onCloseDrawer]);

  const initials = React.useMemo(() => {
    const name = user?.first_name || user?.username || '';
    return name.slice(0, 2).toUpperCase();
  }, [user]);

  const [isEditing, setIsEditing] = React.useState(false);
  const [form, setForm] = React.useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    email: user?.email || '',
  });
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    // keep form in sync when user changes (e.g., after login)
    setForm({
      first_name: user?.first_name || '',
      last_name: user?.last_name || '',
      email: user?.email || '',
    });
  }, [user]);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const onSave = async () => {
    setSaving(true);
    setError('');
    try {
      const updated = await apiClient.updateMyProfile({
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email,
      });
      // update AuthContext user as well
      // We can't import setUser directly; use login(u) which sets and persists
      authLogin(updated);
      setIsEditing(false);
    } catch (e) {
      setError('Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  // Get login from context without changing existing API
  const { login: authLogin } = useAuth();

  return (
    <div className="container py-10">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow ring-1 ring-accent/20 overflow-hidden">
        <div className="p-8 bg-gradient-to-r from-primary/5 to-accent/10">
          <div className="mx-auto h-20 w-20 rounded-full bg-primary/10 text-primary grid place-items-center font-bold text-xl">
            {initials || '?'}
          </div>
          <h2 className="mt-4 text-2xl font-bold text-center text-primary">{user?.username || 'My Profile'}</h2>
          <p className="text-center text-neutral mt-1">{[user?.first_name, user?.last_name].filter(Boolean).join(' ') || '—'}</p>
          <p className="text-center text-neutral/80 text-sm">{user?.email || '—'}</p>
          <p className="mt-2 text-center text-xs font-medium text-primary/80 uppercase tracking-wide">Role: {user?.role || '—'}</p>
        </div>
        <div className="p-6 space-y-4">
          {isEditing ? (
            <div className="space-y-3">
              {error ? <p className="text-sm text-red-600">{error}</p> : null}
              <div>
                <label className="block text-sm font-medium text-neutral mb-1">First name</label>
                <input name="first_name" value={form.first_name} onChange={onChange} className="w-full border rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral mb-1">Last name</label>
                <input name="last_name" value={form.last_name} onChange={onChange} className="w-full border rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral mb-1">Email</label>
                <input type="email" name="email" value={form.email} onChange={onChange} className="w-full border rounded-lg px-3 py-2" />
              </div>
              <div className="flex items-center gap-3 pt-2">
                <button disabled={saving} onClick={onSave} className="px-4 py-2 rounded-lg bg-primary text-white font-semibold hover:bg-primary/90 disabled:opacity-50">
                  {saving ? 'Saving…' : 'Save changes'}
                </button>
                <button disabled={saving} onClick={() => setIsEditing(false)} className="px-4 py-2 rounded-lg bg-neutral/10 text-neutral hover:bg-neutral/20">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <Link to="/bookings" className="w-full inline-flex items-center justify-center px-4 py-3 rounded-xl bg-primary text-white font-semibold hover:bg-primary/90">
                See my bookings
              </Link>
              {user?.role === 'tailor' && (
                <Link to={`/tailor/${encodeURIComponent(user?.username || '')}`} onClick={() => onCloseDrawer?.()} className="w-full inline-flex items-center justify-center px-4 py-3 rounded-xl bg-white text-primary font-semibold ring-1 ring-primary/30 hover:bg-primary/5">
                  View my tailor profile
                </Link>
              )}
              <button onClick={() => setIsEditing(true)} className="w-full inline-flex items-center justify-center px-4 py-3 rounded-xl bg-white text-primary font-semibold ring-1 ring-primary/30 hover:bg-primary/5">
                Edit profile
              </button>
                <div className="pt-2">
                  <LogoutButton onAfterLogout={() => { onCloseDrawer?.(); navigate('/'); }} />
                </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function LogoutButton({ onAfterLogout }) {
  const { logout } = useAuth();
  return (
    <button
      onClick={() => {
        logout();
        // After logout, go home and close drawer if provided
        try { onAfterLogout?.(); } catch (_) {}
      }}
      className="w-full px-4 py-3 rounded-xl bg-accent text-primary font-semibold hover:bg-accent/90"
    >
      Logout
    </button>
  );
}
