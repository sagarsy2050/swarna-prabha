/**
 * Single HTTP layer for the whole SPA. Replaces the Base44 SDK transport.
 *
 * - Base URL from VITE_API_URL (dev proxy makes '' work too).
 * - Access token kept in memory (+ localStorage mirror so a reload survives
 *   until the refresh cookie re-issues one). Refresh token is an httpOnly
 *   cookie the browser sends automatically to /api/auth/*.
 * - On a 401 (once per request) it silently calls /api/auth/refresh and retries.
 */
const BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
const TOKEN_KEY = 'jw_access_token';

let accessToken = safeGet();
const listeners = new Set();

function safeGet() {
  try {
    return localStorage.getItem(TOKEN_KEY) || null;
  } catch {
    return null;
  }
}

export function setAccessToken(token) {
  accessToken = token || null;
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* private mode — memory only */
  }
  listeners.forEach((l) => l(accessToken));
}

export function getAccessToken() {
  return accessToken;
}

export function onAuthChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export class ApiError extends Error {
  constructor(message, { status, code, details } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

let refreshing = null;

async function doRefresh() {
  refreshing ??= fetch(`${BASE}/api/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
  })
    .then(async (res) => {
      if (!res.ok) throw new ApiError('Session expired', { status: res.status });
      const body = await res.json();
      setAccessToken(body.data.accessToken);
      return body.data.accessToken;
    })
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

async function request(method, path, { body, query, headers, isForm, _retry } = {}) {
  const url = new URL(`${BASE}${path}`, window.location.origin);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
    }
  }

  const opts = {
    method,
    credentials: 'include',
    headers: { ...(headers || {}) },
  };
  if (accessToken) opts.headers.Authorization = `Bearer ${accessToken}`;
  if (body !== undefined) {
    if (isForm) {
      opts.body = body; // FormData — let the browser set the boundary
    } else {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    }
  }

  const res = await fetch(url.toString().replace(window.location.origin, BASE || ''), opts);

  if (res.status === 401 && !_retry && !path.startsWith('/api/auth/')) {
    try {
      await doRefresh();
      return request(method, path, { body, query, headers, isForm, _retry: true });
    } catch {
      setAccessToken(null);
    }
  }

  const text = await res.text();
  let payload = {};
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      // Not JSON — usually means the request reached a static host / proxy
      // instead of the API (e.g. a production build with the wrong VITE_API_URL,
      // or the API is down).
      throw new ApiError(
        `The API did not return JSON (HTTP ${res.status}). It may be unreachable or misconfigured (check VITE_API_URL).`,
        { status: res.status, code: 'API_UNREACHABLE' },
      );
    }
  }
  if (!res.ok) {
    const err = payload.error || {};
    throw new ApiError(err.message || res.statusText || 'Request failed', {
      status: res.status,
      code: err.code,
      details: err.details,
    });
  }
  return payload;
}

export const http = {
  get: (path, query) => request('GET', path, { query }),
  post: (path, body) => request('POST', path, { body }),
  patch: (path, body) => request('PATCH', path, { body }),
  put: (path, body) => request('PUT', path, { body }),
  del: (path) => request('DELETE', path),
  postForm: (path, formData) => request('POST', path, { body: formData, isForm: true }),
  refresh: doRefresh,
};

export default http;
