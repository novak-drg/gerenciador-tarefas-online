import 'server-only';

/**
 * CSRF guard for state-changing requests. A browser always sends `Origin` or `Sec-Fetch-Site`
 * on cross-site writes; requests without either come from non-browser clients, which cannot
 * ride on a victim's cookie.
 */
export function isSameOrigin(headers: Headers): boolean {
  const origin = headers.get('origin');
  if (origin !== null) {
    const host = headers.get('host');
    let originHost: string;
    try {
      originHost = new URL(origin).host;
    } catch {
      return false; // includes the literal "null" origin
    }
    if (!host || originHost !== host) return false;
  }

  const fetchSite = headers.get('sec-fetch-site');
  if (fetchSite !== null && fetchSite !== 'same-origin') return false;

  return true;
}

/** True when the Content-Type is `application/json` (parameters such as charset are allowed). */
export function isJsonContentType(headers: Headers): boolean {
  const value = headers.get('content-type');
  if (!value) return false;
  const mediaType = value.split(';', 1)[0]?.trim().toLowerCase();
  return mediaType === 'application/json';
}
