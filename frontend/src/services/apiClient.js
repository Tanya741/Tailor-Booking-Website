const API_BASE = (import.meta.env && import.meta.env.VITE_API_BASE) || 'http://localhost:8000';

class ApiClient {
  constructor() {
    this.accessToken = null;
    this.refreshToken = null;
  }
  get headers() {
    const h = { 'Content-Type': 'application/json' };
    if (this.accessToken) h['Authorization'] = `Bearer ${this.accessToken}`;
    return h;
  }
  async register(data) {
    const res = await fetch(`${API_BASE}/api/auth/session/`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ action: 'register', ...data })
    });
    if (!res.ok) throw new Error('Register failed');
    return res.json();
  }
  async login(data) {
    const res = await fetch(`${API_BASE}/api/auth/session/`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ action: 'login', ...data })
    });
    if (!res.ok) throw new Error('Login failed');
    const json = await res.json();
    this.accessToken = json.access;
    this.refreshToken = json.refresh;
    return json;
  }
  async refresh() {
    if (!this.refreshToken) throw new Error('No refresh token');
    const res = await fetch(`${API_BASE}/api/auth/session/`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ action: 'refresh', refresh: this.refreshToken })
    });
    if (!res.ok) throw new Error('Refresh failed');
    const json = await res.json();
    this.accessToken = json.access;
    return json;
  }
  async request(path, init = {}) {
    const res = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: { ...this.headers, ...(init.headers || {}) },
    });
    if (res.status === 401 && this.refreshToken) {
      await this.refresh();
      return this.request(path, init);
    }
    if (!res.ok) throw new Error(`Request failed: ${res.status}`);
    return res.json();
  }

  async getTailors(filters = {}) {
    const params = new URLSearchParams();
    if (filters.location) params.set('location', filters.location);
    if (filters.specialization) params.set('specialization', filters.specialization);
  if (filters.lat != null) params.set('lat', String(filters.lat));
  if (filters.lng != null) params.set('lng', String(filters.lng));
    const qs = params.toString();
    return this.request(`/api/tailors/${qs ? `?${qs}` : ''}`);
  }

}

const apiClient = new ApiClient();
export default apiClient;
export { apiClient };
