// Resolve ?returnTo= to a safe same-origin path, else "/". Provider-agnostic —
// kept from the original app because the redirect-validation logic is
// security-sensitive and worth having in one place.
export function safeReturnTo() {
  const raw = new URLSearchParams(window.location.search).get('returnTo');
  if (!raw) return '/';
  try {
    const url = new URL(raw, window.location.origin);
    if (url.origin !== window.location.origin) return '/';
    const path = url.pathname + url.search;
    if (!path.startsWith('/') || path.startsWith('//') || path.includes('\\')) return '/';
    return path;
  } catch {
    return '/';
  }
}

export default safeReturnTo;
