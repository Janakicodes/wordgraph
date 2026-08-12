import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useLocation, Link } from 'wouter';
import {
  Bookmark,
  BookmarkCheck,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  ChevronRight,
  Loader2,
  SearchX,
} from 'lucide-react';
import { Button } from '@workspace/wordgraph-design-system/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@workspace/wordgraph-design-system/components/ui/dialog';
import { Input } from '@workspace/wordgraph-design-system/components/ui/input';
import {
  ToastAction,
} from '@workspace/wordgraph-design-system/components/ui/toast';
import { useToast } from '@workspace/wordgraph-design-system/hooks/use-toast';
import { cn } from '@workspace/wordgraph-design-system/lib/utils';
import { WordGraph } from '@/components/graph/WordGraph';
import {
  addRecentWord,
  COMMONNESS_LABELS,
  type WordData,
} from '@/data/words';
import { lookupWord, buildGraphDataFromWordData, type LookupResult } from '@/lib/dictionary';
import {
  useIsSaved,
  useCollections,
  useWordCollectionIds,
  saveWord,
  unsaveWord,
  createCollection,
  addWordToCollection,
  removeWordFromCollection,
  updateSessionPath,
  getSessionPath,
} from '@/hooks/use-library';

// ── Collection picker dialog ──────────────────────────────────────────────────

interface CollectionPickerProps {
  word: string;
  open: boolean;
  onClose: () => void;
}

