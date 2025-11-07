import React from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import apiClient from '../services/apiClient';
import { SPECIALIZATIONS } from '../constants/specializations';
import ImageUpload from '../components/ImageUpload.jsx';
import MultiImageUpload from '../components/MultiImageUpload.jsx';

export default function TailorProfilePage() {
  const { username } = useParams();
  const { user } = useAuth();
  const isOwner = Boolean(user && user.username === username && user.role === 'tailor');

  const [profile, setProfile] = React.useState(null);
  const [services, setServices] = React.useState([]);
  const [reviews, setReviews] = React.useState([]);

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');

  const [editMode, setEditMode] = React.useState(false);
  const [form, setForm] = React.useState({ bio: '', years_experience: 0, specializations: [] });
  const [saving, setSaving] = React.useState(false);
  const [profileImage, setProfileImage] = React.useState(null);
  const [imageUploading, setImageUploading] = React.useState(false);
  const [serviceImagesModalData, setServiceImagesModalData] = React.useState(null);
  const [galleryModalData, setGalleryModalData] = React.useState(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const p = await apiClient.request(`/api/marketplace/${encodeURIComponent(username)}/`);
        const s = await apiClient.request(`/api/marketplace/${encodeURIComponent(username)}/services/`);
        const r = await apiClient.getTailorReviews(username);
        if (!cancelled) {
          setProfile(p);
          setServices(Array.isArray(s) ? s : (s?.results ?? []));
          setReviews(Array.isArray(r) ? r : (r?.results ?? []));
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

  const handleImageSelect = async (file) => {
    setImageUploading(true);
    try {
      const updatedProfile = await apiClient.uploadTailorProfileImage(file);
      setProfile(updatedProfile);
      setProfileImage(null); // Clear temp image
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Failed to upload image. Please try again.');
    } finally {
      setImageUploading(false);
    }
  };

  const handleImageRemove = async () => {
    setImageUploading(true);
    try {
      const updatedProfile = await apiClient.removeTailorProfileImage();
      setProfile(updatedProfile);
      setProfileImage(null);
    } catch (error) {
      console.error('Error removing image:', error);
      alert('Failed to remove image. Please try again.');
    } finally {
      setImageUploading(false);
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
            <div className="flex gap-4">
              {profile.profile_image && (
                <div className="flex-shrink-0">
                  <img 
                    src={profile.profile_image} 
                    alt={`${profile.username} profile`}
                    className="w-20 h-20 rounded-lg object-cover shadow"
                  />
                </div>
              )}
              <div>
                <h1 className="text-2xl font-bold text-primary">{profile.username}</h1>
                <p className="text-sm text-neutral/80">{profile.total_reviews} reviews • Avg {profile.avg_rating}</p>
              </div>
            </div>
            <div>
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
                    <label className="block text-sm font-medium mb-1">Profile Image</label>
                    <ImageUpload
                      currentImage={profileImage || profile.profile_image}
                      onImageSelect={handleImageSelect}
                      onImageRemove={handleImageRemove}
                      disabled={imageUploading}
                      placeholder="Upload profile photo (shop front, workspace, etc.)"
                      className="max-w-md"
                    />
                    {imageUploading && (
                      <p className="text-sm text-blue-600">Uploading image...</p>
                    )}
                  </div>
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

        {/* Services Section */}
        <div className="bg-white rounded-xl p-6 shadow ring-1 ring-accent/20 mt-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Services</h2>
            {isOwner && (
              <button 
                onClick={() => setServiceImagesModalData({ 
                  id: null, 
                  name: '', 
                  description: '', 
                  price: '', 
                  duration_days: '', 
                  is_active: true,
                  images: []
                })}
                className="px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors"
              >
                Add New Service
              </button>
            )}
          </div>
          
          {services.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-neutral mb-4">No services published yet.</p>
              {isOwner && (
                <p className="text-sm text-neutral/70">Get started by adding your first service above.</p>
              )}
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {services.map((s) => (
                <div key={s.id} className="bg-gray-50 rounded-xl p-4 border border-accent/20 flex flex-col h-full">
                  <div className="flex-grow">
                    <div className="font-medium text-primary">{s.name}</div>
                    <div className="text-sm text-neutral/80">₹{s.price} • {s.duration_days} days</div>
                    {s.description && <p className="text-sm mt-2 text-neutral">{s.description}</p>}
                    
                    {/* Service Images Preview */}
                    {s.images && s.images.length > 0 && (
                      <div className="mt-3">
                        <div className="flex gap-1 flex-wrap">
                          {s.images.slice(0, 3).map((img, i) => (
                            <img 
                              key={i}
                              src={img.image} 
                              alt={`${s.name} ${i + 1}`}
                              className="w-12 h-12 object-cover rounded border cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={() => setGalleryModalData({ images: s.images, startIndex: i, serviceName: s.name })}
                            />
                          ))}
                          {s.images.length > 3 && (
                            <div 
                              className="w-12 h-12 bg-accent/20 rounded border flex items-center justify-center text-xs text-primary cursor-pointer hover:bg-accent/30 transition-colors"
                              onClick={() => setGalleryModalData({ images: s.images, startIndex: 0, serviceName: s.name })}
                            >
                              +{s.images.length - 3}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {isOwner && (
                    <div className="mt-4 flex justify-end">
                      <button 
                        className="px-4 py-2 text-sm rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors" 
                        onClick={() => setServiceImagesModalData(s)}
                      >
                        Edit Service
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Reviews Section */}
        <div className="bg-white rounded-xl p-6 shadow ring-1 ring-accent/20 mt-8">
          <h3 className="text-lg font-semibold mb-4">Customer Reviews</h3>
          {reviews.length === 0 ? (
            <p className="text-neutral">No reviews yet.</p>
          ) : (
            <div className="space-y-4">
              {reviews.map((review) => (
                <div key={review.id} className="border-b border-gray-100 pb-4 last:border-b-0">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">
                        {review.customer_username}
                      </span>
                      <div className="flex text-yellow-400">
                        {[...Array(5)].map((_, i) => (
                          <span key={i} className={i < review.rating ? 'text-yellow-400' : 'text-gray-300'}>
                            ★
                          </span>
                        ))}
                      </div>
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(review.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  
                  {/* Service Information */}
                  {review.service_name && (
                    <div className="mb-2 flex items-center gap-2">
                      <div className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-50 text-blue-700 border border-blue-200">
                        <span className="mr-1">🧵</span>
                        <span className="font-medium">{review.service_name}</span>
                        {review.service_price && (
                          <span className="ml-1 text-blue-600">• ₹{review.service_price}</span>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {review.comment && (
                    <p className="text-sm text-gray-700 mb-3">{review.comment}</p>
                  )}
                  
                  {/* Review Images */}
                  {review.images && review.images.length > 0 && (
                    <div className="mt-3">
                      <div className="flex gap-2 flex-wrap">
                        {review.images.slice(0, 4).map((img, i) => (
                          <img 
                            key={i}
                            src={img.image} 
                            alt={`Review image ${i + 1}`}
                            className="w-16 h-16 object-cover rounded-lg border cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => setGalleryModalData({ 
                              images: review.images, 
                              startIndex: i, 
                              serviceName: `Review by ${review.customer_username}` 
                            })}
                          />
                        ))}
                        {review.images.length > 4 && (
                          <div 
                            className="w-16 h-16 bg-gray-100 rounded-lg border flex items-center justify-center text-xs text-gray-600 cursor-pointer hover:bg-gray-200 transition-colors"
                            onClick={() => setGalleryModalData({ 
                              images: review.images, 
                              startIndex: 0, 
                              serviceName: `Review by ${review.customer_username}` 
                            })}
                          >
                            +{review.images.length - 4}
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Customer photos ({review.images.length} image{review.images.length !== 1 ? 's' : ''})
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Service Images Management Modal */}
      {serviceImagesModalData && (
        <ServiceImagesModal 
          service={serviceImagesModalData}
          onClose={() => setServiceImagesModalData(null)}
          onImagesUpdated={() => {
            // Refresh services to get updated images
            const refreshServices = async () => {
              try {
                // Use the correct endpoint based on whether user is owner
                const endpoint = isOwner 
                  ? `/api/marketplace/me/services/`
                  : `/api/marketplace/${encodeURIComponent(username)}/services/`;
                const s = await apiClient.request(endpoint);
                setServices(Array.isArray(s) ? s : (s?.results ?? []));
              } catch (e) {
                console.error('Error refreshing services:', e);
              }
            };
            refreshServices();
          }}
        />
      )}

      {/* Gallery Modal for viewing service images */}
      {galleryModalData && (
        <ImageGalleryModal 
          images={galleryModalData.images}
          startIndex={galleryModalData.startIndex}
          serviceName={galleryModalData.serviceName}
          onClose={() => setGalleryModalData(null)}
        />
      )}
    </section>
  );
}

// Comprehensive Service Modal Component for Create/Edit
function ServiceImagesModal({ service, onClose, onImagesUpdated }) {
  const isNewService = !service.id;
  
  const [images, setImages] = React.useState([]);
  const [loading, setLoading] = React.useState(!isNewService);
  const [uploading, setUploading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const [error, setError] = React.useState('');
  
  // Form fields
  const [formData, setFormData] = React.useState({
    specSlug: '',
    description: service.description || '',
    price: service.price ? String(service.price) : '',
    duration_days: service.duration_days ? String(service.duration_days) : '',
    is_active: service.is_active !== undefined ? service.is_active : true
  });

  React.useEffect(() => {
    if (isNewService) {
      setLoading(false);
      return;
    }

    // For existing services, try to infer specSlug and load images
    const match = SPECIALIZATIONS.find((s) => (s.label || '').toLowerCase() === (service.name || '').toLowerCase());
    setFormData(prev => ({
      ...prev,
      specSlug: match ? match.slug : ''
    }));

    const loadImages = async () => {
      try {
        const imageData = await apiClient.getServiceImages(service.id);
        setImages(Array.isArray(imageData) ? imageData : (imageData?.results ?? []));
      } catch (error) {
        console.error('Error loading service images:', error);
      } finally {
        setLoading(false);
      }
    };
    loadImages();
  }, [service.id, service.name, isNewService]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    setError('');
  };

  const handleImagesAdd = async (files) => {
    if (isNewService) {
      // For new services, just store files locally until service is created
      const newImages = files.map(file => ({ 
        file, 
        isLocal: true,
        // Add a temporary preview URL for display
        preview: URL.createObjectURL(file)
      }));
      setImages(prev => [...prev, ...newImages]);
      return;
    }

    setUploading(true);
    try {
      const uploadPromises = files.map((file, index) => 
        apiClient.uploadServiceImage(service.id, file, images.length + index)
      );
      
      await Promise.all(uploadPromises);
      
      // Refresh images
      const imageData = await apiClient.getServiceImages(service.id);
      setImages(Array.isArray(imageData) ? imageData : (imageData?.results ?? []));
      onImagesUpdated();
    } catch (error) {
      console.error('Error uploading images:', error);
      alert('Failed to upload some images. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleImageRemove = async (index) => {
    const image = images[index];
    
    if (image.isLocal) {
      // Remove local file
      setImages(images.filter((_, i) => i !== index));
      return;
    }

    try {
      await apiClient.deleteServiceImage(service.id, image.id);
      setImages(images.filter((_, i) => i !== index));
      onImagesUpdated();
    } catch (error) {
      console.error('Error removing image:', error);
      alert(`Failed to remove image: ${error.message || 'Unknown error'}`);
    }
  };

  const validateForm = () => {
    setError('');
    const chosen = SPECIALIZATIONS.find((s) => s.slug === formData.specSlug);
    const priceNum = Number(formData.price);
    const durNum = Number(formData.duration_days);
    
    if (!chosen) {
      setError('Please select a service type.');
      return false;
    }
    if (!Number.isFinite(priceNum) || priceNum < 0) {
      setError('Please enter a valid cost (₹0 or more).');
      return false;
    }
    if (!Number.isFinite(durNum) || durNum < 1) {
      setError('Please enter a valid duration (at least 1 day).');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    
    setSaving(true);
    try {
      const chosen = SPECIALIZATIONS.find((s) => s.slug === formData.specSlug);
      const payload = {
        name: chosen.label,
        description: formData.description,
        price: Number(formData.price),
        duration_days: Number(formData.duration_days),
        is_active: !!formData.is_active,
      };

      let serviceResult;
      if (isNewService) {
        // Create service first
        serviceResult = await apiClient.createMyService(payload);
        
        // Upload images if any
        if (images.length > 0) {
          setUploading(true);
          const localImages = images.filter(img => img.isLocal);
          
          if (localImages.length > 0 && serviceResult?.id) {
            try {
              // Upload images one by one to better handle errors
              for (let i = 0; i < localImages.length; i++) {
                const img = localImages[i];
                if (!img.file || !(img.file instanceof File)) {
                  continue;
                }
                // Use a small delay between uploads to avoid race conditions
                if (i > 0) {
                  await new Promise(resolve => setTimeout(resolve, 100));
                }
                await apiClient.uploadServiceImage(serviceResult.id, img.file, i);
              }
            } catch (uploadError) {
              console.error('Error uploading images:', uploadError);
              // Don't fail the entire operation if images fail
              alert(`Service created successfully, but there was an issue uploading ${localImages.length} image(s). You can add them later by editing the service.`);
            }
          }
        }
        
        alert('Service created successfully!');
      } else {
        // Update existing service
        serviceResult = await apiClient.updateMyService(service.id, payload);
        alert('Service updated successfully!');
      }
      
      // Always refresh services to get the latest data including images
      onImagesUpdated();
      onClose();
    } catch (error) {
      console.error('Error saving service:', error);
      alert(`Failed to save service: ${error.message || 'Unknown error'}`);
    } finally {
      setSaving(false);
      setUploading(false);
    }
  };

  const handleDeleteService = async () => {
    try {
      await apiClient.deleteMyService(service.id);
      onImagesUpdated();
      onClose();
      alert('Service deleted successfully!');
    } catch (error) {
      console.error('Error deleting service:', error);
      alert(`Failed to delete service: ${error.message || 'Unknown error'}`);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[80vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold">
              {isNewService ? 'Create New Service' : `Edit Service: "${service.name}"`}
            </h2>
            <button 
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-xl"
            >
              ×
            </button>
          </div>

          {loading ? (
            <div className="py-8 text-center text-gray-500">Loading...</div>
          ) : (
            <div className="space-y-6">
              {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded">{error}</p>}
              
              {/* Service Details Section */}
              <div>
                <h3 className="text-md font-medium text-gray-700 mb-3">Service Details</h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Service Type <span className="text-red-600">*</span></label>
                    <select 
                      name="specSlug" 
                      value={formData.specSlug} 
                      onChange={handleInputChange} 
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select a specialization…</option>
                      {SPECIALIZATIONS.map((s) => (
                        <option key={s.slug} value={s.slug}>{s.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Price (₹) <span className="text-red-600">*</span></label>
                    <input 
                      type="number" 
                      min="0" 
                      step="0.01" 
                      name="price" 
                      value={formData.price} 
                      onChange={handleInputChange} 
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Duration (days) <span className="text-red-600">*</span></label>
                    <input 
                      type="number" 
                      min="1" 
                      step="1" 
                      name="duration_days" 
                      value={formData.duration_days} 
                      onChange={handleInputChange} 
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                    />
                  </div>
                  <div className="flex items-center">
                    <input 
                      type="checkbox" 
                      id="is_active"
                      name="is_active" 
                      checked={!!formData.is_active} 
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    <label htmlFor="is_active" className="text-sm font-medium">Active Service</label>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium mb-1">Description</label>
                    <textarea 
                      name="description" 
                      value={formData.description} 
                      onChange={handleInputChange} 
                      rows={3} 
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                      placeholder="Describe your service..."
                    />
                  </div>
                </div>
              </div>

              {/* Images Section */}
              <div>
                <h3 className="text-md font-medium text-gray-700 mb-3">Service Images</h3>
                <MultiImageUpload
                  images={images}
                  onImagesAdd={handleImagesAdd}
                  onImageRemove={handleImageRemove}
                  maxImages={10}
                  disabled={uploading}
                />
                
                {uploading && (
                  <div className="text-center text-blue-600 mt-2">
                    Uploading images...
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-between items-center pt-4 border-t">
                <div className="flex gap-2">
                  <button
                    onClick={handleSave}
                    disabled={saving || uploading}
                    className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {saving ? 'Saving...' : (isNewService ? 'Create Service' : 'Save Changes')}
                  </button>
                  <button
                    onClick={onClose}
                    disabled={saving || uploading}
                    className="px-6 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 disabled:opacity-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>

                {/* Delete Service Section (only for existing services) */}
                {!isNewService && (
                  <div>
                    {!showDeleteConfirm ? (
                      <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                      >
                        Delete Service
                      </button>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={handleDeleteService}
                          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                        >
                          Yes, Delete
                        </button>
                        <button
                          onClick={() => setShowDeleteConfirm(false)}
                          className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Image Gallery Modal Component
function ImageGalleryModal({ images, startIndex, serviceName, onClose }) {
  const [currentIndex, setCurrentIndex] = React.useState(startIndex);

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
  };

  const handleKeyPress = React.useCallback((e) => {
    if (e.key === 'ArrowLeft') goToPrevious();
    if (e.key === 'ArrowRight') goToNext();
    if (e.key === 'Escape') onClose();
  }, []);

  React.useEffect(() => {
    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  if (!images || images.length === 0) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
      <div className="relative max-w-4xl max-h-full p-4">
        {/* Close button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-white text-2xl hover:text-gray-300 z-10"
        >
          ×
        </button>

        {/* Navigation buttons */}
        {images.length > 1 && (
          <>
            <button 
              onClick={goToPrevious}
              className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white text-3xl hover:text-gray-300 z-10"
            >
              ‹
            </button>
            <button 
              onClick={goToNext}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white text-3xl hover:text-gray-300 z-10"
            >
              ›
            </button>
          </>
        )}

        {/* Main image */}
        <div className="flex flex-col items-center">
          <img
            src={images[currentIndex]?.image}
            alt={`${serviceName} ${currentIndex + 1}`}
            className="max-w-full max-h-[80vh] object-contain rounded-lg"
          />
          
          {/* Image counter and title */}
          <div className="text-white text-center mt-4">
            <h3 className="text-lg font-medium">{serviceName}</h3>
            <p className="text-sm text-gray-300">
              {currentIndex + 1} of {images.length}
            </p>
          </div>

          {/* Thumbnail strip */}
          {images.length > 1 && (
            <div className="flex gap-2 mt-4 max-w-full overflow-x-auto">
              {images.map((img, idx) => (
                <img
                  key={idx}
                  src={img.image}
                  alt={`Thumbnail ${idx + 1}`}
                  className={`w-16 h-16 object-cover rounded cursor-pointer transition-opacity ${
                    idx === currentIndex ? 'opacity-100 ring-2 ring-white' : 'opacity-60 hover:opacity-80'
                  }`}
                  onClick={() => setCurrentIndex(idx)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
