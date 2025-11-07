const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';
const STORAGE_KEYS = {
  access: 'tailorit_access',
  refresh: 'tailorit_refresh',
  user: 'tailorit_user',
  accessExpiresAt: 'tailorit_access_expires_at',
};

class ApiClient {
  constructor() {
    this.accessToken = null;
    this.refreshToken = null;
    this.expiresAt = null; // ISO string
    this._refreshTimer = null;
    this._sessionExpiredHandlers = new Set();
    // Load tokens from storage on startup
    try {
      const a = localStorage.getItem(STORAGE_KEYS.access);
      const r = localStorage.getItem(STORAGE_KEYS.refresh);
      const e = localStorage.getItem(STORAGE_KEYS.accessExpiresAt);
      if (a) this.accessToken = a;
      if (r) this.refreshToken = r;
      if (e) this.expiresAt = e;
    } catch (_) {
      // ignore storage errors
    }
    // Try to schedule auto-refresh if we have expiration info
    this._scheduleAutoRefresh();
  }
  saveTokens(access, refresh) {
    this.accessToken = access || null;
    this.refreshToken = refresh || null;
    try {
      if (access) localStorage.setItem(STORAGE_KEYS.access, access); else localStorage.removeItem(STORAGE_KEYS.access);
      if (refresh) localStorage.setItem(STORAGE_KEYS.refresh, refresh); else localStorage.removeItem(STORAGE_KEYS.refresh);
    } catch (_) { /* ignore */ }
  }
  clearTokens() {
    this.saveTokens(null, null);
  }
  saveExpiresAt(iso) {
    this.expiresAt = iso || null;
    try {
      if (iso) localStorage.setItem(STORAGE_KEYS.accessExpiresAt, iso); else localStorage.removeItem(STORAGE_KEYS.accessExpiresAt);
    } catch (_) { /* ignore */ }
    this._scheduleAutoRefresh();
  }
  saveUser(user) {
    try {
      if (user) localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(user));
      else localStorage.removeItem(STORAGE_KEYS.user);
    } catch (_) { /* ignore */ }
  }
  loadUser() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.user);
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }
  get headers() {
    const h = { 'Content-Type': 'application/json' };
    if (this.accessToken) h['Authorization'] = `Bearer ${this.accessToken}`;
    return h;
  }
  async register(data) {
    const res = await fetch(`${API_BASE}/api/users/session/`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ action: 'register', ...data })
    });
    if (!res.ok) {
      // Parse the error response from the backend
      let errorData;
      try {
        errorData = await res.json();
      } catch (e) {
        errorData = { detail: 'Network error or invalid response' };
      }
      
      // Create an error that includes the response data
      const error = new Error('Register failed');
      error.response = {
        status: res.status,
        data: errorData
      };
      throw error;
    }
    const json = await res.json();
    if (json?.access || json?.refresh) {
      this.saveTokens(json.access, json.refresh);
    }
    if (json?.user) this.saveUser(json.user);
    if (json?.access_expires_at) this.saveExpiresAt(json.access_expires_at);
    return json;
  }
  async login(data) {
    const res = await fetch(`${API_BASE}/api/users/session/`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ action: 'login', ...data })
    });
    if (!res.ok) {
      // Parse the error response from the backend
      let errorData;
      try {
        errorData = await res.json();
      } catch (e) {
        errorData = { detail: 'Network error or invalid response' };
      }
      
      // Create an error that includes the response data
      const error = new Error('Login failed');
      error.response = {
        status: res.status,
        data: errorData
      };
      throw error;
    }
    const json = await res.json();
    this.saveTokens(json.access, json.refresh);
    if (json?.user) this.saveUser(json.user);
    if (json?.access_expires_at) this.saveExpiresAt(json.access_expires_at);
    return json;
  }
  async refresh() {
    if (!this.refreshToken) throw new Error('No refresh token');
    const res = await fetch(`${API_BASE}/api/users/session/`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ action: 'refresh', refresh: this.refreshToken })
    });
    if (!res.ok) throw new Error('Refresh failed');
    const json = await res.json();
    this.saveTokens(json.access, this.refreshToken);
    if (json?.access_expires_at) this.saveExpiresAt(json.access_expires_at);
    return json;
  }
  async request(path, init = {}) {
    // For FormData uploads, don't include Content-Type header
    const headers = init.isFormData 
      ? { 'Authorization': this.headers.Authorization, ...(init.headers || {}) }
      : { ...this.headers, ...(init.headers || {}) };
    
    const res = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers,
    });
    if (res.status === 401 && this.refreshToken) {
      try {
        await this.refresh();
        return this.request(path, init);
      } catch (e) {
        this._handleSessionExpired();
      }
    }
    if (!res.ok) throw new Error(`Request failed: ${res.status}`);
    
    // Handle empty responses (like DELETE requests that return 204 No Content)
    const contentType = res.headers.get('content-type');
    if (res.status === 204 || !contentType || !contentType.includes('application/json')) {
      return null;
    }
    
    // Check if response body is empty
    const text = await res.text();
    if (!text) return null;
    
    try {
      return JSON.parse(text);
    } catch (e) {
      console.warn('Failed to parse response as JSON:', text);
      return null;
    }
  }

  async getTailors(filters = {}) {
    const params = new URLSearchParams();
    if (filters.location) params.set('location', filters.location);
    if (filters.specialization) params.set('specialization', filters.specialization);
    if (filters.lat != null) params.set('lat', String(filters.lat));
    if (filters.lng != null) params.set('lng', String(filters.lng));
    const qs = params.toString();
    return this.request(`/api/marketplace/tailors/${qs ? `?${qs}` : ''}`);
  }

  async getMyBookings() {
    // Returns bookings for current user (customer: made, tailor: received)
    return this.request('/api/marketplace/bookings/');
  }

  async updateBookingStatus(bookingId, status) {
    return this.request(`/api/marketplace/bookings/${bookingId}/status/`, {
      method: 'POST',
      body: JSON.stringify({ status: status.toLowerCase() })
    });
  }

  async initiatePayment(bookingId) {
    const response = await this.request(`/api/marketplace/bookings/${bookingId}/payment/`, {
      method: 'POST'
    });
    return response;
  }

  async markPaymentComplete(bookingId, sessionId) {
    return this.request(`/api/marketplace/bookings/${bookingId}/mark-paid/`, {
      method: 'POST',
      body: JSON.stringify({ session_id: sessionId })
    });
  }

  async createBooking(data) {
    return this.request('/api/marketplace/bookings/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getMyTailorProfile() {
    return this.request('/api/marketplace/me/');
  }

  async updateMyTailorProfile(data) {
    return this.request('/api/marketplace/me/', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // --- Services (tailor-owned) ---
  async createMyService(data) {
    return this.request('/api/marketplace/me/services/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  }
  async updateMyService(id, data) {
    return this.request(`/api/marketplace/me/services/${id}/`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  }
  async deleteMyService(id) {
    // Use fetch directly to allow 204 handling
    const res = await fetch(`${API_BASE}/api/marketplace/me/services/${id}/`, {
      method: 'DELETE',
      headers: this.headers,
    });
    if (res.status === 401 && this.refreshToken) {
      await this.refresh();
      return this.deleteMyService(id);
    }
    if (!res.ok && res.status !== 204) throw new Error('Delete failed');
    return true;
  }

  async updateMyProfile(data) {
    const json = await this.request('/api/users/me/', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    // Persist updated user locally
    if (json) this.saveUser(json);
    return json;
  }

  // --- Reviews ---
  async getMyReviews() {
    return this.request('/api/marketplace/reviews/');
  }

  async createReview(bookingId, rating, comment) {
    return this.request('/api/marketplace/reviews/', {
      method: 'POST',
      body: JSON.stringify({
        booking: bookingId,
        rating: rating,
        comment: comment || ''
      })
    });
  }

  async getTailorReviews(username) {
    return this.request(`/api/marketplace/${username}/reviews/`);
  }

  // --- Image Upload Methods ---
  async uploadTailorProfileImage(imageFile) {
    const formData = new FormData();
    formData.append('profile_image', imageFile);
    
    return this.request('/api/marketplace/me/', {
      method: 'PATCH',
      body: formData,
      // For FormData, don't set Content-Type - let browser handle it
      isFormData: true
    });
  }

  async removeTailorProfileImage() {
    return this.request('/api/marketplace/me/', {
      method: 'PATCH',
      body: JSON.stringify({ profile_image: null })
    });
  }

  // --- Service Image Methods ---
  async getServiceImages(serviceId) {
    return this.request(`/api/marketplace/me/services/${serviceId}/images/`);
  }

  async uploadServiceImage(serviceId, imageFile, order = 0) {
    const formData = new FormData();
    formData.append('image', imageFile);
    formData.append('order', order.toString());
    
    return this.request(`/api/marketplace/me/services/${serviceId}/images/`, {
      method: 'POST',
      body: formData,
      isFormData: true
    });
  }

  async updateServiceImage(serviceId, imageId, data) {
    return this.request(`/api/marketplace/me/services/${serviceId}/images/${imageId}/`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  }

  async deleteServiceImage(serviceId, imageId) {
    return this.request(`/api/marketplace/me/services/${serviceId}/images/${imageId}/`, {
      method: 'DELETE'
    });
  }

  // --- Review Image Methods ---
  async uploadReviewImage(reviewId, imageFile) {
    const formData = new FormData();
    formData.append('image', imageFile);
    formData.append('review', reviewId);
    
    return this.request('/api/marketplace/reviews/images/', {
      method: 'POST',
      body: formData,
      isFormData: true
    });
  }

  async deleteReviewImage(reviewId, imageId) {
    return this.request(`/api/marketplace/reviews/${reviewId}/images/${imageId}/`, {
      method: 'DELETE'
    });
  }

  // --- Session lifecycle helpers ---
  onSessionExpired(handler) {
    if (typeof handler === 'function') this._sessionExpiredHandlers.add(handler);
    return () => this._sessionExpiredHandlers.delete(handler);
  }
  _handleSessionExpired() {
    // Clear everything and notify listeners
    this.clearTokens();
    this.saveUser(null);
    this.saveExpiresAt(null);
    if (this._refreshTimer) {
      clearTimeout(this._refreshTimer);
      this._refreshTimer = null;
    }
    this._sessionExpiredHandlers.forEach((fn) => {
      try { fn(); } catch (_) {}
    });
  }
  _scheduleAutoRefresh() {
    if (this._refreshTimer) {
      clearTimeout(this._refreshTimer);
      this._refreshTimer = null;
    }
    if (!this.expiresAt || !this.accessToken || !this.refreshToken) return;
    const now = Date.now();
    const exp = Date.parse(this.expiresAt);
    if (!Number.isFinite(exp)) return;
    // Refresh 60s before expiry (min 5s delay)
    const BUFFER_MS = 60 * 1000;
    let delay = Math.max(5000, exp - now - BUFFER_MS);
    this._refreshTimer = setTimeout(async () => {
      try {
        await this.refresh();
      } catch (_) {
        this._handleSessionExpired();
      }
    }, delay);
  }

}

const apiClient = new ApiClient();
export default apiClient;
export { apiClient };
