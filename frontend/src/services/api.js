/**
 * Thin fetch wrapper around the API.
 *
 * Responsibilities kept in one place so no component ever calls fetch():
 *   - prefixes the base URL
 *   - attaches the JWT from localStorage
 *   - unwraps { data } / surfaces { error } as a thrown Error
 *   - kicks the user back to /login on a 401
 */
const BASE_URL = import.meta.env.VITE_API_URL || '/api';
const TOKEN_KEY = 'ims.token';

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

/** Error carrying the HTTP status and any per-field validation details. */
export class ApiClientError extends Error {
  constructor(message, status, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

async function request(path, { method = 'GET', body, params, raw = false } = {}) {
  const url = new URL(`${BASE_URL}${path}`, window.location.origin);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, value);
      }
    });
  }

  const token = tokenStore.get();
  const response = await fetch(url, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  // CSV downloads and other non-JSON responses.
  if (raw) {
    if (!response.ok) throw new ApiClientError('Download failed', response.status);
    return response.blob();
  }

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 401 && !path.startsWith('/auth/login')) {
      tokenStore.clear();
      if (window.location.pathname !== '/login') window.location.href = '/login';
    }
    throw new ApiClientError(
      payload?.error?.message || `Request failed (${response.status})`,
      response.status,
      payload?.error?.details,
    );
  }

  return payload;
}

const get = (path, params) => request(path, { params });
const post = (path, body) => request(path, { method: 'POST', body });
const patch = (path, body) => request(path, { method: 'PATCH', body });
const del = (path) => request(path, { method: 'DELETE' });

/* --------------------------------------------------------------------------
 * Endpoint map. Grouped by feature owner so it is obvious who maintains what.
 * ------------------------------------------------------------------------ */
export const api = {
  // Evan — auth & catalogue
  auth: {
    login: (credentials) => post('/auth/login', credentials),
    register: (data) => post('/auth/register', data),
    me: () => get('/auth/me'),
  },
  users: {
    list: () => get('/users'),
    create: (data) => post('/users', data),
    update: (id, data) => patch(`/users/${id}`, data),
    remove: (id) => del(`/users/${id}`),
  },
  categories: {
    list: () => get('/categories'),
    create: (data) => post('/categories', data),
    update: (id, data) => patch(`/categories/${id}`, data),
    remove: (id) => del(`/categories/${id}`),
  },
  products: {
    list: (params) => get('/products', params),
    get: (id) => get(`/products/${id}`),
    lowStock: () => get('/products/low-stock'),
    create: (data) => post('/products', data),
    update: (id, data) => patch(`/products/${id}`, data),
    remove: (id) => del(`/products/${id}`),
  },

  // Najmul — suppliers & purchasing
  suppliers: {
    list: (params) => get('/suppliers', params),
    get: (id) => get(`/suppliers/${id}`),
    create: (data) => post('/suppliers', data),
    update: (id, data) => patch(`/suppliers/${id}`, data),
    remove: (id) => del(`/suppliers/${id}`),
  },
  purchaseOrders: {
    list: (params) => get('/purchase-orders', params),
    get: (id) => get(`/purchase-orders/${id}`),
    create: (data) => post('/purchase-orders', data),
    order: (id) => post(`/purchase-orders/${id}/order`),
    receive: (id) => post(`/purchase-orders/${id}/receive`),
    cancel: (id) => post(`/purchase-orders/${id}/cancel`),
    remove: (id) => del(`/purchase-orders/${id}`),
  },

  // Rukaiya — stock, sales & reports
  stock: {
    movements: (params) => get('/stock/movements', params),
    in: (data) => post('/stock/in', data),
    out: (data) => post('/stock/out', data),
    adjust: (data) => post('/stock/adjust', data),
  },
  salesOrders: {
    list: (params) => get('/sales-orders', params),
    get: (id) => get(`/sales-orders/${id}`),
    create: (data) => post('/sales-orders', data),
    confirm: (id) => post(`/sales-orders/${id}/confirm`),
    fulfil: (id) => post(`/sales-orders/${id}/fulfil`),
    cancel: (id) => post(`/sales-orders/${id}/cancel`),
  },
  reports: {
    dashboard: () => get('/reports/dashboard'),
    valuation: (params) => get('/reports/valuation', params),
    stockFlow: (params) => get('/reports/stock-flow', params),
    topProducts: (params) => get('/reports/top-products', params),
    downloadCsv: (report) => request(`/reports/${report}?format=csv`, { raw: true }),
  },
};
