# WordGraph — Product Requirements Document v2.0

**Status:** Living document  
**Product:** WordGraph — Visual Vocabulary Explorer  
**Audience:** Internal (engineering, design, product)

---

## 1. Product vision

WordGraph is a calm, local-first vocabulary tool for people who care about words. It lets you search any English word, explore how it connects to synonyms, antonyms, and related words in an interactive graph, and build a personal library of words worth keeping — all without an account, a server, or the internet after first load.

> *Obsidian meets a thesaurus. No gamification. No streaks. Just words.*

---

## 2. Target users

| Persona | Description | Core need |
|---|---|---|
| **The Writer** | Novelist, copywriter, journalist | Find the exact word; avoid repetition |
| **The Learner** | ESL student, self-taught reader | Understand a word deeply, not just its definition |
| **The Thinker** | Researcher, academic, knowledge worker | Build a personal vocabulary corpus; export for reference |
| **The Browser** | Curious reader who encounters an unfamiliar word | Quick lookup that doesn't interrupt flow |

---

## 3. Design principles

1. **Typography first** — the word is the UI. No coloured bubbles, no icons fighting for attention.
2. **Local-first** — your data lives on your device. No account, no cloud sync, no data collection.
3. **Calm** — no streaks, no badges, no notifications. The app recedes; the words stand forward.
4. **Fast by default** — instant for cached/static words; graceful loading for fresh lookups.
5. **Accessible** — WCAG 2.1 AA; full keyboard navigation; reduced-motion support.

---

## 4. Tech stack

### Frontend
| Layer | Choice | Reason |
|---|---|---|
| Framework | React 18 + TypeScript | Component model, ecosystem, type safety |
| Build tool | Vite 7 | Fast HMR, ESM-first, easy to extend for extension build |
| Routing | Wouter | Tiny (2 KB), hook-based, no context provider boilerplate |
| Animation | Framer Motion | `useReducedMotion`-aware, declarative graph transitions |
| Styling | CSS custom properties + Tailwind-compatible utility classes | Design system token-driven, no runtime CSS-in-JS |
| Icons | Lucide React | Consistent, tree-shaken |

### Design system (`@workspace/wordgraph-design-system`)
| Area | Approach |
|---|---|
| Tokens | `tokens.json` → generated `styles.css` (CSS vars) |
| Color | Two palettes: `light` / `dark`. Graph semantic colors: `--graph-synonym` (muted green), `--graph-antonym` (muted red), `--graph-related` (muted blue) |
| Typography | Inter, type scale via `--font-*` vars |
| Components | Shared React components consumed by the web app |

### Persistence
| Layer | Technology | Purpose |
|---|---|---|
| Word graph | Static `WORD_DB` (TypeScript) | 12 seed words, always authoritative |
| Dictionary cache | Dexie.js (IndexedDB) | Cache API responses for 7 days; works offline after first load |
| User library | Dexie.js (IndexedDB) | Saved words, collections, tags, notes — never leaves the device |

