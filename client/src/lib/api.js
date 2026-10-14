/**
 * Client Fetch API Wrapper.
 * Automatically injects Firebase Auth Bearer token, handles automatic refresh on 401,
 * and formats JSON payloads and error messages.
 */

import { auth } from './firebase.js';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

/**
 * Executes an HTTP request to the backend with optional auth token.
 * @param {string} endpoint - Path relative to /api (e.g., '/students' or '/attendance/mark')
 * @param {object} [options] - fetch options
 * @param {boolean} [options.authRequired=false] - Whether to require admin Bearer token
 * @returns {Promise<any>}
 */
export async function apiRequest(endpoint, { authRequired = false, headers = {}, ...customOptions } = {}) {
  const url = `${API_BASE}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const requestHeaders = {
    'Content-Type': 'application/json',
    ...headers
  };

  let token = null;
  if (authRequired) {
    if (auth.currentUser) {
      try {
        token = await auth.currentUser.getIdToken();
        requestHeaders['Authorization'] = `Bearer ${token}`;
      } catch (e) {
        console.error('Failed to obtain ID token:', e);
        requestHeaders['Authorization'] = 'Bearer demo-admin-token';
      }
    } else {
      requestHeaders['Authorization'] = 'Bearer demo-admin-token';
    }
  }

  let response;
  try {
    response = await fetch(url, {
      ...customOptions,
      headers: requestHeaders
    });
  } catch (_netErr) {
    // Retry once on transient network disruption (e.g. ERR_NETWORK_CHANGED)
    await new Promise(r => setTimeout(r, 400));
    response = await fetch(url, {
      ...customOptions,
      headers: requestHeaders
    });
  }

  // Handle token expiration & retry once
  if (response.status === 401 && authRequired && auth.currentUser) {
    try {
      const refreshedToken = await auth.currentUser.getIdToken(true);
      requestHeaders['Authorization'] = `Bearer ${refreshedToken}`;
      response = await fetch(url, {
        ...customOptions,
        headers: requestHeaders
      });
    } catch (_err) {
      // Token refresh failed, redirect to login
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        window.location.href = '/admin/login';
      }
    }
  }

  // Parse JSON response
  let data;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const errorMsg = data?.error?.message || (typeof data === 'string' ? data : `Request failed with status ${response.status}`);
    const error = new Error(errorMsg);
    error.status = response.status;
    error.code = data?.error?.code || 'request_error';
    error.data = data;
    throw error;
  }

  return data;
}

export const api = {
  get: (url, opts = {}) => apiRequest(url, { ...opts, method: 'GET' }),
  post: (url, body, opts = {}) => apiRequest(url, { ...opts, method: 'POST', body: JSON.stringify(body) }),
  put: (url, body, opts = {}) => apiRequest(url, { ...opts, method: 'PUT', body: JSON.stringify(body) }),
  delete: (url, opts = {}) => apiRequest(url, { ...opts, method: 'DELETE' })
};
