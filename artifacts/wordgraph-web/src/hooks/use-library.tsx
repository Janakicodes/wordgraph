// Reactive hooks and mutation helpers for the local-first library (Dexie/IndexedDB).
// Components import from here and never touch the DB directly.

import { useLiveQuery } from 'dexie-react-hooks';
import { db, type SavedWord, type Collection, type WordCollection } from '@/lib/db';
import { lookupWord } from '@/lib/dictionary';

// ── Read hooks ────────────────────────────────────────────────────────────────

/** All saved words, newest first. */
export function useSavedWords(): SavedWord[] {
  return (
    useLiveQuery(() => db.savedWords.orderBy('savedAt').reverse().toArray()) ?? []
  );
}

/** Live count so components can tell saved/unsaved without fetching the whole record. */
export function useIsSaved(word: string): boolean {
  const count = useLiveQuery(
    () => db.savedWords.where('word').equals(word.toLowerCase()).count(),
    [word],
  );
  return (count ?? 0) > 0;
}

/** Single saved word record (undefined while loading or if not saved). */
export function useSavedWord(word: string): SavedWord | undefined {
  return useLiveQuery(
    () => db.savedWords.get(word.toLowerCase()),
    [word],
  );
}

/** All collections, oldest first (creation order). */
export function useCollections(): Collection[] {
  return useLiveQuery(() => db.collections.orderBy('createdAt').toArray()) ?? [];
}

/** Single collection by id. */
export function useCollection(id: number): Collection | undefined {
  return useLiveQuery(() => db.collections.get(id), [id]);
}

/** Collection IDs that contain a given word. */
export function useWordCollectionIds(word: string): number[] {
  const rows: WordCollection[] =
    useLiveQuery(
      () => db.wordCollections.where('word').equals(word.toLowerCase()).toArray(),
      [word],
    ) ?? [];
  return rows.map((r) => r.collectionId);
}

/** Saved words that belong to a collection. */
export function useWordsInCollection(collectionId: number): SavedWord[] {
  const links: WordCollection[] =
    useLiveQuery(
      () =>
        db.wordCollections.where('collectionId').equals(collectionId).toArray(),
      [collectionId],
    ) ?? [];
  const wordKeys = links.map((l) => l.word);
  const all = useSavedWords();
  return all.filter((w) => wordKeys.includes(w.word));
}

/** All unique tags sorted alphabetically. */
export function useAllTags(): string[] {
  const words = useSavedWords();
  const tagSet = new Set<string>();
  for (const w of words) {
    for (const t of w.tags) tagSet.add(t);
  }
  return [...tagSet].sort();
}

/** Saved words that carry a specific tag. */
export function useWordsByTag(tag: string): SavedWord[] {
  return (
    useLiveQuery(
      () => db.savedWords.where('tags').equals(tag).toArray(),
      [tag],
    ) ?? []
  );
}

// ── Mutation helpers (plain async functions — no hooks) ───────────────────────

/** Save a word to the library (or update if already saved). */
export async function saveWord(word: string): Promise<void> {
  const key = word.toLowerCase();
  const existing = await db.savedWords.get(key);
  if (existing) return; // already saved — don't overwrite user data
  // lookupWord checks static WORD_DB first, then IndexedDB cache — no extra network call
  const result = await lookupWord(key);
  const data = result.kind === 'found' ? result.data : null;
  await db.savedWords.put({
    word: key,
    definition: data?.definition ?? '',
    ipa: data?.pronunciation ?? '',
    partOfSpeech: data?.partOfSpeech ?? '',
    notes: '',
    savedAt: Date.now(),
    tags: [],
  });
}

/** Remove a word from the library (also cleans up word-collection links). */
export async function unsaveWord(word: string): Promise<void> {
  const key = word.toLowerCase();
  await db.transaction('rw', db.savedWords, db.wordCollections, async () => {
    await db.savedWords.delete(key);
    await db.wordCollections.where('word').equals(key).delete();
  });
}

/** Update the personal notes on a saved word. */
export async function updateNotes(word: string, notes: string): Promise<void> {
  await db.savedWords.update(word.toLowerCase(), { notes });
}

/** Replace the tags on a saved word. */
export async function updateTags(word: string, tags: string[]): Promise<void> {
  const clean = tags.map((t) => t.trim().toLowerCase()).filter(Boolean);
  await db.savedWords.update(word.toLowerCase(), { tags: [...new Set(clean)] });
}