### Dictionary
| | |
|---|---|
| Provider | [Free Dictionary API](https://api.dictionaryapi.dev) — open, no key required |
| Endpoint | `GET https://api.dictionaryapi.dev/api/v2/entries/en/{word}` |
| Coverage | ~100 k common English words |
| Fallback | IndexedDB cache → `not-found` state (no crash) |
| Limitation | Abstract/rare words (e.g. "nothingness") may be missing; network required on first lookup |

### Testing
| Tool | Scope |
|---|---|
| Playwright | End-to-end: save, tag, collection, export, import — full data-fidelity suite |
| System Chromium | NixOS environment requires `/nix/store/…/bin/chromium` (resolved via `which chromium`) |

### Monorepo
| Tool | Role |
|---|---|
| pnpm workspaces | Package management, cross-package deps |
| TypeScript project references | Incremental builds |

---

## 5. Information architecture

```
/                        → Home (search bar, recent words)
/explore/:word           → Explore (graph + word info panel)
/library                 → Library (all saved words)
/library/collections/:id → Collection view
/library/tags/:tag       → Tag view
/settings                → Export / import
```

---

## 6. Feature inventory

### 6.1 Search & discovery
| Feature | Status | Notes |
|---|---|---|
| Search any English word | ✅ Shipped | Via Free Dictionary API with IndexedDB cache |
| Recent words on home screen | ✅ Shipped | Stored in sessionStorage |
| Autocomplete / suggestions while typing | 🔵 Proposed | Match against cached + static words |
| Global search from every page | 🔵 Proposed | Not just home screen |

### 6.2 Graph
| Feature | Status | Notes |
|---|---|---|
| Interactive SVG graph | ✅ Shipped | Typographic nodes, pan support |
| Synonym / antonym / related lanes | ✅ Shipped | Colour-coded edges |
| Click node → explore that word | ✅ Shipped | Pushes new URL |
| Legend overlay | ✅ Shipped | Top-left of graph SVG |
| Multi-word phrase filtering | 🔵 Proposed | Task #7 — filter API nodes with spaces |
| Exploration breadcrumb | ✅ Shipped | Session path: Pragmatic → Realistic → … |

### 6.3 Word information panel
| Feature | Status | Notes |
|---|---|---|
| Definition, part of speech, IPA | ✅ Shipped | |
| Commonness badge | ✅ Shipped | Common / uncommon heuristic |
| Examples | ✅ Shipped | Up to 2 from API |
| Memory trick | ✅ Shipped | Static DB only |
| Usage notes | ✅ Shipped | Static DB only |
| Audio pronunciation | 🔵 Proposed | Task #6 — Free Dictionary API has audio URLs |

### 6.4 Library & collections
| Feature | Status | Notes |
|---|---|---|
| Save / unsave word | ✅ Shipped | |
| Personal notes | ✅ Shipped | Debounced, auto-saved |
| Tags | ✅ Shipped | Multi-tag, inline add/remove |
| Collections | ✅ Shipped | CRUD, word membership |
| Library graph | ✅ Shipped | Graph of all saved words |
| Filter by collection / tag | ✅ Shipped | Sidebar navigation |

### 6.5 Data ownership
| Feature | Status | Notes |
|---|---|---|
| Export JSON | ✅ Shipped | Full snapshot: words, tags, notes, collections, memberships |
| Export Markdown | ✅ Shipped | Human-readable |
| Export CSV | ✅ Shipped | Spreadsheet-compatible |
| Import JSON | ✅ Shipped | Merge semantics: no data loss, deduplicated |
| E2E data-fidelity tests | ✅ Shipped | 6 Playwright tests |

### 6.6 UX
| Feature | Status | Notes |
|---|---|---|
| Light / dark mode | ✅ Shipped | System preference + manual toggle |
| Reduced motion | ✅ Shipped | Respects `prefers-reduced-motion` |
| Responsive layout | ✅ Shipped | Desktop: graph + panel side by side; mobile: stacked |
| Keyboard navigation | ✅ Shipped | Focus rings on all interactive elements |
| ARIA labels | ✅ Shipped | Graph nodes, edges, legend, all buttons |

---

## 7. Data model

### IndexedDB schema (Dexie)

```typescript
// wordgraph (database name)

savedWords          // PK: word (string)
  word: string
  savedAt: number
  notes: string
  tags: string[]

collections         // PK: ++id (auto-increment)
  id: number
  name: string
  createdAt: number

wordCollections     // compound index: [word+collectionId]
  word: string
  collectionId: number

wordApiCache        // PK: word (string) — dictionary response cache
  word: string
  data: string      // JSON | '__NOT_FOUND__'
  cachedAt: number  // TTL: 7 days

recentWords         // sessionStorage (not Dexie)
```

### Export snapshot schema (v1)

```typescript
{
  version: 1,
  exportedAt: string,        // ISO-8601
  savedWords: SavedWord[],
  collections: Collection[],
  wordCollections: WordCollection[]
}
```

---

## 8. API dependency

### Free Dictionary API
- **URL:** `https://api.dictionaryapi.dev/api/v2/entries/en/{word}`
- **Auth:** None
- **Rate limits:** Undocumented; no SLA
- **Coverage gaps:** Abstract/philosophical words, neologisms, proper nouns — may return 404 or 500
- **Offline behaviour:** Falls back to IndexedDB cache; shows error state if not cached
- **Mitigation for gaps:** Task #7 will filter out multi-word phrases the API injects as synonyms. Long-term: consider supplementing with Datamuse API (has `rel_syn`, `rel_ant`, `rel_jja` endpoints) for richer graph data.

---

## 9. Non-functional requirements

| Requirement | Target |
|---|---|
| First contentful paint (cached word) | < 300 ms |
| First contentful paint (fresh API word) | < 1.5 s |
| Bundle size (initial JS) | < 200 KB gzipped |
| Offline capability | Full (after first word load) |
| Data privacy | Zero telemetry; no network calls except dictionary lookups |
| Browser support | Chrome 114+, Firefox 115+, Safari 17+, Edge 114+ |
| Accessibility | WCAG 2.1 AA |

---

## 10. Roadmap

### Now (v1 — shipped)
Search any word → explore graph → save to library → manage collections & tags → export/import

### Next (v1.1)
- **#6** Audio pronunciation playback
- **#7** Filter multi-word graph nodes
- **#8** Global search / search-from-everywhere + autocomplete suggestions

### Later (v1.2)
- Datamuse API integration for richer related-word graph
- Keyboard shortcut to save current word
- Shareable word links (encode word in URL, no server needed)

### Stretch / v2
- Browser extension (see `docs/browser-extension-feasibility.md`)
- PWA / install-to-home-screen
- Spaced-repetition review mode (opt-in, no gamification aesthetic)
- Markdown / Obsidian vault export

---

## 11. Metrics (qualitative, no telemetry)

Since WordGraph is intentionally zero-telemetry, success is measured through:
- User-reported exports growing over time (self-reported)
- Extension install count (once shipped)
- GitHub stars / community contributions

---

## 12. Out of scope (v1)

- User accounts / cloud sync
- Social features (sharing, leaderboards)
- Mobile native app (evaluate after browser extension)
- AI-generated definitions (rely on dictionary API)
- Monetisation (free and open)
