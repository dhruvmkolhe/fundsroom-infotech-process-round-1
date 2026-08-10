// API Client service for connecting React frontend to Express backend REST APIs

const API_BASE_URL = 'http://localhost:5000/api';

export function getAuthToken(): string | null {
  return localStorage.getItem('erp_token');
}

export function setAuthToken(token: string) {
  localStorage.setItem('erp_token', token);
}

export function removeAuthToken() {
  localStorage.removeItem('erp_token');
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const contentType = response.headers.get('content-type');
  let data: any = {};
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  }

  if (!response.ok) {
    const errorMsg = data?.error || `HTTP ${response.status}: ${response.statusText}`;
    throw new Error(errorMsg);
  }

  return data as T;
}

export const api = {
  // Auth
  login: (credentials: { email: string; password: string }) =>
    request<{ token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),

  getMe: () => request<{ user: any }>('/auth/me'),

  // Customers
  getCustomers: (params?: { query?: string; status?: string; type?: string; page?: number; limit?: number }) => {
    const queryStr = new URLSearchParams(params as any).toString();
    return request<{ data: any[]; pagination: any }>(`/customers?${queryStr}`);
  },

  getCustomerById: (id: string) => request<any>(`/customers/${id}`),

  createCustomer: (customerData: any) =>
    request<any>('/customers', {
      method: 'POST',
      body: JSON.stringify(customerData),
    }),

  updateCustomer: (id: string, customerData: any) =>
    request<any>(`/customers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(customerData),
    }),

  addCustomerNote: (id: string, text: string) =>
    request<{ notes: any[] }>(`/customers/${id}/notes`, {
      method: 'POST',
      body: JSON.stringify({ text }),
    }),

  deleteCustomer: (id: string) =>
    request<{ message: string }>(`/customers/${id}`, {
      method: 'DELETE',
    }),

  // Products & Inventory
  getProducts: (params?: { query?: string; category?: string; alertOnly?: boolean; page?: number; limit?: number }) => {
    const queryStr = new URLSearchParams(params as any).toString();
    return request<{ data: any[]; pagination: any }>(`/products?${queryStr}`);
  },

  getProductById: (id: string) => request<any>(`/products/${id}`),

  createProduct: (productData: any) =>
    request<any>('/products', {
      method: 'POST',
      body: JSON.stringify(productData),
    }),

  updateProduct: (id: string, productData: any) =>
    request<any>(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(productData),
    }),

  adjustStock: (id: string, data: { qtyChanged: number; type: 'IN' | 'OUT'; reason: string }) =>
    request<any>(`/products/${id}/adjust-stock`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Stock Movements Log
  getStockMovements: (params?: { query?: string; type?: string; page?: number; limit?: number }) => {
    const queryStr = new URLSearchParams(params as any).toString();
    return request<{ data: any[]; pagination: any }>(`/stock-movements?${queryStr}`);
  },

  // Sales Challans
  getChallans: (params?: { query?: string; status?: string; page?: number; limit?: number }) => {
    const queryStr = new URLSearchParams(params as any).toString();
    return request<{ data: any[]; pagination: any }>(`/challans?${queryStr}`);
  },

  getChallanById: (id: string) => request<any>(`/challans/${id}`),

  createChallan: (challanData: { customerId: string; items: { productId: string; qty: number }[]; status?: 'Draft' | 'Confirmed' }) =>
    request<any>('/challans', {
      method: 'POST',
      body: JSON.stringify(challanData),
    }),

  confirmChallan: (id: string) =>
    request<any>(`/challans/${id}/confirm`, {
      method: 'POST',
    }),

  cancelChallan: (id: string) =>
    request<any>(`/challans/${id}/cancel`, {
      method: 'POST',
    }),

  // Dashboard Stats
  getDashboardStats: () => request<any>('/dashboard/stats'),
};
