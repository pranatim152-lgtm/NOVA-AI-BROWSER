export type AddressTarget = { kind: 'url'; url: string } | { kind: 'search'; query: string };

const looksLikeHost = (value: string) =>
  /^(localhost|(?:\d{1,3}\.){3}\d{1,3}|[a-z0-9-]+(?:\.[a-z0-9-]+)+)(?::\d+)?(?:[/?#].*)?$/i.test(value);

export function resolveAddressInput(input: string): AddressTarget {
  const value = input.trim();
  if (!value) return { kind: 'search', query: '' };

  // Explicit schemes are parsed strictly. Dangerous and unsupported schemes are never navigated.
  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) {
    try {
      const parsed = new URL(value);
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        return { kind: 'url', url: parsed.toString() };
      }
    } catch { /* continue as a search query */ }
    return { kind: 'search', query: value };
  }

  if (!/\s/.test(value) && looksLikeHost(value)) {
    try {
      return { kind: 'url', url: new URL(`https://${value}`).toString() };
    } catch { /* fall through */ }
  }
  return { kind: 'search', query: value };
}

export function makeSearchUrl(query: string, provider = 'google'): string {
  const q = encodeURIComponent(query.trim());
  const bases: Record<string, string> = {
    google: `https://www.google.com/search?q=${q}`,
    bing: `https://www.bing.com/search?q=${q}`,
    duckduckgo: `https://duckduckgo.com/?q=${q}`,
    brave: `https://search.brave.com/search?q=${q}`,
  };
  return bases[provider] ?? bases.google;
}

export function safeExternalUrl(value: string): string | null {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null;
  } catch {
    return null;
  }
}