function CollectionPickerDialog({ word, open, onClose }: CollectionPickerProps) {
  const collections = useCollections();
  const currentIds = useWordCollectionIds(word);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && newName === '') setError('');
  }, [open, newName]);

  const handleToggle = async (collectionId: number, isChecked: boolean) => {
    if (isChecked) {
      await addWordToCollection(word, collectionId);
    } else {
      await removeWordFromCollection(word, collectionId);
    }
  };

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) { setError('Enter a collection name'); return; }
    setCreating(true);
    try {
      const id = await createCollection(name);
      await addWordToCollection(word, id);
      setNewName('');
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Add to collection</DialogTitle>
          <DialogDescription>
            Organise &ldquo;{word}&rdquo; into your collections.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
          {collections.length === 0 && (
            <p className="text-sm text-muted-foreground py-2">
              No collections yet — create one below.
            </p>
          )}
          {collections.map((col) => {
            const checked = col.id !== undefined && currentIds.includes(col.id);
            return (
              <label
                key={col.id}
                className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-accent cursor-pointer text-sm"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) =>
                    col.id !== undefined && handleToggle(col.id, e.target.checked)
                  }
                  className="accent-primary"
                  aria-label={`Add to ${col.name}`}
                />
                {col.name}
              </label>
            );
          })}
        </div>

        {/* New collection */}
        <div className="border-t border-border pt-3">
          <p className="text-xs text-muted-foreground mb-2">New collection</p>
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={newName}
              onChange={(e) => { setNewName(e.target.value); setError(''); }}
              placeholder="Collection name"
              className="h-8 text-sm"
              onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }}
            />
            <Button size="sm" onClick={handleCreate} disabled={creating}>
              Create
            </Button>
          </div>
          {error && <p className="text-xs text-destructive mt-1">{error}</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Collapsible section ───────────────────────────────────────────────────────

interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function CollapsibleSection({
  title,
  children,
  defaultOpen = false,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const id = `section-${title.toLowerCase().replace(/\s+/g, '-')}`;

  return (
    <div className="border-t border-border">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={id}
        className={cn(
          'w-full flex items-center justify-between py-4 px-0',
          'text-sm font-medium text-foreground',
          'hover:text-primary transition-colors focus-ring rounded',
        )}
      >
        {title}
        {open ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" aria-hidden />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" aria-hidden />
        )}
      </button>
      {open && (
        <div
          id={id}
          className="pb-4 text-sm text-muted-foreground leading-relaxed"
        >
          {children}
        </div>
      )}
    </div>
  );
}

// ── Word info panel ───────────────────────────────────────────────────────────

type LookupState =
  | { status: 'loading' }
  | { status: 'found'; data: WordData }
  | { status: 'not-found' }
  | { status: 'error'; reason?: string };

interface WordInfoProps {
  word: string;
  lookupState: LookupState;
}

function WordInfoPanel({ word, lookupState }: WordInfoProps) {
  const { toast } = useToast();
  const isSaved = useIsSaved(word);
  const [pickerOpen, setPickerOpen] = useState(false);

  const handleSaveToggle = async () => {
    if (isSaved) {
      await unsaveWord(word);
    } else {
      await saveWord(word);
      toast({
        title: 'Saved ✓',
        description: `"${word}" added to your library.`,
        action: (
          <ToastAction
            altText="Add to collection"
            onClick={() => setPickerOpen(true)}
          >
            Add to collection
          </ToastAction>
        ),
      });
    }
  };

  // Loading state
  if (lookupState.status === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-12 text-muted-foreground">
        <Loader2 className="w-6 h-6 animate-spin" aria-hidden />
        <p className="text-sm">Looking up &ldquo;{word}&rdquo;&hellip;</p>
      </div>
    );
  }

  // Not found state
  if (lookupState.status === 'not-found') {
    return (
      <div className="flex flex-col items-start gap-3 py-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          <SearchX className="w-5 h-5 shrink-0" aria-hidden />
          <h1 className="text-lg font-semibold text-foreground capitalize">
            {word}
          </h1>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          We couldn&rsquo;t find &ldquo;{word}&rdquo; in the dictionary. Double-check
          the spelling, or try a different word.
        </p>
        <Link
          href="/"
          className="text-sm text-primary hover:underline focus-ring rounded"
        >
          ← Search for another word
        </Link>
      </div>
    );
  }

  // Network / transient error
  if (lookupState.status === 'error') {
    return (
      <div className="flex flex-col items-start gap-3 py-6">
        <h1 className="text-lg font-semibold text-foreground capitalize">{word}</h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Something went wrong while looking up this word. Check your connection
          and try refreshing the page.
        </p>
        <Link
          href="/"
          className="text-sm text-primary hover:underline focus-ring rounded"
        >
          ← Back to search
        </Link>
      </div>
    );
  }

  const data = lookupState.data;

  return (
    <>
      <CollectionPickerDialog
        word={word}
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
      />

      <div className="space-y-0">
        {/* Header row */}
        <div className="flex items-start justify-between gap-4 pb-4">
          <div>
            <h1
              className="text-3xl font-bold tracking-tight text-foreground capitalize leading-tight"
              aria-live="polite"
            >
              {data.word}
            </h1>
            <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
              <span className="italic">{data.partOfSpeech}</span>
              {data.pronunciation && (
                <span aria-label={`Pronunciation: ${data.pronunciation}`}>
                  {data.pronunciation}
                </span>
              )}
            </div>
            {/* Commonness indicator — only shown for static words */}
            {data.commonness && (
              <span
                className={cn(
                  'inline-block mt-2 text-xs font-medium px-2 py-0.5 rounded-full border',
                  data.commonness === 'very-common' &&
                    'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800',
                  data.commonness === 'common' &&
                    'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/30 dark:text-sky-400 dark:border-sky-800',
                  data.commonness === 'less-common' &&
                    'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800',
                )}
              >
                {COMMONNESS_LABELS[data.commonness]}
              </span>
            )}
          </div>

          <Button
            variant={isSaved ? 'default' : 'outline'}
            size="sm"
            onClick={handleSaveToggle}
            aria-label={
              isSaved
                ? `Remove ${data.word} from library`
                : `Save ${data.word} to library`
            }
            aria-pressed={isSaved}
            className="shrink-0 gap-2"
          >
            {isSaved ? (
              <BookmarkCheck className="w-4 h-4" aria-hidden />
            ) : (
              <Bookmark className="w-4 h-4" aria-hidden />
            )}
            {isSaved ? 'Saved' : 'Save'}
          </Button>
        </div>

        {/* Primary definition */}
        <p className="text-base text-foreground leading-relaxed pb-4 border-t border-border pt-4">
          {data.definition}
        </p>

        {/* Collapsible sections */}
        {data.examples && (data.examples[0] || data.examples[1]) && (
          <CollapsibleSection title="Examples">
            <ol className="list-decimal list-inside space-y-2 pl-1">
              {data.examples.filter(Boolean).map((ex, i) => (
                <li key={i}>{ex}</li>
              ))}
            </ol>
          </CollapsibleSection>
        )}

        {data.memoryTrick && (
          <CollapsibleSection title="Memory Trick">
            <p>{data.memoryTrick}</p>
          </CollapsibleSection>
        )}

        {data.usage && (
          <CollapsibleSection title="Usage">
            <p>{data.usage}</p>
          </CollapsibleSection>
        )}
      </div>
    </>
  );
}

