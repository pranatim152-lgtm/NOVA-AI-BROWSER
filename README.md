# NOVA AI Browser

**Developer preview · v0.1.0**

NOVA is a real desktop browser foundation built with Electron's Chromium engine and `WebContentsView`, with a React + TypeScript browser chrome and an optional AI/search layer. It is not a browser-themed website: external pages are rendered by Chromium in separate, sandboxed `WebContentsView` instances.

> This workspace contains the source project. It has not been dependency-installed or packaged in this execution environment because the npm registry was unreachable. Follow the steps below on a machine with internet access to install and run it.

## Dual-platform development status

This repository now contains two application targets:

- **Windows/macOS/Linux desktop:** the existing Electron + Chromium `WebContentsView` app described below.
- **Android:** a separate native Android application under `android/`, using Android WebView with URL/search navigation, multiple in-memory tabs, back/forward/reload, Safe Browsing, mixed-content blocking and restricted URL schemes.

The Android app is an early browser foundation, not feature parity with the desktop build. Its **Ask NOVA AI** control currently opens ChatGPT in the active tab; it is not yet connected to the desktop OpenAI provider module. Android bookmarks, history database, downloads UI, private tabs, Google OAuth, cloud sync, full AI sidebar and signing are not implemented yet. Do not treat the debug APK as a production release. The Android app currently enables JavaScript for modern sites; WebView remains isolated from app-native interfaces (no `addJavascriptInterface` bridge is exposed).

GitHub Actions workflows are included at `.github/workflows/` to build a debug APK and a Windows installer after this repository is pushed to GitHub. They upload build artifacts; they do not publish signed releases. The APK is debug-signed by the Android build system. A production Android release requires a privately stored signing key and GitHub Actions secrets. Windows code signing likewise requires a certificate.

## What is implemented

- Electron desktop shell with Chromium-powered `WebContentsView` tabs.
- Multi-tab browsing, tab activation/closing/duplication/pinning, back/forward, reload/stop, home/new tab, address bar and URL-vs-search detection.
- Per-tab private sessions using non-persistent Electron session partitions. Private-tab navigations and downloads are not written to persistent browser records; AI chat typed during private sessions remains memory-only and is discarded when the last private tab closes.
- React browser interface with tab strip, address bar, bookmark bar, home page, dark/light themes, AI sidebar and settings.
- Local SQLite database for bookmarks, browsing history, preferences, downloads and encrypted provider-secret records.
- Bookmark add/remove, browsing history, download progress/state tracking, clear browsing data and site-permission prompts.
- Configurable web search fallback (Google, Bing, DuckDuckGo or Brave).
- Brave Search API adapter for web, image, video, news and place search, plus query suggestions and LLM Context grounding.
- OpenAI Responses API adapter for chat, AI overviews and explicit user-triggered page summaries / selected-text explanations.
- Google desktop OAuth sign-in using the system browser, a loopback redirect and PKCE. Only `openid email profile` is requested; refresh token is encrypted with Electron’s asynchronous `safeStorage` API when supplied; Linux `basic_text` storage is rejected.
- Restrictive renderer CSP, custom `nova://app` renderer protocol, isolated preload bridge, sender validation, no Node integration in remote pages, and permission requests that default to deny unless approved.
- Unit tests for address parsing and URL allow-listing.
- Electron Builder configuration for Windows NSIS `.exe`, macOS `.dmg`/`.zip`, and Linux AppImage/`.deb`.

## Not implemented yet (do not assume otherwise)

This is a working browser foundation, not the finished feature-complete product described in the aspirational brief. In particular:

- Cloud synchronization is not connected. A Google profile can sign in, but bookmarks, history and sessions do not sync across devices. A cloud API, account-to-device model, conflict handling and privacy policy are still required.
- Shopping results need a separate licensed product-search provider; the UI returns an explicit provider-required message rather than fake prices or ratings.
- Place search is integrated through Brave's Place Search API, but the current result surface is a list, not an interactive map. A map SDK/provider and its license/key are still required for an embedded map.
- Chromium extension installation/management is not implemented. Electron's `WebContentsView` does not automatically provide the full Chrome browser extension runtime or Chrome Web Store compatibility.
- Full incognito windows, tab groups/drag sorting, recently closed tab restoration, reader mode, translation UI, password manager, browser import/export, print/save-to-PDF, find-in-page UI, per-site zoom controls, camera/microphone device picker, and advanced accessibility controls remain future work.
- Download tracking is implemented; pause/resume and a download-location picker are not yet implemented.
- The app does not ship an installer binary from this workspace. Build installers on each target operating system; macOS signing/notarization and Windows code signing require certificates owned by the publisher.
- Google sign-in requires the user's own Google Cloud Desktop OAuth client ID. It does not grant access to Gmail, Drive or Calendar, and those permissions are not requested.

