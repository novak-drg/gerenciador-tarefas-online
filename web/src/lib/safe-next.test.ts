import { describe, expect, it } from 'vitest';
import { safeNext } from './safe-next';

describe('safeNext', () => {
  it('keeps same-site absolute paths, with query and hash', () => {
    expect(safeNext('/projetos')).toBe('/projetos');
    expect(safeNext('/projetos/abc?aba=lista')).toBe('/projetos/abc?aba=lista');
    expect(safeNext('/calendario#hoje')).toBe('/calendario#hoje');
    expect(safeNext('/')).toBe('/');
  });

  it('falls back to /inicio when missing or empty', () => {
    expect(safeNext(undefined)).toBe('/inicio');
    expect(safeNext(null)).toBe('/inicio');
    expect(safeNext('')).toBe('/inicio');
  });

  it('rejects arrays', () => {
    expect(safeNext(['/projetos', '/x'])).toBe('/inicio');
  });

  it('rejects protocol-relative URLs', () => {
    expect(safeNext('//evil.example')).toBe('/inicio');
    expect(safeNext('///evil.example')).toBe('/inicio');
  });

  it('rejects backslash tricks', () => {
    expect(safeNext('/\\evil.example')).toBe('/inicio');
    expect(safeNext('/projetos\\..\\x')).toBe('/inicio');
  });

  it('rejects absolute URLs and schemes', () => {
    expect(safeNext('https://evil.example')).toBe('/inicio');
    expect(safeNext('http://evil.example/inicio')).toBe('/inicio');
    expect(safeNext('javascript:alert(1)')).toBe('/inicio');
    expect(safeNext('/javascript:alert(1)')).toBe('/inicio');
    expect(safeNext('/ok?redirect=https://evil.example')).toBe('/inicio');
  });

  it('rejects relative paths', () => {
    expect(safeNext('projetos')).toBe('/inicio');
    expect(safeNext('../etc')).toBe('/inicio');
  });

  it('rejects control characters (header splitting, tab/newline in //)', () => {
    expect(safeNext('/\t/evil.example')).toBe('/inicio');
    expect(safeNext('/ok\r\nSet-Cookie: a=b')).toBe('/inicio');
    expect(safeNext('/ok\u0000')).toBe('/inicio');
  });
});
