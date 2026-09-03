// Hook: useWordSuggestions
// Returns deduplicated word suggestions for a query string (≥2 chars) from:
//   1. Static WORD_DB keys   (instant, always available)
//   2. IndexedDB wordApiCache (all previously looked-up words)
//   3. Recent localStorage words (instant, when available)
//   4. Datamuse /sug endpoint (live completions, debounced 200 ms)

import { useState, useEffect, useRef } from 'react';
import { getRecentWords, WORD_DB } from '@/data/words';
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

async function fetchDatamuseSuggestions(
  query: string,
  signal: AbortSignal,
): Promise<string[]> {
  try {
    const res = await fetch(
      `https://api.datamuse.com/sug?s=${encodeURIComponent(query)}&max=10`,
      { signal },
    );
    if (!res.ok) return [];
    const items = (await res.json()) as { word: string }[];
    // Filter to single-word results only
    return items.map((i) => i.word).filter((w) => !w.includes(' '));
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return [];
    }
    return [];
  }
}

function rankSuggestions(
  query: string,
  words: string[],
  recentWords: string[] = [],
): string[] {
  const q = query.toLowerCase();
  // Deduplicate
  const unique = [...new Set(words.map((w) => w.toLowerCase()))];
  const recentRanks = new Map(
    recentWords.map((word, index) => [word.toLowerCase(), index]),
  );
  const compare = (a: string, b: string) => {
    const aRecentRank = recentRanks.get(a);
    const bRecentRank = recentRanks.get(b);

    // Recent words win ties within the starts-with/contains groups. With no
    // recent words this falls through to the existing alphabetical ordering.
    if (aRecentRank !== undefined || bRecentRank !== undefined) {
      if (aRecentRank === undefined) return 1;
      if (bRecentRank === undefined) return -1;
      if (aRecentRank !== bRecentRank) return aRecentRank - bRecentRank;
    }

    return a < b ? -1 : a > b ? 1 : 0;
  };

  // Sort: starts-with first, then contains, with recent words first within
  // each group and alphabetic ordering as the final tie-breaker.
  const startsWith = unique.filter((w) => w.startsWith(q)).sort(compare);
  const contains = unique
    .filter((w) => !w.startsWith(q) && w.includes(q))
    .sort(compare);
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

    const recentWords = getRecentWords();

    // Immediately show local matches (WORD_DB + recent words)
    const wordDbKeys = Object.keys(WORD_DB);
    const localWords = [...wordDbKeys, ...recentWords];

    // Start async work in debounced timer
    timerRef.current = setTimeout(async () => {
      if (controller.signal.aborted) return;

      // Fetch cached + datamuse in parallel
      const [cachedKeys, datamuse] = await Promise.all([
        fetchCachedWords(),
        fetchDatamuseSuggestions(q, controller.signal),
      ]);

      if (controller.signal.aborted) return;

      const allWords = [
        ...wordDbKeys,
        ...recentWords,
        ...cachedKeys,
        ...datamuse,
      ];
      const filtered = allWords.filter((w) => w.toLowerCase().includes(q));
      setSuggestions(rankSuggestions(q, filtered, recentWords));
    }, DEBOUNCE_MS);

    // Show instant local suggestions right away (no debounce)
    const localFiltered = localWords.filter((w) =>
      w.toLowerCase().includes(q),
    );
    setSuggestions(rankSuggestions(q, localFiltered, recentWords));

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      controller.abort();
    };
  }, [query]);

  return suggestions;
}
