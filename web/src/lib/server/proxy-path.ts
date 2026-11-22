// Pure path rules for the authenticated pass-through to the API. No server-only import so it can be
// unit tested.

const ALLOWED_ROOTS = new Set([
  'auth',
  'users',
  'projects',
  'tasks',
  'me',
  'calendar',
  'calendar.ics',
  'dashboard',
]);

// control characters never belong in an id or a route name
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/;
const MAX_SEGMENT_LENGTH = 200;
const MAX_SEGMENTS = 6;

/**
 * Maps decoded catch-all segments to an upstream path (`/projects/<id>/tasks`), or null when the
 * request must not be forwarded. Each segment is re-encoded; `.`, `..`, empty segments and
 * segments carrying a slash or backslash are rejected, and only the allow-listed roots pass
 * (`auth` only as `auth/me`).
 */
export function buildUpstreamPath(segments: readonly string[]): string | null {
  if (segments.length === 0 || segments.length > MAX_SEGMENTS) return null;

  for (const segment of segments) {
    if (segment === '' || segment === '.' || segment === '..') return null;
    if (segment.length > MAX_SEGMENT_LENGTH) return null;
    if (segment.includes('/') || segment.includes('\\')) return null;
    if (CONTROL_CHARS.test(segment)) return null;
  }

  const root = segments[0] as string;
  if (!ALLOWED_ROOTS.has(root)) return null;
  if (root === 'auth' && !(segments.length === 2 && segments[1] === 'me')) return null;

  return `/${segments.map(encodeURIComponent).join('/')}`;
}
