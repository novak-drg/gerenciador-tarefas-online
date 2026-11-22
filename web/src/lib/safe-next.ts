export const DEFAULT_NEXT = '/inicio';

// control characters and backslashes are never part of a legitimate in-app path
const FORBIDDEN_CHARS = /[\u0000-\u001f\u007f\\]/;

/** Returns `next` only when it is a same-site absolute path; otherwise `/inicio`. */
export function safeNext(next: string | string[] | null | undefined): string {
  if (typeof next !== 'string' || next.length === 0) return DEFAULT_NEXT;
  if (!next.startsWith('/')) return DEFAULT_NEXT;
  if (next.startsWith('//')) return DEFAULT_NEXT;
  if (FORBIDDEN_CHARS.test(next)) return DEFAULT_NEXT;
  if (next.includes('://')) return DEFAULT_NEXT;
  // a scheme before any path separator, e.g. "/javascript:alert(1)" is still a path, but be strict
  const firstSegment = next.slice(1).split(/[/?#]/, 1)[0] ?? '';
  if (/^[a-z][a-z0-9+.-]*:/i.test(firstSegment)) return DEFAULT_NEXT;
  return next;
}
