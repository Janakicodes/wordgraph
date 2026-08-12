// Dictionary API client with IndexedDB caching
// Priority: static WORD_DB (authoritative) → IndexedDB cache → Free Dictionary API

import { db } from '@/lib/db';
import { WORD_DB, type WordData } from '@/data/words';

// ── Result type ───────────────────────────────────────────────────────────────

export type LookupResult =
  | { kind: 'found'; data: WordData }
  | { kind: 'not-found' }
  | { kind: 'error'; reason: string };

// ── Free Dictionary API types ─────────────────────────────────────────────────

interface FDPhonetic {
  text?: string;
  audio?: string;
}

interface FDDefinition {
  definition: string;
  example?: string;
  synonyms?: string[];
  antonyms?: string[];
}

interface FDMeaning {
  partOfSpeech: string;
  definitions: FDDefinition[];
  synonyms?: string[];
  antonyms?: string[];
}

interface FDEntry {
  word: string;
  phonetic?: string;
  phonetics?: FDPhonetic[];
  meanings?: FDMeaning[];
}

// ── Cache TTL (7 days) ────────────────────────────────────────────────────────

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

// Sentinel stored when a word is confirmed not found by the API,
// so we don't re-fetch on every visit.
const NOT_FOUND_SENTINEL = '__NOT_FOUND__';

// ── Normalise API response → WordData ─────────────────────────────────────────

function normalise(entries: FDEntry[]): WordData | null {
  const entry = entries[0];
  if (!entry) return null;

  const meanings = entry.meanings ?? [];
  const firstMeaning = meanings[0];
  if (!firstMeaning) return null;

  // Pronunciation: prefer IPA text, fall back to phonetic field
  const ipa =
    entry.phonetics?.find((p) => p.text)?.text ??
    entry.phonetic ??
    '';

  // Part of speech from first meaning
  const partOfSpeech = firstMeaning.partOfSpeech ?? '';

  // Definition: first definition of first meaning
  const definition = firstMeaning.definitions[0]?.definition ?? '';

  // Collect synonyms/antonyms across all meanings (deduplicated, single-word only, max 6 each)
  const synonymSet = new Set<string>();
  const antonymSet = new Set<string>();
  for (const meaning of meanings) {
    for (const s of meaning.synonyms ?? []) {
      if (!s.includes(' ')) synonymSet.add(s.toLowerCase());
    }
    for (const a of meaning.antonyms ?? []) {
      if (!a.includes(' ')) antonymSet.add(a.toLowerCase());
    }
    for (const def of meaning.definitions) {
      for (const s of def.synonyms ?? []) {
        if (!s.includes(' ')) synonymSet.add(s.toLowerCase());
      }
      for (const a of def.antonyms ?? []) {
        if (!a.includes(' ')) antonymSet.add(a.toLowerCase());
      }
    }
  }

  const synonyms = [...synonymSet].slice(0, 6);
  const antonyms = [...antonymSet].slice(0, 6);

  // Examples: gather up to 2 from definitions across meanings
  const exampleList: string[] = [];
  for (const meaning of meanings) {
    for (const def of meaning.definitions) {
      if (def.example) exampleList.push(def.example);
      if (exampleList.length >= 2) break;
    }
    if (exampleList.length >= 2) break;
  }
  const examples: [string, string] = [
    exampleList[0] ?? `"${entry.word}" is used in everyday English.`,
    exampleList[1] ?? `Look up more about "${entry.word}" to see it in context.`,
  ];

  return {
    word: entry.word.toLowerCase(),
    pronunciation: ipa,
    partOfSpeech,
    definition,
    synonyms,
    antonyms,
    related: [],
    examples,
    memoryTrick: '',
    usage: '',
    commonness: 'common',
  };
}

// ── Cache helpers (best-effort — never throw) ─────────────────────────────────

async function readCache(key: string): Promise<string | null> {
  try {
    const cached = await db.wordApiCache.get(key);
    if (!cached) return null;
    const age = Date.now() - cached.cachedAt;
    return age < CACHE_TTL_MS ? cached.data : null;
  } catch {
    return null;
  }
}

async function writeCache(key: string, data: string): Promise<void> {
  try {
    await db.wordApiCache.put({ word: key, data, cachedAt: Date.now() });
  } catch {
    // IndexedDB unavailable (private mode, quota exceeded, etc.) — silent no-op
  }
}

// ── Main lookup ───────────────────────────────────────────────────────────────

/**
 * Look up a word and return a discriminated result:
 *   { kind: 'found', data }   — word exists with full data
 *   { kind: 'not-found' }     — API confirmed the word does not exist (HTTP 404)
 *   { kind: 'error', reason } — transient failure (network, parse, etc.)
 *
 * Priority:
 *   1. Static WORD_DB — authoritative, never overwritten.
 *   2. IndexedDB cache — instant, works offline.
 *   3. Free Dictionary API — fetched and then cached.
 */
export async function lookupWord(word: string): Promise<LookupResult> {
  const key = word.toLowerCase().trim();
  if (!key) return { kind: 'not-found' };

  // 1. Static database takes priority
  if (WORD_DB[key]) return { kind: 'found', data: WORD_DB[key] };

  // 2. Check IndexedDB cache (best-effort)
  const cached = await readCache(key);
  if (cached !== null) {
    if (cached === NOT_FOUND_SENTINEL) return { kind: 'not-found' };
    try {
      return { kind: 'found', data: JSON.parse(cached) as WordData };
    } catch {
      // Corrupt cache entry — fall through to re-fetch
    }
  }

  // 3. Fetch from Free Dictionary API
  let res: Response;
  try {
    res = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(key)}`,
    );
  } catch (err) {
    // Network failure (offline, DNS, etc.)
    return {
      kind: 'error',
      reason: err instanceof Error ? err.message : 'Network request failed',
    };
  }

  if (res.status === 404) {
    // Confirmed not found — cache so we don't re-fetch
    await writeCache(key, NOT_FOUND_SENTINEL);
    return { kind: 'not-found' };
  }

  if (!res.ok) {
    // Transient server error — don't cache, let the caller retry later
    return {
      kind: 'error',
      reason: `Dictionary API returned ${res.status}`,
    };
  }

  let entries: FDEntry[];
  try {
    entries = (await res.json()) as FDEntry[];
  } catch {
    return { kind: 'error', reason: 'Could not parse dictionary response' };
  }

  const data = normalise(entries);
  if (!data) {
    await writeCache(key, NOT_FOUND_SENTINEL);
    return { kind: 'not-found' };
  }

  // Cache result (best-effort — failure here must not discard valid data)
  await writeCache(key, JSON.stringify(data));

  return { kind: 'found', data };
}

/**
 * Build graph node data from a WordData object.
 * Returns synonym, antonym, and related nodes for the graph.
 */
export function buildGraphDataFromWordData(
  centreWord: string,
  data: WordData | null,
) {
  if (!data) return { centre: centreWord, nodes: [] };

  const nodes = [
    ...data.synonyms.map((w) => ({ word: w, type: 'synonym' as const })),
    ...data.antonyms.map((w) => ({ word: w, type: 'antonym' as const })),
    ...data.related.map((w) => ({ word: w, type: 'related' as const })),
  ];

  return { centre: centreWord, nodes };
}
