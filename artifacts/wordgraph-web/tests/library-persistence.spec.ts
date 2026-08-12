/**
 * End-to-end tests for WordGraph data-persistence flows.
 *
 * Each test starts with a clean IndexedDB, performs UI actions, then reloads
 * or re-navigates to confirm data survived in storage — not just in React state.
 *
 * Covers: save/unsave, tag persistence across reload, collection membership
 * persistence across reload, JSON export data fidelity (word + tag + collection
 * + membership), and JSON import idempotence with full data restoration.
 */

import { test, expect, type Download } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { resetDb, goToExplore } from './helpers';

// ── helpers ───────────────────────────────────────────────────────────────────

/** Expand the first word card in the library list and return its expand button. */
async function expandFirstWordCard(page: import('@playwright/test').Page) {
  const btn = page.locator('article button[aria-expanded]').first();
  await expect(btn).toBeVisible({ timeout: 5_000 });
  await btn.click();
  return btn;
}

/** Save "pragmatic" from its explore page and confirm the button toggles. */
async function saveWord(page: import('@playwright/test').Page, word = 'pragmatic') {
  await goToExplore(page, word);
  await page.getByRole('button', { name: new RegExp(`save ${word} to library`, 'i') }).click();
  await expect(
    page.getByRole('button', { name: new RegExp(`remove ${word} from library`, 'i') }),
  ).toBeVisible({ timeout: 5_000 });
}

// ── 1. Save → reload → still saved ───────────────────────────────────────────

test('saved word survives page reload', async ({ page }) => {
  await page.goto('/');
  await resetDb(page);

  await saveWord(page);

  // Hard reload — forces Dexie to re-read from IndexedDB
  await page.reload({ waitUntil: 'load' });

  // Button should still show "Saved / Remove" state after reload
  await expect(
    page.getByRole('button', { name: /remove pragmatic from library/i }),
  ).toBeVisible({ timeout: 5_000 });

  // Also verify in Library
  await page.goto('/library');
  await expect(page.getByText('pragmatic', { exact: false })).toBeVisible({ timeout: 5_000 });
});

// ── 2. Unsave → library empty ────────────────────────────────────────────────

test('unsaving a word removes it from library', async ({ page }) => {
  await page.goto('/');
  await resetDb(page);

  await saveWord(page);
  await page.getByRole('button', { name: /remove pragmatic from library/i }).click();
  await expect(
    page.getByRole('button', { name: /save pragmatic to library/i }),
  ).toBeVisible({ timeout: 5_000 });

  await page.goto('/library');
  await expect(page.getByText('pragmatic', { exact: false })).not.toBeVisible();
});

// ── 3. Tag persists across reload ─────────────────────────────────────────────

test('tag added to a word survives page reload', async ({ page }) => {
  await page.goto('/');
  await resetDb(page);

  await saveWord(page);
  await page.goto('/library');
  await expandFirstWordCard(page);

  // Add tag
  const tagInput = page.getByRole('textbox', { name: 'Add tag' });
  await expect(tagInput).toBeVisible({ timeout: 3_000 });
  await tagInput.fill('writing');
  await tagInput.press('Enter');

  const tagPill = page.locator('span').filter({ hasText: '#writing' }).first();
  await expect(tagPill).toBeVisible({ timeout: 5_000 });

  // Reload page — tag must come back from IndexedDB
  await page.reload({ waitUntil: 'load' });
  await expandFirstWordCard(page);
  await expect(
    page.locator('span').filter({ hasText: '#writing' }).first(),
  ).toBeVisible({ timeout: 5_000 });

  // Remove tag, confirm gone, reload, confirm stays gone
  await page.getByRole('button', { name: /remove tag writing/i }).click();
  await expect(
    page.locator('span').filter({ hasText: '#writing' }).first(),
  ).not.toBeVisible({ timeout: 3_000 });

  await page.reload({ waitUntil: 'load' });
  await expandFirstWordCard(page);
  await expect(
    page.locator('span').filter({ hasText: '#writing' }).first(),
  ).not.toBeVisible({ timeout: 3_000 });
});

// ── 4. Collection membership persists across reload ───────────────────────────

