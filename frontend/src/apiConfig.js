// Centralized API configuration for Road-Ranger
// Supports dynamic VITE_API_URL environment variable, relative /api routing on Vercel, and local dev fallback.

const envApiUrl = import.meta.env.VITE_API_URL;

// If VITE_API_URL is set, use it (trimmed of trailing slashes).
// In local development (npm run dev), fallback to http://127.0.0.1:8000.
// In production on Vercel, fallback to empty string '' so ${API_BASE}/api/* resolves relatively to /api/*.
export const API_BASE = (
  envApiUrl !== undefined
    ? envApiUrl
    : (import.meta.env.DEV ? 'http://127.0.0.1:8000' : '')
).replace(/\/+$/, '');

/**
 * Resolves an endpoint path against API_BASE.
 */
export const getApiUrl = (endpoint) => {
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  if (!API_BASE) {
    return path;
  }
  if (API_BASE.endsWith('/api') && path.startsWith('/api/')) {
    return `${API_BASE}${path.substring(4)}`;
  }
  return `${API_BASE}${path}`;
};

/**
 * Helper to ensure valid, accessible image URLs with reliable fallback.
 * Works seamlessly both locally and in production on Vercel.
 */
export const resolveImageUrl = (url) => {
  if (!url || url === 'None' || url === 'null' || url === '' || url.includes('example.com')) {
    return 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=1200&auto=format&fit=crop&q=80';
  }
  if (url.startsWith('/uploads/')) {
    return API_BASE ? `${API_BASE}${url}` : url;
  }
  if (url.startsWith('uploads/')) {
    return API_BASE ? `${API_BASE}/${url}` : `/${url}`;
  }
  if (url.includes('/uploads/')) {
    const filename = url.split('/uploads/')[1];
    return API_BASE ? `${API_BASE}/uploads/${filename}` : `/uploads/${filename}`;
  }
  return url;
};
