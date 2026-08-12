import type { Page } from '@playwright/test';

/** Clear the WordGraph IndexedDB database and reload so Dexie re-opens cleanly. */
export async function resetDb(page: Page): Promise<void> {
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const req = indexedDB.deleteDatabase('wordgraph');
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
        req.onblocked = () => resolve(); // still continues
      }),
  );
  await page.reload({ waitUntil: 'load' });
}

/** Navigate to a word's explore page and wait for its heading to appear. */
export async function goToExplore(page: Page, word: string): Promise<void> {
  await page.goto(`/explore/${encodeURIComponent(word)}`);
  // The heading has aria-live="polite" and shows the word capitalised
  await page.waitForSelector(`h1`, { state: 'visible' });
}
