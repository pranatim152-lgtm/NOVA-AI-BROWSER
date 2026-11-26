# Architecture

## Processes

- **Main process** owns the `BrowserWindow`, all tab `WebContentsView` objects, session partitions, SQLite, downloads, permissions, OS credential storage, provider requests and Google OAuth.
- **Renderer process** owns only the browser chrome and app UI. It receives a narrow `window.nova` API through `contextBridge`.
- **Remote page renderers** are independent Chromium renderers with sandboxing and no Node integration. They never receive the privileged NOVA preload bridge.

## Navigation model

The address resolver distinguishes HTTP(S) addresses from search terms. A direct address loads into the active tab's `WebContentsView`. A search term creates a NOVA search-page state when Brave Search is configured. Without a Brave API key, it navigates to the selected default search engine website.

The browser shell is rendered in the BrowserWindow's renderer. Chromium views are placed below the toolbar and to the left of the optional AI sidebar. The renderer reports the layout rectangle to the main process; main owns all view bounds.

## Search and AI

`search.ts` implements Brave's web, image, video, news, suggestions, LLM Context and Place Search APIs. `ai.ts` calls OpenAI's official Responses endpoint from the main process. When Brave LLM Context is available, retrieved snippets are provided as source material and source URLs are returned alongside the AI answer. AI instructions tell the model not to invent citations.

Keys entered in Settings are encrypted with Electron’s asynchronous `safeStorage` API before writing to SQLite. The Linux `basic_text` backend is rejected because it does not provide OS-backed encryption. Environment variables are supported for development/deployment. Search and AI calls are lazy: no provider request occurs until the user searches or asks NOVA.

## Storage

`better-sqlite3` stores bookmarks, history, settings, download metadata and encrypted secret records under Electron's application data directory. Private tabs use non-persistent `Session` partitions and their page visits are excluded from the persistent history table.

## Authentication and synchronization boundary

Google OAuth uses the Desktop client flow, a random PKCE verifier/challenge, a loopback HTTP redirect and a state nonce. The app asks only for `openid email profile`. No Google password is handled by NOVA.

A cloud-sync system is deliberately not simulated. Production sync requires a service with authenticated device registration, encryption at rest/in transit, versioning/conflict resolution, deletion semantics, recovery and account lifecycle support.
