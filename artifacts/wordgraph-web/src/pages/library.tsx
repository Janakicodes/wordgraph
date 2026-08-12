import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import { Link, useLocation } from 'wouter';
import {
  BookOpen,
  List,
  Network,
  Plus,
  ChevronDown,
  ChevronUp,
  X,
  MoreHorizontal,
  Pencil,
  Trash2,
  FolderPlus,
  Check,
} from 'lucide-react';
import { Button } from '@workspace/wordgraph-design-system/components/ui/button';
import { Input } from '@workspace/wordgraph-design-system/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@workspace/wordgraph-design-system/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@workspace/wordgraph-design-system/components/ui/dialog';
import { cn } from '@workspace/wordgraph-design-system/lib/utils';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type SavedWord, type Collection } from '@/lib/db';
import { LibraryGraph } from '@/components/graph/LibraryGraph';
import { WORD_DB, COMMONNESS_LABELS } from '@/data/words';
import {
  useSavedWords,
  useCollections,
  useAllTags,
  useWordsInCollection,
  useWordsByTag,
  useWordCollectionIds,
  updateNotes,
  updateTags,
  unsaveWord,
  createCollection,
  renameCollection,
  deleteCollection,
  addWordToCollection,
  removeWordFromCollection,
} from '@/hooks/use-library';

// ── URL-based view parser ─────────────────────────────────────────────────────

type LibraryView =
  | { type: 'all' }
  | { type: 'collection'; id: number }
  | { type: 'tag'; tag: string };

function parseView(location: string): LibraryView {
  const parts = location.replace(/^\/library\/?/, '').split('/');
  if (parts[0] === 'collections' && parts[1]) {
    const id = parseInt(parts[1]);
    if (!isNaN(id)) return { type: 'collection', id };
  }
  if (parts[0] === 'tags' && parts[1]) {
    return { type: 'tag', tag: decodeURIComponent(parts[1]) };
  }
  return { type: 'all' };
}

// ── Word list item ────────────────────────────────────────────────────────────

interface WordListItemProps {
  savedWord: SavedWord;
}