## Android build

Requirements: Android Studio (or Android SDK command-line tools), JDK 17, and Gradle 8.9. Open the `android/` directory as a Gradle project in Android Studio, allow it to sync, then choose **Build → Build Bundle(s) / APK(s) → Build APK(s)**. The debug APK is produced at `android/app/build/outputs/apk/debug/app-debug.apk`.

The included GitHub Actions workflow `Build NOVA Android APK` can build the debug APK in the cloud after the project is pushed to GitHub. Download it from the workflow run's **Artifacts** section. To create a production APK, configure a release signing key securely; never commit a keystore or passwords.

## Cloud builds from an Android phone

1. Create or sign in to GitHub at https://github.com/ using the phone browser.
2. Create a **private** repository named `nova-ai-browser`.
3. Upload the contents of this project folder (not the outer ZIP) to the repository. GitHub's web upload is suitable for small source files; for larger uploads use GitHub's mobile-supported browser or a trusted Git client.
4. Open **Actions**, enable workflows if GitHub asks, and run **Build NOVA Android APK** and **Build NOVA Windows EXE**. A push to the relevant source paths also triggers the corresponding workflow.
5. Open each completed workflow run and download its artifact.

Do not upload `.env`, API keys, OAuth secrets, signing keystores or passwords to GitHub. Use GitHub Actions Secrets for signing credentials when release signing is added.

## Prerequisites

- Node.js **22.12+** and npm.
- Windows 10/11, macOS, or a supported Linux desktop distribution.
- Build prerequisites for native Node modules on the target OS (Python + C/C++ toolchain on Windows/Linux where required). `better-sqlite3` is rebuilt for Electron during installation.
- Internet access to install npm packages and, when used, call provider APIs.

Electron 45.5.0 is pinned in `package.json` (the stable Electron release available on 2026-11-26). It embeds Chromium; the system Chromium installed on the machine is not used by the app.

## Install and run

1. Extract the `NOVA-AI-BROWSER-source.zip` archive.
2. Open a terminal in the extracted `nova-ai-browser` folder.
3. Copy `.env.example` to `.env` (optional; the provider keys can also be entered in Settings).
4. Install packages and launch the desktop app:

```bash
npm install
npm run dev
```

On Windows PowerShell, copy the environment template with:

```powershell
Copy-Item .env.example .env
```

`npm run dev` starts Vite on `127.0.0.1:5173`, compiles the Electron main/preload process and opens the desktop app. The application reads `.env` during development; never put a real `.env` file in source control.

Production build:

```bash
npm run typecheck
npm test
npm run build
npm start
```

Create a distributable for the current OS:

```bash
npm run dist
```

Artifacts are written to `release/`. Build Windows `.exe` installers on Windows, macOS packages on macOS, and Linux packages on Linux for the most reliable native-module and signing behavior.

## Provider setup

### OpenAI

