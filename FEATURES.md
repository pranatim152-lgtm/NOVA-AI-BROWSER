# Feature implementation matrix

| Area | Current state |
|---|---|
| Chromium website rendering | Implemented with `WebContentsView` |
| Multiple tabs | Implemented: create, activate, close, duplicate, pin |
| Tab groups and drag organization | Not yet implemented |
| Address bar and default search | Implemented; Brave-backed NOVA results when configured, otherwise chosen provider website |
| Back / forward / reload / stop | Implemented |
| Bookmarks and bookmarks bar | Implemented, local SQLite |
| Browsing history | Implemented, local SQLite; private pages excluded |
| Downloads | Progress/state tracking and local download path; no pause/resume picker yet |
| Private browsing | Private tabs with non-persistent sessions; private visits/download records are not persisted, private AI chat is memory-only; no separate private window yet |
| AI assistant | Implemented via OpenAI Responses API when key is configured; active-page sharing requires an explicit per-message toggle |
| Page summaries / selected text | Explicit user-triggered only |
| Cited AI search | Brave LLM Context retrieval + OpenAI answer when both keys configured |
| Images / videos / news search | Brave Search API adapter |
| Places | Brave Place Search list; no interactive map renderer yet |
| Shopping | Provider adapter not yet connected; UI displays setup requirement |
| Google account | Basic Desktop OAuth with PKCE and local profile; no sync |
| Cloud sync | Not implemented; requires a backend |
| Chrome extension ecosystem | Not implemented; no claim of Chrome Web Store compatibility |
| Permissions | Main-process prompt and default deny |
| Security isolation | Context isolation, sandbox, no remote Node integration, IPC sender checks, CSP |
| PDF/print, translation, reader mode, find, zoom | Not yet implemented |
| Automated tests | URL/address unit tests only |

This matrix is intentionally conservative. A visible control should not be described as supported unless it is wired to a real implementation.