// ── Exploration breadcrumb ────────────────────────────────────────────────────

interface BreadcrumbProps {
  path: string[];
  currentWord: string;
}

function ExplorationBreadcrumb({ path, currentWord }: BreadcrumbProps) {
  if (path.length <= 1) return null;

  return (
    <nav
      aria-label="Exploration path"
      className="flex items-center gap-1 flex-wrap px-6 lg:px-10 py-2.5 border-b border-border/50 bg-muted/30 text-xs text-muted-foreground overflow-x-auto"
    >
      {path.map((step, idx) => {
        const isLast = idx === path.length - 1;
        const isCurrent = step === currentWord;
        return (
          <span key={`${step}-${idx}`} className="flex items-center gap-1 shrink-0">
            {isLast || isCurrent ? (
              <span
                className={cn(
                  'font-medium capitalize',
                  isCurrent ? 'text-foreground' : 'text-muted-foreground',
                )}
                aria-current={isCurrent ? 'page' : undefined}
              >
                {step}
              </span>
            ) : (
              <Link
                href={`/explore/${encodeURIComponent(step)}`}
                className="capitalize hover:text-foreground transition-colors focus-ring rounded"
              >
                {step}
              </Link>
            )}
            {!isLast && (
              <ChevronRight className="w-3 h-3 shrink-0" aria-hidden />
            )}
          </span>
        );
      })}
    </nav>
  );
}

// ── Explore page ──────────────────────────────────────────────────────────────

export default function ExplorePage() {
  const params = useParams<{ word?: string }>();
  const [, navigate] = useLocation();

  const word = params.word
    ? decodeURIComponent(params.word).toLowerCase()
    : 'pragmatic';

  const [sessionPath, setSessionPath] = useState<string[]>(() => getSessionPath());
  const [lookupState, setLookupState] = useState<LookupState>({ status: 'loading' });

  // Fetch word data whenever the word changes
  useEffect(() => {
    let cancelled = false;
    setLookupState({ status: 'loading' });

    lookupWord(word).then((result) => {
      if (cancelled) return;
      if (result.kind === 'found') {
        setLookupState({ status: 'found', data: result.data });
      } else if (result.kind === 'not-found') {
        setLookupState({ status: 'not-found' });
      } else {
        setLookupState({ status: 'error', reason: result.reason });
      }
    }).catch((err) => {
      if (!cancelled) setLookupState({ status: 'error', reason: String(err) });
    });

    return () => { cancelled = true; };
  }, [word]);

  // Record in history and update session path whenever we land on a word
  useEffect(() => {
    addRecentWord(word);
    setSessionPath(updateSessionPath(word));
  }, [word]);

  const graphData =
    lookupState.status === 'found'
      ? buildGraphDataFromWordData(word, lookupState.data)
      : { centre: word, nodes: [] };

  const handleBack = useCallback(() => {
    navigate('/');
  }, [navigate]);

  return (
    <div className="flex flex-col h-full min-h-screen">
      {/* Mobile back button */}
      <div className="md:hidden flex items-center px-4 pt-4 pb-2">
        <button
          type="button"
          onClick={handleBack}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors focus-ring rounded"
          aria-label="Go back to home"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden />
          Home
        </button>
      </div>

      {/* Exploration breadcrumb */}
      <ExplorationBreadcrumb path={sessionPath} currentWord={word} />

      {/* Desktop layout: graph left-dominant, panel right */}
      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Graph region — ≥70% on desktop */}
        <section
          aria-label="Word relationship graph"
          className="lg:flex-[7] flex items-center justify-center p-6 lg:p-10 min-h-[360px] lg:min-h-[calc(100vh-3rem)]"
        >
          <WordGraph data={graphData} className="w-full" />
        </section>

        {/* Divider */}
        <div className="hidden lg:block w-px bg-border self-stretch" aria-hidden />
        <div className="lg:hidden border-t border-border mx-6" aria-hidden />

        {/* Word info panel — ≤30% on desktop */}
        <aside
          aria-label="Word information"
          className="lg:flex-[3] lg:max-w-sm px-6 lg:px-8 py-6 lg:py-10 lg:overflow-y-auto"
        >
          <WordInfoPanel word={word} lookupState={lookupState} />
        </aside>
      </div>
    </div>
  );
}
