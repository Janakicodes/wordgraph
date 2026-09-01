// Hook: useWordSuggestions
// Returns deduplicated word suggestions for a query string (≥2 chars) from:
//   1. Static WORD_DB keys   (instant, always available)
//   2. IndexedDB wordApiCache (all previously looked-up words)
//   3. Datamuse /sug endpoint (live completions, debounced 200 ms)

import { useState, useEffect, useRef } from 'react';
import { WORD_DB } from '@/data/words';
import { db } from '@/lib/db';

const DEBOUNCE_MS = 200;
const MAX_SUGGESTIONS = 8;

async function fetchCachedWords(): Promise<string[]> {
  try {
    const entries = await db.wordApiCache.toArray();
    // Exclude not-found sentinel entries
    return entries
      .filter((e) => e.data !== '__NOT_FOUND__')
      .map((e) => e.word);
  } catch {
    return [];
  }
}

async function fetchDatamuseSuggestions(query: string): Promise<string[]> {
  try {
    const res = await fetch(
      `https://api.datamuse.com/sug?s=${encodeURIComponent(query)}&max=10`,
    );
    if (!res.ok) return [];
    const items = (await res.json()) as { word: string }[];
    // Filter to single-word results only
    return items.map((i) => i.word).filter((w) => !w.includes(' '));
  } catch {
    return [];
  }
}

function rankSuggestions(
  query: string,
  words: string[],
): string[] {
  const q = query.toLowerCase();
  // Deduplicate
  const unique = [...new Set(words.map((w) => w.toLowerCase()))];
  // Sort: starts-with first, then contains, alphabetically within each group
  const startsWith = unique.filter((w) => w.startsWith(q)).sort();
  const contains = unique
    .filter((w) => !w.startsWith(q) && w.includes(q))
    .sort();
  return [...startsWith, ...contains].slice(0, MAX_SUGGESTIONS);
}

export function useWordSuggestions(query: string) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const q = query.trim().toLowerCase();

    if (q.length < 2) {
      setSuggestions([]);
      return;
    }

    // Cancel any pending debounced call
    if (timerRef.current) clearTimeout(timerRef.current);
    if (abortRef.current) abortRef.current.abort();

    const controller = new AbortController();
    abortRef.current = controller;

    // Immediately show local matches (WORD_DB + cache)
    const wordDbKeys = Object.keys(WORD_DB);

    // Start async work in debounced timer
    timerRef.current = setTimeout(async () => {
      if (controller.signal.aborted) return;

      // Fetch cached + datamuse in parallel
      const [cachedKeys, datamuse] = await Promise.all([
        fetchCachedWords(),
        fetchDatamuseSuggestions(q),
      ]);

      if (controller.signal.aborted) return;

      const allWords = [...wordDbKeys, ...cachedKeys, ...datamuse];
      const filtered = allWords.filter((w) => w.toLowerCase().includes(q));
      setSuggestions(rankSuggestions(q, filtered));
    }, DEBOUNCE_MS);

    // Show instant local suggestions right away (no debounce)
    const localFiltered = wordDbKeys.filter((w) => w.includes(q));
    setSuggestions(rankSuggestions(q, localFiltered));

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      controller.abort();
    };
  }, [query]);

  return suggestions;
}
