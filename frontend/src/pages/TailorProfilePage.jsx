import React from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import apiClient from '../services/apiClient';
import { SPECIALIZATIONS } from '../constants/specializations';

export default function TailorProfilePage() {
  const { username } = useParams();
  const { user } = useAuth();
  const isOwner = Boolean(user && user.username === username && user.role === 'tailor');

  const [profile, setProfile] = React.useState(null);
  const [services, setServices] = React.useState([]);
  const [svcForm, setSvcForm] = React.useState({ id: null, specSlug: '', description: '', price: '', duration_minutes: '', is_active: true });
  const [svcSaving, setSvcSaving] = React.useState(false);
  const [svcError, setSvcError] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');

  const [editMode, setEditMode] = React.useState(false);
  const [form, setForm] = React.useState({ bio: '', years_experience: 0, specializations: [] });
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const p = await apiClient.request(`/api/marketplace/${encodeURIComponent(username)}/`);
        const s = await apiClient.request(`/api/marketplace/${encodeURIComponent(username)}/services/`);
        if (!cancelled) {
          setProfile(p);
          setServices(Array.isArray(s) ? s : (s?.results ?? []));
          setForm({
            bio: p?.bio || '',
            years_experience: p?.years_experience ?? 0,
            // Store slugs in form state for multi-select convenience; map from names when saving
            specializations: Array.isArray(p?.specializations)
              ? p.specializations.map((x) => (x.slug || x.name?.toLowerCase?.().replace(/\s+/g, '-') || '')).filter(Boolean)
              : [],
          });
        }
      } catch (e) {
        if (!cancelled) setError('Failed to load tailor profile.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [username]);

  const onChange = (e) => {
    const { name, value, multiple, selectedOptions } = e.target;
    if (multiple) {
      const values = Array.from(selectedOptions).map((o) => o.value);
      setForm((f) => ({ ...f, [name]: values }));
    } else {
      setForm((f) => ({ ...f, [name]: name === 'years_experience' ? Number(value) : value }));
    }
  };

  const resetSvcForm = () => { setSvcError(''); setSvcForm({ id: null, specSlug: '', description: '', price: '', duration_minutes: '', is_active: true }); };
  const onSvcEdit = (svc) => {
    // Try to infer specSlug from the service name by matching a specialization label
    const match = SPECIALIZATIONS.find((s) => (s.label || '').toLowerCase() === (svc.name || '').toLowerCase());
    setSvcError('');
    setSvcForm({ id: svc.id, specSlug: match ? match.slug : '', description: svc.description || '', price: String(svc.price), duration_minutes: String(svc.duration_minutes), is_active: !!svc.is_active });
  };
  const onSvcChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSvcForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  };
  const onSvcSave = async () => {
    // Basic client-side validation
    setSvcError('');
    const chosen = SPECIALIZATIONS.find((s) => s.slug === svcForm.specSlug);
    const priceNum = Number(svcForm.price);
    const durNum = Number(svcForm.duration_minutes);
    if (!chosen) {
      setSvcError('Please select a service type.');
      return;
    }
    if (!Number.isFinite(priceNum) || priceNum < 0) {
      setSvcError('Please enter a valid cost (₹0 or more).');
      return;
    }
    if (!Number.isFinite(durNum) || durNum < 1) {
      setSvcError('Please enter a valid duration (at least 1 minute).');
      return;
    }
    setSvcSaving(true);
    try {
      const payload = {
        name: chosen.label,
        description: svcForm.description,
        price: priceNum,
        duration_minutes: durNum,
        is_active: !!svcForm.is_active,
      };
      if (svcForm.id) {
        const updated = await apiClient.updateMyService(svcForm.id, payload);
        setServices((arr) => arr.map((x) => (x.id === updated.id ? updated : x)));
      } else {
        const created = await apiClient.createMyService(payload);
        setServices((arr) => [created, ...arr]);
      }
      resetSvcForm();
    } catch (_) {
      // eslint-disable-next-line no-alert
      alert('Failed to save service');
    } finally {
      setSvcSaving(false);
    }
  };

  const onSvcDelete = async (svc) => {
    if (!window.confirm(`Delete service "${svc.name}"?`)) return;
    try {
      await apiClient.deleteMyService(svc.id);
      setServices((arr) => arr.filter((x) => x.id !== svc.id));
      if (svcForm.id === svc.id) resetSvcForm();
    } catch (_) {
      // eslint-disable-next-line no-alert
      alert('Failed to delete service');
    }
  };

  const onSave = async () => {
    setSaving(true);
    try {
      // Convert selected slugs to labels (names) for backend serializer
      const specList = (form.specializations || [])
        .map((slug) => SPECIALIZATIONS.find((s) => s.slug === slug)?.label || slug)
        .filter(Boolean);
      const updated = await apiClient.updateMyTailorProfile({
        bio: form.bio,
        years_experience: Number(form.years_experience) || 0,
        specializations: specList,
      });
      // Fetch fresh profile (includes specializations objects)
      try {
        const fresh = await apiClient.getMyTailorProfile();
        setProfile((p) => ({
          ...p,
          bio: fresh?.bio ?? updated.bio,
          years_experience: fresh?.years_experience ?? updated.years_experience,
          specializations: Array.isArray(fresh?.specializations) ? fresh.specializations : (p?.specializations ?? []),
        }));
      } catch (_e) {
        // Fallback: at least update text fields
        setProfile((p) => ({ ...p, bio: updated.bio, years_experience: updated.years_experience }));
      }
      setEditMode(false);
    } catch (e) {
      // eslint-disable-next-line no-alert
      alert('Failed to save tailor profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="max-w-5xl mx-auto px-4 py-10">Loading…</div>;
  if (error) return <div className="max-w-5xl mx-auto px-4 py-10 text-red-600">{error}</div>;
  if (!profile) return null;

  return (
    <section className="py-10">
      <div className="max-w-5xl mx-auto px-4">
        <div className="bg-white rounded-2xl shadow ring-1 ring-accent/20 p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-primary">{profile.username}</h1>
              <p className="text-sm text-neutral/80">{profile.total_reviews} reviews • Avg {profile.avg_rating}</p>
              {!editMode ? (
                <>
                  <p className="mt-3 whitespace-pre-wrap">{profile.bio || 'No bio yet.'}</p>
                  <p className="mt-2 text-sm text-neutral">Experience: {profile.years_experience} years</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {Array.isArray(profile.specializations) && profile.specializations.length > 0 ? (
                      profile.specializations.map((s) => (
                        <span key={s.slug || s.name} className="px-2 py-1 rounded-full bg-accent/20 text-primary text-xs">{s.name}</span>
                      ))
                    ) : (
                      <span className="text-sm text-neutral/70">No specializations added</span>
                    )}
                  </div>
                </>
              ) : (
                <div className="grid gap-3 mt-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Bio</label>
                    <textarea name="bio" value={form.bio} onChange={onChange} rows={4} className="w-full border rounded-lg px-3 py-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Years of experience</label>
                    <input type="number" min={0} name="years_experience" value={form.years_experience} onChange={onChange} className="w-full border rounded-lg px-3 py-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Specializations</label>
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Chips */}
                      {form.specializations.map((slug) => {
                        const label = SPECIALIZATIONS.find((s) => s.slug === slug)?.label || slug;
                        return (
                          <span key={slug} className="inline-flex items-center gap-1 px-2 py-1 rounded-full border border-accent text-primary bg-accent/10">
                            {label}
                            <button type="button" className="ml-1 text-primary/70 hover:text-primary" onClick={() => setForm((f) => ({ ...f, specializations: f.specializations.filter((x) => x !== slug) }))}>×</button>
                          </span>
                        );
                      })}
                      {/* Add-select aligned to the right */}
                      <select
                        value=""
                        onChange={(e) => {
                          const slug = e.target.value;
                          if (!slug) return;
                          setForm((f) => ({ ...f, specializations: f.specializations.includes(slug) ? f.specializations : [...f.specializations, slug] }));
                        }}
                        className="ml-auto px-3 py-2 border rounded-lg text-neutral"
                      >
                        <option value="">Add specialization…</option>
                        {SPECIALIZATIONS.filter((s) => !form.specializations.includes(s.slug)).map((s) => (
                          <option key={s.slug} value={s.slug}>{s.label}</option>
                        ))}
                      </select>
                    </div>
                    <p className="text-xs text-neutral/70 mt-1">Select one at a time; chosen items appear as golden tags.</p>
                  </div>
                </div>
              )}
            </div>
            {isOwner && (
              <div className="shrink-0">
                {!editMode ? (
                  <button onClick={() => setEditMode(true)} className="px-4 py-2 rounded-lg bg-primary text-white">Edit Tailor Profile</button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button disabled={saving} onClick={onSave} className="px-4 py-2 rounded-lg bg-primary text-white disabled:opacity-50">{saving ? 'Saving…' : 'Save'}</button>
                    <button disabled={saving} onClick={() => setEditMode(false)} className="px-4 py-2 rounded-lg bg-neutral/10">Cancel</button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="mt-6">
          <h2 className="text-xl font-semibold mb-3">Services</h2>
          {isOwner && (
            <div className="mb-4 bg-white rounded-xl p-4 shadow ring-1 ring-accent/20">
              <h3 className="font-medium mb-2">{svcForm.id ? 'Edit service' : 'Add a new service'}</h3>
              {svcError && <p className="mb-2 text-sm text-red-600">{svcError}</p>}
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Service type <span className="text-red-600">*</span></label>
                  <select name="specSlug" value={svcForm.specSlug} onChange={onSvcChange} className="w-full border rounded-lg px-3 py-2">
                    <option value="">Select a specialization…</option>
                    {SPECIALIZATIONS.map((s) => (
                      <option key={s.slug} value={s.slug}>{s.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Price (₹) <span className="text-red-600">*</span></label>
                  <input type="number" min="0" step="0.01" name="price" value={svcForm.price} onChange={onSvcChange} className="w-full border rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Duration (minutes) <span className="text-red-600">*</span></label>
                  <input type="number" min="1" step="1" name="duration_minutes" value={svcForm.duration_minutes} onChange={onSvcChange} className="w-full border rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Active</label>
                  <input type="checkbox" name="is_active" checked={!!svcForm.is_active} onChange={onSvcChange} />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <textarea name="description" value={svcForm.description} onChange={onSvcChange} rows={3} className="w-full border rounded-lg px-3 py-2" />
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <button disabled={svcSaving} onClick={onSvcSave} className="px-4 py-2 rounded-lg bg-primary text-white disabled:opacity-50">{svcSaving ? 'Saving…' : (svcForm.id ? 'Save changes' : 'Add service')}</button>
                {svcForm.id && (
                  <button disabled={svcSaving} onClick={resetSvcForm} className="px-4 py-2 rounded-lg bg-neutral/10">Cancel</button>
                )}
              </div>
            </div>
          )}
          {services.length === 0 ? (
            <p className="text-neutral">No services published yet.</p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {services.map((s) => (
                <div key={s.id} className="bg-white rounded-xl p-4 shadow ring-1 ring-accent/20">
                  <div className="font-medium">{s.name}</div>
                  <div className="text-sm text-neutral/80">₹{s.price} • {s.duration_minutes} min</div>
                  {s.description && <p className="text-sm mt-2">{s.description}</p>}
                  {isOwner && (
                    <div className="mt-3 flex items-center gap-2">
                      <button className="px-3 py-1 rounded bg-white ring-1 ring-accent/30 hover:bg-accent/10" onClick={() => onSvcEdit(s)}>Edit</button>
                      <button className="px-3 py-1 rounded bg-red-600 text-white hover:bg-red-700" onClick={() => onSvcDelete(s)}>Delete</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
