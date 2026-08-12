// Dexie.js IndexedDB schema for WordGraph local-first persistence

import Dexie, { type Table } from 'dexie';
import { WORD_DB } from '@/data/words';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SavedWord {
  word: string;         // primary key (always lowercase)
  definition: string;
  ipa: string;
  partOfSpeech: string;
  notes: string;        // user's personal notes (free text)
  savedAt: number;      // Date.now() timestamp
  tags: string[];       // user tags e.g. ['work', 'writing']
}

export interface Collection {
  id?: number;          // auto-increment primary key
  name: string;
  createdAt: number;    // Date.now() timestamp
}

export interface WordCollection {
  id?: number;          // auto-increment primary key
  word: string;         // FK to savedWords.word
  collectionId: number; // FK to collections.id
}

export interface WordApiCache {
  word: string;         // primary key (always lowercase)
  data: string;         // JSON-serialised WordData (or null sentinel)
  cachedAt: number;     // Date.now() timestamp
}

// ── Database class ────────────────────────────────────────────────────────────

class WordGraphDB extends Dexie {
  savedWords!: Table<SavedWord, string>;
  collections!: Table<Collection, number>;
  wordCollections!: Table<WordCollection, number>;
  wordApiCache!: Table<WordApiCache, string>;

  constructor() {
    super('wordgraph');
    this.version(1).stores({
      savedWords: 'word, savedAt, *tags',
      collections: '++id, name, createdAt',
      wordCollections: '++id, word, collectionId, [word+collectionId]',
    });
    this.version(2).stores({
      savedWords: 'word, savedAt, *tags',
      collections: '++id, name, createdAt',
      wordCollections: '++id, word, collectionId, [word+collectionId]',
      wordApiCache: 'word, cachedAt',
    });
  }
}

export const db = new WordGraphDB();

// ── One-time migration from legacy localStorage ───────────────────────────────
// Runs before any Dexie queries so the Library is never empty for existing users.

const MIGRATION_KEY = 'wg_migration_v1_done';

db.on('ready', async () => {
  try {
    if (typeof localStorage === 'undefined') return;
    if (localStorage.getItem(MIGRATION_KEY)) return;

    const raw = localStorage.getItem('wg_saved_words');
    if (!raw) {
      localStorage.setItem(MIGRATION_KEY, 'true');
      return;
    }

    const words: unknown = JSON.parse(raw);
    if (!Array.isArray(words)) {
      localStorage.setItem(MIGRATION_KEY, 'true');
      return;
    }

    const now = Date.now();
    for (const item of words) {
      if (typeof item !== 'string') continue;
      const key = item.toLowerCase().trim();
      if (!key) continue;

      const exists = await db.savedWords.get(key);
      if (exists) continue;

      const data = WORD_DB[key];
      await db.savedWords.put({
        word: key,
        definition: data?.definition ?? '',
        ipa: data?.pronunciation ?? '',
        partOfSpeech: data?.partOfSpeech ?? '',
        notes: '',
        savedAt: now,
        tags: [],
      });
    }

    // Mark complete only after all words are migrated successfully
    localStorage.setItem(MIGRATION_KEY, 'true');
  } catch {
    // Leave MIGRATION_KEY unset so it retries on next page load
  }
});
