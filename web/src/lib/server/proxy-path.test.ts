import { describe, expect, it } from 'vitest';
import { buildUpstreamPath } from './proxy-path';

describe('buildUpstreamPath', () => {
  it('forwards allow-listed roots with encoded segments', () => {
    expect(buildUpstreamPath(['projects'])).toBe('/projects');
    expect(buildUpstreamPath(['projects', 'abc-123', 'tasks'])).toBe('/projects/abc-123/tasks');
    expect(buildUpstreamPath(['tasks', 'abc', 'move'])).toBe('/tasks/abc/move');
    expect(buildUpstreamPath(['users'])).toBe('/users');
    expect(buildUpstreamPath(['me', 'tasks'])).toBe('/me/tasks');
    expect(buildUpstreamPath(['calendar'])).toBe('/calendar');
    expect(buildUpstreamPath(['calendar.ics'])).toBe('/calendar.ics');
    expect(buildUpstreamPath(['dashboard', 'summary'])).toBe('/dashboard/summary');
  });

  it('allows only auth/me under auth', () => {
    expect(buildUpstreamPath(['auth', 'me'])).toBe('/auth/me');
    expect(buildUpstreamPath(['auth', 'login'])).toBeNull();
    expect(buildUpstreamPath(['auth', 'register'])).toBeNull();
    expect(buildUpstreamPath(['auth'])).toBeNull();
    expect(buildUpstreamPath(['auth', 'me', 'x'])).toBeNull();
  });

  it('rejects anything outside the allow-list', () => {
    expect(buildUpstreamPath(['unknown', 'x'])).toBeNull();
    expect(buildUpstreamPath(['health'])).toBeNull();
    expect(buildUpstreamPath(['docs'])).toBeNull();
    expect(buildUpstreamPath(['Projects'])).toBeNull();
    expect(buildUpstreamPath([])).toBeNull();
  });

  it('rejects dot segments and empty segments', () => {
    expect(buildUpstreamPath(['projects', '..', 'auth', 'login'])).toBeNull();
    expect(buildUpstreamPath(['projects', '.'])).toBeNull();
    expect(buildUpstreamPath(['projects', ''])).toBeNull();
    expect(buildUpstreamPath([''])).toBeNull();
    expect(buildUpstreamPath(['..'])).toBeNull();
  });

  it('rejects decoded slashes, backslashes and control characters inside a segment', () => {
    expect(buildUpstreamPath(['../../etc'])).toBeNull();
    expect(buildUpstreamPath(['projects', 'a/b'])).toBeNull();
    expect(buildUpstreamPath(['projects', 'a\\b'])).toBeNull();
    expect(buildUpstreamPath(['projects', 'a\u0000b'])).toBeNull();
    expect(buildUpstreamPath(['projects', 'a\nb'])).toBeNull();
  });

  it('re-encodes segments so they cannot change the path structure', () => {
    expect(buildUpstreamPath(['projects', 'a?b=1'])).toBe('/projects/a%3Fb%3D1');
    expect(buildUpstreamPath(['projects', 'a#b'])).toBe('/projects/a%23b');
    expect(buildUpstreamPath(['projects', 'a%2Fb'])).toBe('/projects/a%252Fb');
    expect(buildUpstreamPath(['projects', 'a b'])).toBe('/projects/a%20b');
  });

  it('rejects absurdly long or deep paths', () => {
    expect(buildUpstreamPath(['projects', 'x'.repeat(201)])).toBeNull();
    expect(buildUpstreamPath(['projects', 'a', 'b', 'c', 'd', 'e', 'f'])).toBeNull();
  });
});
