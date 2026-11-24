const INTERNAL_ORIGIN = 'https://veltrix.invalid';

export function safeInternalPath(value, fallback = '/account') {
  if (typeof value !== 'string') return fallback;

  const candidate = value.trim();
  if (!candidate.startsWith('/')) return fallback;

  try {
    const destination = new URL(candidate, INTERNAL_ORIGIN);
    if (destination.origin !== INTERNAL_ORIGIN) return fallback;
    return `${destination.pathname}${destination.search}${destination.hash}`;
  } catch {
    return fallback;
  }
}