/** Create a new collection; returns its new id. */
export async function createCollection(name: string): Promise<number> {
  return db.collections.add({ name: name.trim(), createdAt: Date.now() });
}

/** Rename a collection. */
export async function renameCollection(id: number, name: string): Promise<void> {
  await db.collections.update(id, { name: name.trim() });
}

/** Delete a collection and all its word memberships. */
export async function deleteCollection(id: number): Promise<void> {
  await db.transaction('rw', db.collections, db.wordCollections, async () => {
    await db.collections.delete(id);
    await db.wordCollections.where('collectionId').equals(id).delete();
  });
}

/** Add a word to a collection (idempotent). */
export async function addWordToCollection(
  word: string,
  collectionId: number,
): Promise<void> {
  const key = word.toLowerCase();
  const exists = await db.wordCollections
    .where('[word+collectionId]')
    .equals([key, collectionId])
    .count();
  if (exists === 0) {
    await db.wordCollections.add({ word: key, collectionId });
  }
}

/** Remove a word from a collection. */
export async function removeWordFromCollection(
  word: string,
  collectionId: number,
): Promise<void> {
  await db.wordCollections
    .where('[word+collectionId]')
    .equals([word.toLowerCase(), collectionId])
    .delete();
}

// ── Exploration path (sessionStorage — resets each browser session) ────────────

const SESSION_PATH_KEY = 'wg_session_path';

export function getSessionPath(): string[] {
  try {
    return JSON.parse(sessionStorage.getItem(SESSION_PATH_KEY) ?? '[]') as string[];
  } catch {
    return [];
  }
}

/** Append word to session path; if already present, trim to that point. Returns new path. */
export function updateSessionPath(word: string): string[] {
  const path = getSessionPath();
  const idx = path.indexOf(word);
  const newPath = idx !== -1 ? path.slice(0, idx + 1) : [...path, word];
  try {
    sessionStorage.setItem(SESSION_PATH_KEY, JSON.stringify(newPath));
  } catch { /* storage unavailable */ }
  return newPath;
}

// ── Export helpers ────────────────────────────────────────────────────────────

export interface LibrarySnapshot {
  version: 1;
  exportedAt: string;
  savedWords: SavedWord[];
  collections: Collection[];
  wordCollections: WordCollection[];
}

export async function buildSnapshot(): Promise<LibrarySnapshot> {
  const [savedWords, collections, wordCollections] = await Promise.all([
    db.savedWords.toArray(),
    db.collections.toArray(),
    db.wordCollections.toArray(),
  ]);
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    savedWords,
    collections,
    wordCollections,
  };
}

/** Merge an imported snapshot into the local DB without overwriting existing data. */
export async function mergeSnapshot(snapshot: LibrarySnapshot): Promise<void> {
  // Map old collection IDs → new collection IDs
  const idMap = new Map<number, number>();

  await db.transaction(
    'rw',
    db.savedWords,
    db.collections,
    db.wordCollections,
    async () => {
      // 1. Collections: match by name, create if new
      for (const col of snapshot.collections ?? []) {
        const existing = await db.collections
          .where('name')
          .equals(col.name)
          .first();
        if (existing && existing.id !== undefined) {
          idMap.set(col.id!, existing.id);
        } else {
          const newId = await db.collections.add({
            name: col.name,
            createdAt: col.createdAt,
          });
          idMap.set(col.id!, newId as number);
        }
      }

      // 2. Words: add if not already saved (preserve existing user data)
      for (const sw of snapshot.savedWords ?? []) {
        const exists = await db.savedWords.get(sw.word);
        if (!exists) {
          await db.savedWords.put(sw);
        } else {
          // Merge tags only
          const merged = [
            ...new Set([...(exists.tags ?? []), ...(sw.tags ?? [])]),
          ];
          await db.savedWords.update(sw.word, { tags: merged });
        }
      }

      // 3. Word-collection links: map old IDs to new ones
      for (const wc of snapshot.wordCollections ?? []) {
        const newColId = idMap.get(wc.collectionId);
        if (newColId === undefined) continue;
        const exists = await db.wordCollections
          .where('[word+collectionId]')
          .equals([wc.word, newColId])
          .count();
        if (exists === 0) {
          await db.wordCollections.add({ word: wc.word, collectionId: newColId });
        }
      }
    },
  );
}