function WordListItem({ savedWord }: WordListItemProps) {
  const [expanded, setExpanded] = useState(false);
  const [notesDraft, setNotesDraft] = useState(savedWord.notes ?? '');
  const [tagInput, setTagInput] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const notesTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const collections = useCollections();
  const wordColIds = useWordCollectionIds(savedWord.word);

  // Sync notes draft if record changes from outside
  useEffect(() => {
    setNotesDraft(savedWord.notes ?? '');
  }, [savedWord.notes]);

  const handleNotesChange = (text: string) => {
    setNotesDraft(text);
    clearTimeout(notesTimer.current);
    notesTimer.current = setTimeout(() => {
      updateNotes(savedWord.word, text).catch(() => {});
    }, 600);
  };

  const handleRemoveTag = async (tag: string) => {
    await updateTags(
      savedWord.word,
      savedWord.tags.filter((t) => t !== tag),
    );
  };

  const handleAddTag = async () => {
    const tag = tagInput.trim().toLowerCase().replace(/^#/, '');
    if (!tag || savedWord.tags.includes(tag)) { setTagInput(''); return; }
    await updateTags(savedWord.word, [...savedWord.tags, tag]);
    setTagInput('');
  };

  const handleColToggle = async (colId: number, checked: boolean) => {
    if (checked) await addWordToCollection(savedWord.word, colId);
    else await removeWordFromCollection(savedWord.word, colId);
  };

  // Use persisted SavedWord fields as primary source so API-fetched words display correctly.
  // WORD_DB is consulted only for the commonness badge, which is exclusive to static entries.
  const staticData = WORD_DB[savedWord.word];
  const displayPartOfSpeech = savedWord.partOfSpeech || staticData?.partOfSpeech;
  const displayDefinition = savedWord.definition || staticData?.definition;
  const displayIpa = savedWord.ipa || staticData?.pronunciation;
  const wordCols = collections.filter(
    (c) => c.id !== undefined && wordColIds.includes(c.id),
  );
  const savedDate = new Date(savedWord.savedAt).toLocaleDateString('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <article className="border border-border rounded-xl overflow-hidden bg-background hover:border-border/80 transition-colors">
      {/* Collapsed header */}
      <button
        type="button"
        className="w-full flex items-start gap-4 px-5 py-4 text-left focus-ring rounded-xl"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <Link
              href={`/explore/${encodeURIComponent(savedWord.word)}`}
              className="text-lg font-semibold text-foreground capitalize hover:text-primary transition-colors focus-ring rounded"
              onClick={(e) => e.stopPropagation()}
            >
              {savedWord.word}
            </Link>
            {displayPartOfSpeech && (
              <span className="text-xs text-muted-foreground italic">
                {displayPartOfSpeech}
              </span>
            )}
            {staticData?.commonness && (
              <span
                className={cn(
                  'text-xs px-1.5 py-0.5 rounded-full border font-medium',
                  staticData.commonness === 'very-common' &&
                    'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800',
                  staticData.commonness === 'common' &&
                    'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/30 dark:text-sky-400 dark:border-sky-800',
                  staticData.commonness === 'less-common' &&
                    'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800',
                )}
              >
                {COMMONNESS_LABELS[staticData.commonness]}
              </span>
            )}
          </div>
          {displayDefinition && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2 leading-snug">
              {displayDefinition}
            </p>
          )}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className="text-xs text-muted-foreground">{savedDate}</span>
            {wordCols.map((c) => (
              <span
                key={c.id}
                className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full"
              >
                {c.name}
              </span>
            ))}
            {savedWord.tags.map((t) => (
              <span
                key={t}
                className="text-xs text-primary font-medium"
              >
                #{t}
              </span>
            ))}
          </div>
        </div>
        <span className="shrink-0 text-muted-foreground mt-1" aria-hidden>
          {expanded ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </span>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-border px-5 py-4 space-y-4">
          {/* Full definition */}
          {displayDefinition && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                Definition
              </p>
              <p className="text-sm text-foreground leading-relaxed">{displayDefinition}</p>
              {displayIpa && (
                <p className="text-xs text-muted-foreground mt-1">{displayIpa}</p>
              )}
            </div>
          )}

          {/* Notes */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Personal notes
            </p>
            <textarea
              value={notesDraft}
              onChange={(e) => handleNotesChange(e.target.value)}
              placeholder="Add a personal note…"
              rows={3}
              className={cn(
                'w-full text-sm rounded-lg border border-border bg-background px-3 py-2',
                'resize-y focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
                'text-foreground placeholder:text-muted-foreground',
              )}
              aria-label={`Personal notes for ${savedWord.word}`}
            />
          </div>

          {/* Tags */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Tags
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              {savedWord.tags.map((tag) => (
                <span
                  key={tag}
                  className="flex items-center gap-1 text-xs bg-accent text-accent-foreground px-2 py-1 rounded-full"
                >
                  #{tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="hover:text-destructive transition-colors focus-ring rounded-full"
                    aria-label={`Remove tag ${tag}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              <div className="flex items-center gap-1">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag(); } }}
                  placeholder="#add tag"
                  className="h-7 text-xs w-24"
                  aria-label="Add tag"
                />
                <button
                  type="button"
                  onClick={handleAddTag}
                  className="text-muted-foreground hover:text-foreground focus-ring rounded"
                  aria-label="Confirm add tag"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Collections */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Collections
              </p>
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                className="text-xs text-primary hover:underline focus-ring rounded"
              >
                + Manage
              </button>
            </div>
            {wordCols.length === 0 ? (
              <p className="text-xs text-muted-foreground">Not in any collection.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {wordCols.map((c) => (
                  <span
                    key={c.id}
                    className="flex items-center gap-1 text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded-full"
                  >
                    {c.name}
                    <button
                      type="button"
                      onClick={() => c.id !== undefined && handleColToggle(c.id, false)}
                      className="hover:text-destructive transition-colors focus-ring rounded-full"
                      aria-label={`Remove from ${c.name}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Collection picker dialog */}
          {pickerOpen && (
            <InlineCollectionPicker
              word={savedWord.word}
              collections={collections}
              currentIds={wordColIds}
              onToggle={handleColToggle}
              onClose={() => setPickerOpen(false)}
            />
          )}

          {/* Remove from library */}
          <div className="flex justify-end pt-2 border-t border-border">
            <button
              type="button"
              onClick={() => unsaveWord(savedWord.word)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive transition-colors focus-ring rounded"
              aria-label={`Remove ${savedWord.word} from library`}
            >
              <Trash2 className="w-3.5 h-3.5" />
              Remove from library
            </button>
          </div>
        </div>
      )}
    </article>
  );
}

// ── Inline collection picker (used inside word list item) ─────────────────────

interface InlineCollectionPickerProps {
  word: string;
  collections: Collection[];
  currentIds: number[];
  onToggle: (colId: number, checked: boolean) => void;
  onClose: () => void;
}

function InlineCollectionPicker({
  word,
  collections,
  currentIds,
  onToggle,
  onClose,
}: InlineCollectionPickerProps) {
  const [newName, setNewName] = useState('');

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    const id = await createCollection(name);
    await addWordToCollection(word, id);
    setNewName('');
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-xs">
        <DialogHeader>
          <DialogTitle>Manage collections</DialogTitle>
        </DialogHeader>
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {collections.length === 0 && (
            <p className="text-sm text-muted-foreground py-2">No collections yet.</p>
          )}
          {collections.map((col) => {
            const checked = col.id !== undefined && currentIds.includes(col.id);
            return (
              <label
                key={col.id}
                className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent cursor-pointer text-sm"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) =>
                    col.id !== undefined && onToggle(col.id, e.target.checked)
                  }
                  className="accent-primary"
                />
                {col.name}
              </label>
            );
          })}
        </div>
        <div className="border-t border-border pt-3 flex gap-2">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }}
            placeholder="New collection…"
            className="h-8 text-sm"
          />
          <Button size="sm" onClick={handleCreate}>Add</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Word list view ────────────────────────────────────────────────────────────

function WordList({ words }: { words: SavedWord[] }) {
  if (words.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
        <BookOpen className="w-8 h-8 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">No words here yet.</p>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {words.map((sw) => (
        <WordListItem key={sw.word} savedWord={sw} />
      ))}
    </div>
  );
}

// ── Content pane (picks data by view) ────────────────────────────────────────

function AllWordsContent({ mode }: { mode: 'list' | 'graph' }) {
  const words = useSavedWords();
  if (mode === 'graph') return <LibraryGraph words={words} className="min-h-[400px]" />;
  return <WordList words={words} />;
}

function CollectionContent({ id, mode }: { id: number; mode: 'list' | 'graph' }) {
  const words = useWordsInCollection(id);
  if (mode === 'graph') return <LibraryGraph words={words} className="min-h-[400px]" />;
  return <WordList words={words} />;
}

function TagContent({ tag, mode }: { tag: string; mode: 'list' | 'graph' }) {
  const words = useWordsByTag(tag);
  if (mode === 'graph') return <LibraryGraph words={words} className="min-h-[400px]" />;
  return <WordList words={words} />;
}

// ── Library sidebar ───────────────────────────────────────────────────────────

interface SidebarProps {
  location: string;
  view: LibraryView;
}

function LibrarySidebar({ location, view }: SidebarProps) {
  const allWords = useSavedWords();
  const collections = useCollections();
  const tags = useAllTags();
  const allLinks = useLiveQuery(() => db.wordCollections.toArray()) ?? [];
  const tagCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const w of allWords) for (const t of w.tags) m.set(t, (m.get(t) ?? 0) + 1);
    return m;
  }, [allWords]);
  const colCounts = useMemo(() => {
    const m = new Map<number, number>();
    for (const l of allLinks) m.set(l.collectionId, (m.get(l.collectionId) ?? 0) + 1);
    return m;
  }, [allLinks]);

  const [collectionsOpen, setCollectionsOpen] = useState(true);
  const [tagsOpen, setTagsOpen] = useState(true);
  const [newColInput, setNewColInput] = useState(false);
  const [newColName, setNewColName] = useState('');
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [renameName, setRenameName] = useState('');

  const handleCreateCol = async () => {
    const name = newColName.trim();
    if (!name) { setNewColInput(false); return; }
    await createCollection(name);
    setNewColName('');
    setNewColInput(false);
  };

  const handleRename = async (id: number) => {
    const name = renameName.trim();
    if (name) await renameCollection(id, name);
    setRenamingId(null);
  };

  const handleDelete = async (id: number) => {
    if (confirm('Delete this collection? Words will not be removed.')) {
      await deleteCollection(id);
    }
  };

  const isAllActive = view.type === 'all';

  return (
    <aside className="hidden md:flex flex-col w-52 shrink-0 border-r border-border bg-background sticky top-0 h-screen overflow-y-auto py-4 px-2 gap-1">
      {/* All Words */}
      <Link
        href="/library"
        className={cn(
          'flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors focus-ring',
          isAllActive
            ? 'bg-accent text-accent-foreground'
            : 'text-muted-foreground hover:text-foreground hover:bg-accent/50',
        )}
        aria-current={isAllActive ? 'page' : undefined}
      >
        <span>All Words</span>
        <span className="text-xs opacity-60">{allWords.length}</span>
      </Link>

      {/* Collections */}
      <div className="mt-2">
        <button
          type="button"
          className="flex items-center justify-between w-full px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors focus-ring rounded"
          onClick={() => setCollectionsOpen((v) => !v)}
        >
          <span>Collections</span>
          {collectionsOpen ? (
            <ChevronUp className="w-3 h-3" />
          ) : (
            <ChevronDown className="w-3 h-3" />
          )}
        </button>

        {collectionsOpen && (
          <div className="mt-1 space-y-0.5">
            {collections.map((col) => {
              const isActive =
                view.type === 'collection' && view.id === col.id;
              return (
                <div key={col.id} className="group flex items-center gap-1">
                  {renamingId === col.id ? (
                    <div className="flex-1 flex gap-1 pl-2">
                      <Input
                        value={renameName}
                        onChange={(e) => setRenameName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleRename(col.id!);
                          if (e.key === 'Escape') setRenamingId(null);
                        }}
                        autoFocus
                        className="h-7 text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => handleRename(col.id!)}
                        className="text-muted-foreground hover:text-foreground focus-ring rounded"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <Link
                        href={`/library/collections/${col.id}`}
                        className={cn(
                          'flex-1 flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors focus-ring',
                          isActive
                            ? 'bg-accent text-accent-foreground font-medium'
                            : 'text-muted-foreground hover:text-foreground hover:bg-accent/50',
                        )}
                        aria-current={isActive ? 'page' : undefined}
                      >
                        <span className="truncate">{col.name}</span>
                        <span className="text-xs opacity-60 ml-2 shrink-0">
                          {colCounts.get(col.id!) ?? 0}
                        </span>
                      </Link>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-foreground focus-ring rounded transition-opacity"
                            aria-label={`Options for ${col.name}`}
                          >
                            <MoreHorizontal className="w-3.5 h-3.5" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="text-sm">
                          <DropdownMenuItem
                            onClick={() => {
                              setRenamingId(col.id!);
                              setRenameName(col.name);
                            }}
                          >
                            <Pencil className="w-3.5 h-3.5 mr-2" />
                            Rename
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => col.id !== undefined && handleDelete(col.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </>
                  )}
                </div>
              );
            })}

            {/* New collection */}
            {newColInput ? (
              <div className="flex gap-1 pl-2 pr-1">
                <Input
                  value={newColName}
                  onChange={(e) => setNewColName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateCol();
                    if (e.key === 'Escape') { setNewColInput(false); setNewColName(''); }
                  }}
                  autoFocus
                  placeholder="Collection name"
                  className="h-7 text-xs"
                />
                <button
                  type="button"
                  onClick={handleCreateCol}
                  className="text-muted-foreground hover:text-foreground focus-ring rounded"
                  aria-label="Confirm new collection"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="flex items-center gap-1.5 px-3 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors focus-ring rounded-lg w-full"
                onClick={() => setNewColInput(true)}
              >
                <Plus className="w-3.5 h-3.5" />
                New collection
              </button>
            )}
          </div>
        )}
      </div>

      {/* Tags */}
      <div className="mt-2">
        <button
          type="button"
          className="flex items-center justify-between w-full px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors focus-ring rounded"
          onClick={() => setTagsOpen((v) => !v)}
        >
          <span>Tags</span>
          {tagsOpen ? (
            <ChevronUp className="w-3 h-3" />
          ) : (
            <ChevronDown className="w-3 h-3" />
          )}
        </button>

        {tagsOpen && (
          <div className="mt-1 space-y-0.5">
            {tags.length === 0 && (
              <p className="px-3 py-2 text-xs text-muted-foreground">
                No tags yet.
              </p>
            )}
            {tags.map((tag) => {
              const isActive = view.type === 'tag' && view.tag === tag;
              return (
                <Link
                  key={tag}
                  href={`/library/tags/${encodeURIComponent(tag)}`}
                  className={cn(
                    'flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors focus-ring',
                    isActive
                      ? 'bg-accent text-accent-foreground font-medium'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent/50',
                  )}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <span>#{tag}</span>
                  <span className="text-xs opacity-60">{tagCounts.get(tag) ?? 0}</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
}

// ── Mobile view selector ──────────────────────────────────────────────────────

function MobileViewSelect({ view }: { view: LibraryView }) {
  const collections = useCollections();
  const tags = useAllTags();

  const label =
    view.type === 'all'
      ? 'All Words'
      : view.type === 'collection'
      ? collections.find((c) => c.id === view.id)?.name ?? 'Collection'
      : `#${view.tag}`;

  return (
    <div className="md:hidden flex gap-2 overflow-x-auto px-4 py-2 border-b border-border scrollbar-hide">
      <Link
        href="/library"
        className={cn(
          'shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
          view.type === 'all'
            ? 'bg-primary text-primary-foreground'
            : 'bg-accent text-accent-foreground',
        )}
      >
        All Words
      </Link>
      {collections.map((col) => (
        <Link
          key={col.id}
          href={`/library/collections/${col.id}`}
          className={cn(
            'shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
            view.type === 'collection' && view.id === col.id
              ? 'bg-primary text-primary-foreground'
              : 'bg-accent text-accent-foreground',
          )}
        >
          {col.name}
        </Link>
      ))}
      {tags.map((tag) => (
        <Link
          key={tag}
          href={`/library/tags/${encodeURIComponent(tag)}`}
          className={cn(
            'shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
            view.type === 'tag' && view.tag === tag
              ? 'bg-primary text-primary-foreground'
              : 'bg-accent text-accent-foreground',
          )}
        >
          #{tag}
        </Link>
      ))}
    </div>
  );
}

// ── Library page ──────────────────────────────────────────────────────────────

export default function LibraryPage() {
  const [location] = useLocation();
  const [viewMode, setViewMode] = useState<'list' | 'graph'>('list');
  const collections = useCollections();

  const view = useMemo(() => parseView(location), [location]);

  const viewTitle = useMemo(() => {
    if (view.type === 'all') return 'All Words';
    if (view.type === 'tag') return `#${view.tag}`;
    const col = collections.find((c) => c.id === view.id);
    return col?.name ?? 'Collection';
  }, [view, collections]);

  return (
    <div className="flex min-h-screen">
      {/* File-explorer sidebar (desktop only) */}
      <LibrarySidebar location={location} view={view} />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile view selector */}
        <MobileViewSelect view={view} />

        {/* Header */}
        <header className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-border bg-background/90 backdrop-blur-sm">
          <h1 className="text-lg font-semibold text-foreground">{viewTitle}</h1>
          {/* List / Graph toggle */}
          <div
            className="flex items-center border border-border rounded-lg overflow-hidden"
            role="group"
            aria-label="View mode"
          >
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors focus-ring',
                viewMode === 'list'
                  ? 'bg-accent text-accent-foreground font-medium'
                  : 'text-muted-foreground hover:text-foreground',
              )}
              aria-pressed={viewMode === 'list'}
            >
              <List className="w-4 h-4" aria-hidden />
              List
            </button>
            <button
              type="button"
              onClick={() => setViewMode('graph')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors border-l border-border focus-ring',
                viewMode === 'graph'
                  ? 'bg-accent text-accent-foreground font-medium'
                  : 'text-muted-foreground hover:text-foreground',
              )}
              aria-pressed={viewMode === 'graph'}
            >
              <Network className="w-4 h-4" aria-hidden />
              Graph
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 px-6 py-6">
          {view.type === 'all' && <AllWordsContent mode={viewMode} />}
          {view.type === 'collection' && (
            <CollectionContent id={view.id} mode={viewMode} />
          )}
          {view.type === 'tag' && (
            <TagContent tag={view.tag} mode={viewMode} />
          )}
        </main>
      </div>
    </div>
  );
}
