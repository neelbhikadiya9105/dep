const API_BASE = '/api';

const API = {
  getToken() {
    return localStorage.getItem('token');
  },
  getUser() {
    const u = localStorage.getItem('user');
    return u ? JSON.parse(u) : null;
  },
  setAuth(token, user) {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
  },
  clearAuth() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },
  async request(method, path, body = null) {
    const headers = { 'Content-Type': 'application/json' };
    const token = this.getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const options = { method, headers };
    if (body) options.body = JSON.stringify(body);
    const res = await fetch(API_BASE + path, options);
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Request failed');
    return data;
  },
  get(path) { return this.request('GET', path); },
  post(path, body) { return this.request('POST', path, body); },
  put(path, body) { return this.request('PUT', path, body); },
  delete(path) { return this.request('DELETE', path); },
  requireAuth() {
    if (!this.getToken()) {
      window.location.href = '/index.html';
      return false;
    }
    return true;
  },
  checkRole(...roles) {
    const user = this.getUser();
    return user && roles.includes(user.role);
  }
};