1. Create an API key in the [OpenAI developer platform](https://platform.openai.com/api-keys).
2. Open **Settings → AI assistant** in NOVA and enter the key. It is encrypted with Electron’s asynchronous OS-backed `safeStorage` API and is never returned to the React renderer. On Linux, NOVA refuses the `basic_text` fallback when no Secret Service keyring is running.
3. Optionally set `OPENAI_MODEL` in `.env`. The default model is `gpt-4.1-mini`.

The main process calls the official `POST https://api.openai.com/v1/responses` endpoint. Usage is billed by OpenAI. AI page access happens only when the user presses a page-summary/selection action or explicitly asks a page-aware question.

Environment alternative:

```dotenv
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-4.1-mini
```

### Brave Search

1. Create an account and API key at the [Brave Search API dashboard](https://api-dashboard.search.brave.com/).
2. Add the key in **Settings → AI assistant**. It is encrypted with Electron’s asynchronous OS-backed `safeStorage` API. On Linux, NOVA refuses the `basic_text` fallback when no Secret Service keyring is running.
3. Brave's Search plan and API quotas/pricing apply. If no key is configured, NOVA uses the selected default search website (Google/Bing/DuckDuckGo/Brave) rather than inventing local results.

The adapter uses the official Brave endpoints for web search, images, videos, news, autocomplete, LLM Context and Place Search. See the [Brave API docs](https://api-dashboard.search.brave.com/documentation). Shopping results are intentionally not fabricated and require an additional provider.

Environment alternative:

```dotenv
BRAVE_SEARCH_API_KEY=your_key_here
SEARCH_COUNTRY=IN
SEARCH_LANG=en
```

### Google sign-in

1. Open [Google Cloud Console](https://console.cloud.google.com/).
2. Configure the OAuth consent screen for your app.
3. Create an OAuth client with application type **Desktop app**.
4. Set `GOOGLE_CLIENT_ID` in the local environment (the client ID is a public-client identifier, not a user password).
5. Restart NOVA and choose **Settings → Google account & sync → Continue with Google**.

NOVA opens the system browser and uses PKCE with a loopback redirect at `127.0.0.1`. Only basic OpenID Connect profile scopes are requested. Google passwords are never collected or stored. A refresh token, if provided by Google, is encrypted using Electron’s asynchronous OS-backed credential store. On Linux, sign-in is blocked if Electron reports the insecure `basic_text` backend. Google's desktop-app authorization guidance: [OAuth 2.0 for Desktop Apps](https://developers.google.com/identity/protocols/oauth2/native-app).

```dotenv
GOOGLE_CLIENT_ID=your-desktop-oauth-client-id.apps.googleusercontent.com
```

A Google sign-in is not a cloud-sync service. No Gmail, Drive, Calendar or browser-data scopes are requested.

## Project structure

```text
nova-ai-browser/
├── src/
│   ├── main/
│   │   ├── index.ts          # BrowserWindow, WebContentsView tabs, IPC, permissions, downloads
│   │   ├── db.ts             # SQLite data layer
│   │   ├── search.ts         # Brave Search provider adapter
│   │   ├── ai.ts             # OpenAI Responses API + retrieval context
│   │   ├── google-auth.ts    # Google Desktop OAuth + PKCE
│   │   └── secure-store.ts   # Async OS-backed credential encryption
│   ├── preload/index.ts     # Explicitly allow-listed contextBridge API
│   ├── renderer/
│   │   ├── App.tsx          # Browser chrome, home, results, AI panel, settings
│   │   ├── main.tsx
│   │   ├── index.html
│   │   └── styles.css
│   └── shared/
│       ├── types.ts         # Shared typed contracts
│       └── url.ts           # Address parsing and external URL allow-list
├── tests/url.test.ts
├── docs/
├── .env.example
├── package.json
└── README.md
```

## Security notes

- Remote websites render only inside dedicated Chromium `WebContentsView` objects.
- Remote content has `nodeIntegration: false`, `contextIsolation: true`, `sandbox: true` and `webSecurity: true`.
- The preload bridge exposes explicit typed methods; it does not expose raw `ipcRenderer`.
- Main-process IPC validates the sender window and its origin.
- Main-process navigation and external-link handlers permit HTTP/HTTPS only; `javascript:`, `file:`, `data:` and custom protocols are not navigated from the address bar.
- Permission requests are denied unless the user approves them. Decisions are scoped to an origin and permission for that session.
- API keys and Google refresh tokens are encrypted with Electron’s asynchronous `safeStorage` API. Credential writes fail closed when encryption is unavailable; Linux’s `basic_text` fallback is explicitly rejected.
- Page text is not collected automatically. Page-aware AI context is captured only through explicit user action.
- SQLite is stored in Electron's per-user application data directory. Private sessions use in-memory partitions and skip browsing-history writes.

Review Electron's [security checklist](https://www.electronjs.org/docs/latest/tutorial/security) before distributing a public build. Also arrange dependency audits, code signing, release updates, crash reporting policy and privacy/legal reviews before production release.

## Tests

```bash
npm test
npm run typecheck
```

The current automated suite validates URL parsing, safe external schemes and search URL construction. It does not yet include end-to-end UI tests or Electron renderer integration tests.
