import { describe, expect, it } from 'vitest';
import { isJsonContentType, isSameOrigin } from './same-origin';

const headers = (init: Record<string, string>) => new Headers(init);

describe('isSameOrigin', () => {
  it('allows a matching Origin host', () => {
    expect(isSameOrigin(headers({ host: 'localhost:3000', origin: 'http://localhost:3000' }))).toBe(
      true,
    );
  });

  it('rejects a foreign Origin', () => {
    expect(isSameOrigin(headers({ host: 'localhost:3000', origin: 'https://evil.example' }))).toBe(
      false,
    );
  });

  it('rejects the same hostname on another port', () => {
    expect(isSameOrigin(headers({ host: 'localhost:3000', origin: 'http://localhost:4000' }))).toBe(
      false,
    );
  });

  it('rejects a lookalike host', () => {
    expect(
      isSameOrigin(headers({ host: 'app.example', origin: 'https://app.example.evil.test' })),
    ).toBe(false);
  });

  it('rejects the opaque "null" Origin and malformed ones', () => {
    expect(isSameOrigin(headers({ host: 'localhost:3000', origin: 'null' }))).toBe(false);
    expect(isSameOrigin(headers({ host: 'localhost:3000', origin: 'not a url' }))).toBe(false);
  });

  it('rejects an Origin when the Host header is missing', () => {
    expect(isSameOrigin(headers({ origin: 'http://localhost:3000' }))).toBe(false);
  });

  it('accepts Sec-Fetch-Site same-origin and rejects the other values', () => {
    expect(isSameOrigin(headers({ 'sec-fetch-site': 'same-origin' }))).toBe(true);
    expect(isSameOrigin(headers({ 'sec-fetch-site': 'same-site' }))).toBe(false);
    expect(isSameOrigin(headers({ 'sec-fetch-site': 'cross-site' }))).toBe(false);
    expect(isSameOrigin(headers({ 'sec-fetch-site': 'none' }))).toBe(false);
  });

  it('requires both signals to agree when both are present', () => {
    expect(
      isSameOrigin(
        headers({
          host: 'localhost:3000',
          origin: 'http://localhost:3000',
          'sec-fetch-site': 'cross-site',
        }),
      ),
    ).toBe(false);
  });

  it('allows requests with neither header (non-browser clients)', () => {
    expect(isSameOrigin(headers({ host: 'localhost:3000' }))).toBe(true);
  });
});

describe('isJsonContentType', () => {
  it('accepts application/json with or without parameters', () => {
    expect(isJsonContentType(headers({ 'content-type': 'application/json' }))).toBe(true);
    expect(isJsonContentType(headers({ 'content-type': 'application/json; charset=utf-8' }))).toBe(
      true,
    );
    expect(isJsonContentType(headers({ 'content-type': 'Application/JSON' }))).toBe(true);
  });

  it('rejects other types and a missing header', () => {
    expect(isJsonContentType(headers({ 'content-type': 'text/plain' }))).toBe(false);
    expect(
      isJsonContentType(headers({ 'content-type': 'application/x-www-form-urlencoded' })),
    ).toBe(false);
    expect(isJsonContentType(headers({}))).toBe(false);
  });
});
