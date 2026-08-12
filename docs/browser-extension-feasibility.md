# WordGraph Browser Extension — Feasibility Study

## Summary

Converting WordGraph into a browser extension is **technically feasible** and would add genuine value (right-click a word on any page → explore its graph instantly). The effort is moderate (~3–4 weeks for a solo developer). The biggest constraint is Manifest V3's stricter Content Security Policy and the need to bundle the entire React app as a self-contained extension.

---

## What the extension would do

| Trigger | Experience |
|---|---|
| Right-click any selected word on a webpage | "Explore in WordGraph" context menu → opens sidebar panel |
| Click toolbar icon | Opens full WordGraph in a popup or side panel |
| Keyboard shortcut (e.g. Alt+W) | Opens sidebar with selected word pre-loaded |

The library (saved words, collections, notes) would persist in `chrome.storage.local` (replaces IndexedDB, same local-first guarantee). Export/import stays identical.

---

## Technical approach

### Manifest V3 (required for Chrome/Edge; Firefox supports both V2 and V3)

```json
{
  "manifest_version": 3,
  "name": "WordGraph",
  "permissions": ["storage", "contextMenus", "sidePanel"],
  "side_panel": { "default_path": "index.html" },
  "background": { "service_worker": "background.js" },
  "content_scripts": [{ "matches": ["<all_urls>"], "js": ["content.js"] }]
}
```

### Key architectural changes vs. the web app

| Area | Web app (current) | Extension |
|---|---|---|
| Storage | Dexie.js / IndexedDB | `chrome.storage.local` (or keep Dexie — it works in extension pages) |
| Dictionary API | `fetch()` to `api.dictionaryapi.dev` | Same — works from extension background service worker |
| UI shell | Full-page React app | Side Panel (Chrome 114+) or popup (320×600) |
| Routing | Wouter / URL-based | Hash router or in-memory router (no real URL bar in popup) |
| CSP | Vite dev server | Extension CSP: no `eval`, no remote scripts — must bundle everything |
| Auth | None (local-first) | None needed — no change |

### Components that port with zero or minimal change
- All React components, design system tokens, graph SVG
- Export/import logic
- Dictionary API client (runs in background service worker)
- Dark/light mode

### Components that need rewriting
- **Storage layer**: `Dexie.js` works inside extension pages but `chrome.storage.local` is safer across contexts. A thin adapter interface makes this swappable.
- **Router**: Replace `wouter` with a simple in-memory state machine (no URL changes happen in a side panel).
- **Context-menu bridge**: A content script captures the selected word and sends it to the side panel via `chrome.runtime.sendMessage`.

---

## Build pipeline

Vite already produces a static bundle. Adding an extension build target is straightforward:

```
vite build --mode extension
```

A custom `vite.config.extension.ts` sets:
- `build.rollupOptions.input` → `{ main: 'index.html', background: 'src/background.ts', content: 'src/content.ts' }`
- `build.outDir` → `dist-extension`
- Removes HMR, dev-server config

The `dist-extension/` folder is then zipped and submitted to the Chrome Web Store.

---

## Platform support

| Browser | Support level | Notes |
|---|---|---|
| Chrome / Edge | ✅ Full | MV3 Side Panel API available since Chrome 114 |
| Firefox | ✅ Full | Firefox supports MV3 + sidebar_action (slightly different API) |
| Safari | ⚠️ Partial | Requires Xcode + Safari Web Extension Converter; extra notarization step |
| Arc | ✅ | Uses Chrome extension store |

---

## Effort estimate

| Phase | Work | Estimate |
|---|---|---|
| 1. Extension scaffold | Manifest, Vite build config, side panel shell, background SW | 3–4 days |
| 2. Storage adapter | Abstract Dexie behind interface, add `chrome.storage` adapter | 2 days |
| 3. Router port | Replace wouter with in-memory state | 1–2 days |
| 4. Context-menu integration | Content script → message → side panel | 1–2 days |
| 5. CSP audit & fixes | Remove any `eval` usage, inline style violations | 1 day |
| 6. Polish & store listing | Icons, description, screenshots, privacy policy | 2–3 days |
| **Total** | | **~10–14 days** |

---

## Risks and mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| `api.dictionaryapi.dev` blocked by page CSP | Medium | Fetch from background service worker instead of content script |
| Chrome Web Store review delay | Low–Medium | Budget 1–3 weeks for review; submit early |
| Side Panel not available in older Chrome | Low | Fallback: popup (320×600) with same React tree |
| Firefox MV3 differences | Low | Use `browser-polyfill` from Mozilla |

---

## Recommendation

Build the extension as a **separate artifact** that shares the design system and dictionary client with the web app via the existing pnpm workspace. The web app and extension remain independently deployable — the extension is not a fork, it re-uses ~80% of the codebase.

**Suggested milestone order:**  
Web app reaches v1 stability → extract shared packages → build extension shell → port storage → ship.
