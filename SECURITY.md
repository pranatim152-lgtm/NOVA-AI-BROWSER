# Security model and remaining production work

NOVA runs arbitrary websites. A desktop app displaying untrusted remote content has a larger threat surface than an ordinary React website, so the browser process is kept separate from each remote Chromium renderer.

Current safeguards include a restricted preload API, context isolation, renderer sandboxing, no Node integration for websites, URL scheme allow-listing, top-level origin checks on IPC, site permission prompts, private session partitions and provider secrets encrypted through Electron’s asynchronous OS credential API; Linux `basic_text` storage is rejected. The packaged `nova://app` renderer receives a restrictive CSP. Vite development mode uses a deliberately looser localhost-only policy for HMR and React Refresh.

Before a public release:

1. Add a dedicated audit of IPC arguments and sender-frame identity, including subframes and navigations during race conditions.
2. Add automated Electron integration tests for tab lifecycle, permission prompts, webview navigation, downloads, app protocol path traversal and private-session teardown.
3. Configure Electron fuses, including disabling `RunAsNode` and restricting Node CLI inspection in packaged builds where compatible with the debugging policy.
4. Add a dependency lockfile and automated dependency/SBOM/security scanning.
5. Implement update delivery, signed Windows/macOS packages, macOS notarization and a security-response process.
6. Review third-party API terms, data retention, user consent, legal requirements and privacy disclosures.
7. Decide how to handle cookies, password autofill, device permissions and site data lifecycle before enabling those browser features broadly.

Do not treat this developer preview as a security-certified browser.
