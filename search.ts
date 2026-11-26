import type { SearchCategory, SearchResponse, SearchResult } from '../shared/types';
import { loadSecret } from './secure-store';

const API = 'https://api.search.brave.com/res/v1';

function domainOf(url: string): string | undefined {
  try { return new URL(url).hostname.replace(/^www\./, ''); }
  catch { return undefined; }
}

function mapResults(category: SearchCategory, payload: any): SearchResult[] {
  let items: any[] = [];
  if (category === 'all') items = payload?.web?.results ?? [];
  else items = payload?.results ?? [];

  return items.slice(0, 30).map((item: any) => {
    const url = String(item.url ?? item.action?.url ?? item.source ?? item.properties?.url ?? '');
    const thumbnail = item.thumbnail?.src ?? item.thumbnail?.url ?? item.properties?.url ?? item.thumbnail_url;
    return {
      title: String(item.title ?? item.name ?? 'Untitled result'),
      url,
      description: String(item.description ?? item.postal_address?.displayAddress ?? item.snippet ?? item.extra_snippets?.[0] ?? ''),
      domain: item.meta_url?.hostname ?? domainOf(url),
      favicon: url ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domainOf(url) ?? '')}&sz=32` : undefined,
      thumbnail: typeof thumbnail === 'string' ? thumbnail : undefined,
      imageUrl: category === 'images' ? String(item.properties?.url ?? item.original?.url ?? '') || undefined : undefined,
      published: item.age ?? item.page_age ?? item.published ?? undefined,
      duration: item.video?.duration ?? undefined,
      source: item.meta_url?.hostname ?? item.source ?? undefined,
    };
  }).filter((item: SearchResult) => /^https?:\/\//i.test(item.url));
}

function endpoint(category: SearchCategory): string | null {
  switch (category) {
    case 'all': return '/web/search';
    case 'images': return '/images/search';
    case 'videos': return '/videos/search';
    case 'news': return '/news/search';
    // Brave has a dedicated Place API; Shopping requires a separately licensed provider.
    case 'maps': return '/local/place_search';
    case 'shopping': return null;
  }
}

export async function search(query: string, category: SearchCategory): Promise<SearchResponse> {
  const trimmed = query.trim().slice(0, 600);
  let key = '';
  try { key = await loadSecret('BRAVE_SEARCH_API_KEY') ?? ''; }
  catch (error) {
    return { query: trimmed, category, results: [], configured: false, error: error instanceof Error ? error.message : 'Secure credential storage is unavailable.' };
  }
  if (!trimmed) return { query, category, results: [], configured: Boolean(key), error: 'Enter something to search.' };
  if (!key) {
    return {
      query: trimmed, category, results: [], configured: false,
      error: 'Brave Search API is not configured. Add a Brave Search API key in Settings to show live results.',
    };
  }
  const path = endpoint(category);
  if (!path) {
    return {
      query: trimmed, category, results: [], configured: true,
      error: 'Shopping results need a separately licensed product-search provider. Configure one in a future provider module; no sample products are shown.',
    };
  }

  const params = new URLSearchParams({ q: trimmed, count: '20', safesearch: 'moderate' });
  if (process.env.SEARCH_COUNTRY) params.set('country', process.env.SEARCH_COUNTRY);
  if (process.env.SEARCH_LANG) params.set('search_lang', process.env.SEARCH_LANG);

  try {
    const response = await fetch(`${API}${path}?${params}`, {
      headers: { 'X-Subscription-Token': key, Accept: 'application/json' },
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new Error(`Brave Search returned ${response.status}${detail ? `: ${detail.slice(0, 240)}` : ''}`);
    }
    const payload = await response.json();
    return { query: trimmed, category, results: mapResults(category, payload), configured: true };
  } catch (error) {
    return {
      query: trimmed, category, results: [], configured: true,
      error: error instanceof Error ? error.message : 'Search request failed.',
    };
  }
}

export async function suggest(query: string): Promise<string[]> {
  try {
    const key = await loadSecret('BRAVE_SEARCH_API_KEY') ?? '';
    if (!key || query.trim().length < 2) return [];
    const params = new URLSearchParams({ q: query.trim().slice(0, 200) });
    const response = await fetch(`${API}/suggest/search?${params}`, {
      headers: { 'X-Subscription-Token': key, Accept: 'application/json' },
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return [];
    const payload = await response.json();
    return (payload?.results ?? []).map((item: any) => String(item.query ?? '')).filter(Boolean).slice(0, 6);
  } catch { return []; }
}

export async function getGrounding(query: string): Promise<{ text: string; sources: Array<{ title: string; url: string }> }> {
  try {
    const key = await loadSecret('BRAVE_SEARCH_API_KEY') ?? '';
    if (!key) return { text: '', sources: [] };
    const params = new URLSearchParams({ q: query.trim().slice(0, 500) });
    const response = await fetch(`${API}/llm/context?${params}`, {
      headers: { 'X-Subscription-Token': key, Accept: 'application/json' },
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) return { text: '', sources: [] };
    const payload = await response.json();
    const grounding = payload?.grounding?.generic ?? [];
    const sources = grounding.map((item: any) => ({ title: String(item.title ?? item.url), url: String(item.url ?? '') }))
      .filter((item: any) => /^https?:\/\//.test(item.url)).slice(0, 8);
    const text = grounding.map((item: any, index: number) =>
      `[${index + 1}] ${item.title ?? item.url}\nURL: ${item.url}\n${(item.snippets ?? []).join('\n')}`
    ).join('\n\n').slice(0, 22000);
    return { text, sources };
  } catch { return { text: '', sources: [] }; }
}