test('collection membership survives page reload', async ({ page }) => {
  await page.goto('/');
  await resetDb(page);

  await saveWord(page);
  await page.goto('/library');
  await expandFirstWordCard(page);

  // Open collection picker and create a collection named "Work"
  const manageBtn = page.getByRole('button', { name: '+ Manage' });
  await expect(manageBtn).toBeVisible({ timeout: 3_000 });
  await manageBtn.click();

  await expect(page.getByRole('dialog')).toBeVisible({ timeout: 3_000 });
  await page.getByPlaceholder('New collection…').fill('Work');
  await page.getByRole('button', { name: 'Add' }).click();

  // Word added to "Work" — checkbox checked
  const workLabel = page.locator('label').filter({ hasText: 'Work' });
  await expect(workLabel.locator('input[type="checkbox"]')).toBeChecked({ timeout: 3_000 });

  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 3_000 });

  // Reload — membership must survive
  await page.reload({ waitUntil: 'load' });
  await expandFirstWordCard(page);

  // "Work" badge should still be visible on the card header
  await expect(page.getByText('Work').first()).toBeVisible({ timeout: 5_000 });

  // Open picker again and confirm checkbox remains checked
  await page.getByRole('button', { name: '+ Manage' }).click();
  await expect(page.getByRole('dialog')).toBeVisible({ timeout: 3_000 });
  await expect(
    page.locator('label').filter({ hasText: 'Work' }).locator('input[type="checkbox"]'),
  ).toBeChecked({ timeout: 3_000 });
  await page.keyboard.press('Escape');
});

// ── 5. Export JSON contains word + tag + collection + membership ──────────────

test('exported JSON snapshot preserves word, tag, collection, and membership', async ({
  page,
}) => {
  await page.goto('/');
  await resetDb(page);

  // Save word
  await saveWord(page);

  // Add a tag
  await page.goto('/library');
  await expandFirstWordCard(page);

  const tagInput = page.getByRole('textbox', { name: 'Add tag' });
  await expect(tagInput).toBeVisible({ timeout: 3_000 });
  await tagInput.fill('research');
  await tagInput.press('Enter');
  await expect(
    page.locator('span').filter({ hasText: '#research' }).first(),
  ).toBeVisible({ timeout: 5_000 });

  // Add a collection
  await page.getByRole('button', { name: '+ Manage' }).click();
  await expect(page.getByRole('dialog')).toBeVisible({ timeout: 3_000 });
  await page.getByPlaceholder('New collection…').fill('Vocab');
  await page.getByRole('button', { name: 'Add' }).click();
  await expect(
    page.locator('label').filter({ hasText: 'Vocab' }).locator('input[type="checkbox"]'),
  ).toBeChecked({ timeout: 3_000 });
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 3_000 });

  // Add a personal note (debounce: 600 ms)
  const notesArea = page.getByLabel('Personal notes for pragmatic');
  await expect(notesArea).toBeVisible({ timeout: 3_000 });
  await notesArea.fill('Useful for product decisions.');
  // Wait for the 600 ms debounce to flush to IndexedDB before exporting
  await page.waitForTimeout(900);

  // Export JSON
  await page.goto('/settings');
  const [download]: [Download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: /download json/i }).click(),
  ]);

  const tmpPath = path.join(os.tmpdir(), `wg-export-${Date.now()}.json`);
  await download.saveAs(tmpPath);
  const snapshot = JSON.parse(fs.readFileSync(tmpPath, 'utf8')) as {
    version: number;
    savedWords: Array<{ word: string; tags: string[]; notes: string }>;
    collections: Array<{ id: number; name: string }>;
    wordCollections: Array<{ word: string; collectionId: number }>;
  };
  fs.unlinkSync(tmpPath);

  // Word is present
  expect(snapshot.version).toBe(1);
  const sw = snapshot.savedWords.find((w) => w.word === 'pragmatic');
  expect(sw).toBeDefined();

  // Tag is present on the word
  expect(sw!.tags).toContain('research');

  // Personal note is preserved in the snapshot
  expect(sw!.notes).toBe('Useful for product decisions.');

  // Collection "Vocab" is present
  const col = snapshot.collections.find((c) => c.name === 'Vocab');
  expect(col).toBeDefined();

  // Membership record links the word to the collection
  const link = snapshot.wordCollections.find(
    (wc) => wc.word === 'pragmatic' && wc.collectionId === col!.id,
  );
  expect(link).toBeDefined();
});

// ── 6. Import restores full data; re-import is idempotent ────────────────────

