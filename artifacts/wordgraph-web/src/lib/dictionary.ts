// Dictionary API client with IndexedDB caching
// Priority: static WORD_DB (authoritative) → IndexedDB cache → Free Dictionary API → Datamuse API

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
const PRIMARY_LOOKUP_TIMEOUT_MS = 1_200;
const RELATIONSHIP_LOOKUP_TIMEOUT_MS = 2_000;
const DEFINITION_LOOKUP_TIMEOUT_MS = 3_000;

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

// ── Datamuse API types ────────────────────────────────────────────────────────

interface DatamuseWord {
  word: string;
  score?: number;
  tags?: string[];
  defs?: string[];
}

// ── Datamuse fallback lookup ──────────────────────────────────────────────────

/**
 * Attempt to build WordData for `key` using the Datamuse API.
 *
 * Returns WordData when the word is found.
 * Returns null when ALL requests succeeded (2xx) but returned no data
 *   — this is a positive "not found" that the caller may cache.
 * Throws when the word has no data AND at least one request failed with
 *   a non-2xx status or a parse error — the caller must NOT cache a
 *   not-found sentinel in that case, as the result is uncertain.
 */
async function lookupViaDatamuse(key: string): Promise<WordData | null> {
  const enc = encodeURIComponent(key);

  // Fetch and parse in parallel. Optional relationships have a shorter limit;
  // the definition request gets longer so slow graph data cannot delay the
  // word's meaning. A failed request is not a confirmed empty result.
  const readWords = async (url: string, timeoutMs: number) => {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
      if (!response.ok) return { words: [] as DatamuseWord[], failed: true };
      const words: unknown = await response.json();
      if (!Array.isArray(words)) return { words: [] as DatamuseWord[], failed: true };
      return { words: words as DatamuseWord[], failed: false };
    } catch {
      return { words: [] as DatamuseWord[], failed: true };
    }
  };

  const [synResult, antResult, relResult, defResult] = await Promise.all([
    readWords(`https://api.datamuse.com/words?rel_syn=${enc}`, RELATIONSHIP_LOOKUP_TIMEOUT_MS),
    readWords(`https://api.datamuse.com/words?rel_ant=${enc}`, RELATIONSHIP_LOOKUP_TIMEOUT_MS),
    readWords(`https://api.datamuse.com/words?rel_jja=${enc}&rel_jjb=${enc}`, RELATIONSHIP_LOOKUP_TIMEOUT_MS),
    readWords(`https://api.datamuse.com/words?sp=${enc}&md=dp`, DEFINITION_LOOKUP_TIMEOUT_MS),
  ]);
  const anyFailure = [synResult, antResult, relResult, defResult].some((result) => result.failed);
  const synWords = synResult.words;
  const antWords = antResult.words;
  const relWords = relResult.words;
  const defWords = defResult.words;

  // Filter to single-word results only, deduplicate, cap at 6 each
  const toWordList = (items: DatamuseWord[], limit = 6) =>
    [...new Set(items.map((w) => w.word.toLowerCase()).filter((w) => !w.includes(' ')))].slice(0, limit);

  const synonyms = toWordList(synWords);
  const antonyms = toWordList(antWords);
  const related  = toWordList(relWords);

  // Extract definition and part of speech from the ?sp= query
  // defWords[0] is the exact word (highest score), subsequent are near-spellings
  const exactMatch = defWords.find((w) => w.word.toLowerCase() === key);
  const defEntry   = exactMatch ?? defWords[0];

  const hasData =
    synonyms.length > 0 ||
    antonyms.length > 0 ||
    related.length > 0 ||
    (defEntry?.defs?.length ?? 0) > 0;

  if (!hasData) {
    if (anyFailure) {
      // Some requests failed — result is uncertain; do NOT cache not-found
      throw new Error('Datamuse API returned errors for one or more endpoints');
    }
    // All requests succeeded with empty results — word genuinely not found
    return null;
  }

  // Parse the first definition string — Datamuse format: "pos\tgloss"
  let partOfSpeech = '';
  let definition   = '';
  if (defEntry?.defs?.length) {
    const raw    = defEntry.defs[0];
    const tabIdx = raw.indexOf('\t');
    if (tabIdx !== -1) {
      partOfSpeech = raw.slice(0, tabIdx);
      definition   = raw.slice(tabIdx + 1);
    } else {
      definition = raw;
    }
  }

  const examples: [string, string] = [
    `"${key}" is a word used in everyday English.`,
    `Explore synonyms and related words to learn more about "${key}".`,
  ];

  return {
    word: key,
    pronunciation: '',
    partOfSpeech,
    definition,
    synonyms,
    antonyms,
    related,
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

  // 3. Give the primary dictionary a short window to respond. It can take
  // 20+ seconds during an outage, while Datamuse is usually much faster.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PRIMARY_LOOKUP_TIMEOUT_MS);
  let data: WordData | null = null;
  let fdStatus = 0;
  try {
    const res = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(key)}`,
      { signal: controller.signal },
    );
    fdStatus = res.status;
    if (res.ok) {
      const entries = (await res.json()) as FDEntry[];
      data = normalise(entries);
    }
  } catch {
    // Timeout, network failure, or invalid JSON: try Datamuse instead.
  } finally {
    clearTimeout(timeout);
  }

  if (!data) {
    return tryDatamuseFallback(key, fdStatus);
  }

  // Cache result (best-effort — failure here must not discard valid data)
  await writeCache(key, JSON.stringify(data));

  return { kind: 'found', data };
}

// ── Datamuse fallback helper ──────────────────────────────────────────────────

/**
 * Called when the Free Dictionary API fails or returns nothing.
 * Tries Datamuse; caches success or not-found; returns error only if
 * Datamuse also throws (genuine network problem).
 */
async function tryDatamuseFallback(
  key: string,
  fdStatus: number,
): Promise<LookupResult> {
  let data: WordData | null;
  try {
    data = await lookupViaDatamuse(key);
  } catch (err) {
    // Both sources had a network failure — surface an error
    return {
      kind: 'error',
      reason: err instanceof Error ? err.message : `Dictionary API returned ${fdStatus}`,
    };
  }

  if (!data) {
    // Both sources confirmed nothing — cache not-found sentinel
    await writeCache(key, NOT_FOUND_SENTINEL);
    return { kind: 'not-found' };
  }

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
