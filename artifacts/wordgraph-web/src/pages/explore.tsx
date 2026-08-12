import { useState, useEffect, useCallback } from 'react';
import { useParams, useLocation } from 'wouter';
import { Bookmark, BookmarkCheck, ChevronDown, ChevronUp, ArrowLeft } from 'lucide-react';
import { Button } from '@workspace/wordgraph-design-system/components/ui/button';
import { cn } from '@workspace/wordgraph-design-system/lib/utils';
import { WordGraph } from '@/components/graph/WordGraph';
import {
  buildGraphData,
  WORD_DB,
  addRecentWord,
  isWordSaved,
  toggleSavedWord,
} from '@/data/words';

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
        <div id={id} className="pb-4 text-sm text-muted-foreground leading-relaxed">
          {children}
        </div>
      )}
    </div>
  );
}

// ── Word info panel ───────────────────────────────────────────────────────────

interface WordInfoProps {
  word: string;
}

function WordInfoPanel({ word }: WordInfoProps) {
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSaved(isWordSaved(word));
  }, [word]);

  const handleSaveToggle = () => {
    const nowSaved = toggleSavedWord(word);
    setSaved(nowSaved);
  };

  const data = WORD_DB[word.toLowerCase()];

  if (!data) {
    return (
      <div className="text-sm text-muted-foreground py-4">
        No detailed information available for &ldquo;{word}&rdquo;.
      </div>
    );
  }

  return (
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
            <span aria-label={`Pronunciation: ${data.pronunciation}`}>
              {data.pronunciation}
            </span>
          </div>
        </div>

        <Button
          variant={saved ? 'default' : 'outline'}
          size="sm"
          onClick={handleSaveToggle}
          aria-label={saved ? `Remove ${data.word} from library` : `Save ${data.word} to library`}
          aria-pressed={saved}
          className="shrink-0 gap-2"
        >
          {saved ? (
            <BookmarkCheck className="w-4 h-4" aria-hidden />
          ) : (
            <Bookmark className="w-4 h-4" aria-hidden />
          )}
          {saved ? 'Saved' : 'Save'}
        </Button>
      </div>

      {/* Primary definition */}
      <p className="text-base text-foreground leading-relaxed pb-4 border-t border-border pt-4">
        {data.definition}
      </p>

      {/* Collapsible sections */}
      <CollapsibleSection title="Examples">
        <ol className="list-decimal list-inside space-y-2 pl-1">
          {data.examples.map((ex, i) => (
            <li key={i}>{ex}</li>
          ))}
        </ol>
      </CollapsibleSection>

      <CollapsibleSection title="Memory Trick">
        <p>{data.memoryTrick}</p>
      </CollapsibleSection>

      <CollapsibleSection title="Usage">
        <p>{data.usage}</p>
      </CollapsibleSection>
    </div>
  );
}

// ── Explore page ──────────────────────────────────────────────────────────────

export default function ExplorePage() {
  const params = useParams<{ word?: string }>();
  const [, navigate] = useLocation();

  const word = params.word
    ? decodeURIComponent(params.word).toLowerCase()
    : 'pragmatic';

  // Record in history whenever we land on a word
  useEffect(() => {
    addRecentWord(word);
  }, [word]);

  const graphData = buildGraphData(word);

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

      {/* Desktop layout: graph left-dominant, panel right */}
      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Graph region — ≥70% on desktop */}
        <section
          aria-label="Word relationship graph"
          className="lg:flex-[7] flex items-center justify-center p-6 lg:p-10 min-h-[360px] lg:min-h-screen"
        >
          <WordGraph
            data={graphData}
            className="w-full"
          />
        </section>

        {/* Divider */}
        <div className="hidden lg:block w-px bg-border self-stretch" aria-hidden />
        <div className="lg:hidden border-t border-border mx-6" aria-hidden />

        {/* Word info panel — ≤30% on desktop */}
        <aside
          aria-label="Word information"
          className="lg:flex-[3] lg:max-w-sm px-6 lg:px-8 py-6 lg:py-10 lg:overflow-y-auto"
        >
          <WordInfoPanel word={word} />
        </aside>
      </div>
    </div>
  );
}