test('import restores word+tag+collection+membership; re-import is idempotent', async ({
  page,
}) => {
  await page.goto('/');
  await resetDb(page);

  // --- Build rich snapshot: word + tag + collection + membership ---
  await saveWord(page);

  await page.goto('/library');
  await expandFirstWordCard(page);

  // Add personal note (debounce: 600 ms)
  const notesArea = page.getByLabel('Personal notes for pragmatic');
  await expect(notesArea).toBeVisible({ timeout: 3_000 });
  await notesArea.fill('Remember: practical approach to problems.');
  await page.waitForTimeout(900); // let debounce flush to IndexedDB

  // Add tag
  const tagInput = page.getByRole('textbox', { name: 'Add tag' });
  await tagInput.fill('interview');
  await tagInput.press('Enter');
  await expect(
    page.locator('span').filter({ hasText: '#interview' }).first(),
  ).toBeVisible({ timeout: 5_000 });

  // Add collection "Study"
  await page.getByRole('button', { name: '+ Manage' }).click();
  await expect(page.getByRole('dialog')).toBeVisible({ timeout: 3_000 });
  await page.getByPlaceholder('New collection…').fill('Study');
  await page.getByRole('button', { name: 'Add' }).click();
  await expect(
    page.locator('label').filter({ hasText: 'Study' }).locator('input[type="checkbox"]'),
  ).toBeChecked({ timeout: 3_000 });
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 3_000 });

  // Export
  await page.goto('/settings');
  const [dl1]: [Download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: /download json/i }).click(),
  ]);
  const tmpPath = path.join(os.tmpdir(), `wg-import-${Date.now()}.json`);
  await dl1.saveAs(tmpPath);

  // Verify the exported snapshot is complete before importing it
  const exported = JSON.parse(fs.readFileSync(tmpPath, 'utf8')) as {
    savedWords: Array<{ word: string; tags: string[]; notes: string }>;
    collections: Array<{ name: string; id: number }>;
    wordCollections: Array<{ word: string; collectionId: number }>;
  };
  const exportedWord = exported.savedWords.find((w) => w.word === 'pragmatic');
  expect(exportedWord?.tags).toContain('interview');
  expect(exportedWord?.notes).toBe('Remember: practical approach to problems.');
  const exportedCol = exported.collections.find((c) => c.name === 'Study');
  expect(exportedCol).toBeDefined();
  expect(
    exported.wordCollections.some(
      (wc) => wc.word === 'pragmatic' && wc.collectionId === exportedCol!.id,
    ),
  ).toBe(true);

  // --- Clear DB and import ---
  await page.goto('/');
  await resetDb(page);

  // Confirm empty
  await page.goto('/library');
  await expect(page.getByText('pragmatic', { exact: false })).not.toBeVisible();

  await page.goto('/settings');
  const fileInput = page.getByLabel('Choose JSON file to import');
  await fileInput.setInputFiles(tmpPath);
  await expect(page.getByText(/1 word/i)).toBeVisible({ timeout: 5_000 });
  await page.getByRole('button', { name: /^import$/i }).click();
  await expect(page.getByText(/import complete/i).first()).toBeVisible({ timeout: 5_000 });

  // --- Reload and verify full data restoration ---
  await page.reload({ waitUntil: 'load' });

  await page.goto('/library');
  await expect(page.getByText('pragmatic', { exact: false })).toBeVisible({ timeout: 5_000 });
  await expandFirstWordCard(page);

  // Notes restored
  await expect(page.getByLabel('Personal notes for pragmatic')).toHaveValue(
    'Remember: practical approach to problems.',
    { timeout: 3_000 },
  );

  // Tag restored
  await expect(
    page.locator('span').filter({ hasText: '#interview' }).first(),
  ).toBeVisible({ timeout: 5_000 });

  // Collection badge restored
  await expect(page.getByText('Study').first()).toBeVisible({ timeout: 5_000 });

  // Membership restored (checkbox checked)
  await page.getByRole('button', { name: '+ Manage' }).click();
  await expect(page.getByRole('dialog')).toBeVisible({ timeout: 3_000 });
  await expect(
    page.locator('label').filter({ hasText: 'Study' }).locator('input[type="checkbox"]'),
  ).toBeChecked({ timeout: 3_000 });
  await page.keyboard.press('Escape');

  // --- Re-import the same file (idempotence) ---
  await page.goto('/settings');
  await fileInput.setInputFiles(tmpPath);
  await expect(page.getByText(/1 word/i)).toBeVisible({ timeout: 5_000 });
  await page.getByRole('button', { name: /^import$/i }).click();
  await expect(page.getByText(/import complete/i).first()).toBeVisible({ timeout: 5_000 });

  // No duplicates: exactly one word card in the library
  await page.goto('/library');
  const articles = page.locator('article');
  await expect(articles).toHaveCount(1, { timeout: 5_000 });

  // Tag, collection badge, and note are still present (not lost or duplicated on re-import)
  // — the tag renders in both the summary row and the expanded pill area, so we assert
  //   presence, not count; the single-article assertion above proves no duplication.
  await expandFirstWordCard(page);
  const wordCard = articles.first();
  await expect(
    wordCard.locator('span').filter({ hasText: '#interview' }).first(),
  ).toBeVisible({ timeout: 5_000 });
  await expect(wordCard.getByText('Study').first()).toBeVisible({ timeout: 5_000 });
  // mergeSnapshot preserves an existing word's notes (does not overwrite them)
  await expect(page.getByLabel('Personal notes for pragmatic')).toHaveValue(
    'Remember: practical approach to problems.',
    { timeout: 3_000 },
  );

  fs.unlinkSync(tmpPath);
});
