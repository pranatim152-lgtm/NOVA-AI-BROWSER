import { describe, expect, it } from 'vitest';
import { makeSearchUrl, resolveAddressInput, safeExternalUrl } from '../src/shared/url';

describe('address resolution', () => {
  it('opens explicit https URLs', () => {
    expect(resolveAddressInput('https://example.com/a')).toEqual({ kind: 'url', url: 'https://example.com/a' });
  });
  it('treats bare domains as URLs', () => {
    expect(resolveAddressInput('example.com')).toEqual({ kind: 'url', url: 'https://example.com/' });
  });
  it('treats ordinary language as a search', () => {
    expect(resolveAddressInput('best weather app')).toEqual({ kind: 'search', query: 'best weather app' });
  });
  it('does not navigate javascript URLs', () => {
    expect(resolveAddressInput('javascript:alert(1)')).toEqual({ kind: 'search', query: 'javascript:alert(1)' });
  });
  it('encodes search terms', () => {
    expect(makeSearchUrl('hello world')).toContain('hello%20world');
  });
  it('only accepts http and https external destinations', () => {
    expect(safeExternalUrl('https://example.com')).toBe('https://example.com/');
    expect(safeExternalUrl('file:///etc/passwd')).toBeNull();
  });
});
