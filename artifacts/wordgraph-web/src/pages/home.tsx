import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Search, ArrowRight, Clock } from 'lucide-react';
import { Button } from '@workspace/wordgraph-design-system/components/ui/button';
import { Input } from '@workspace/wordgraph-design-system/components/ui/input';
import { cn } from '@workspace/wordgraph-design-system/lib/utils';
import { SUGGESTION_WORDS, getRecentWords } from '@/data/words';

export default function HomePage() {
  const [, navigate] = useLocation();
  const [query, setQuery] = useState('');
  const [recentWords, setRecentWords] = useState<string[]>([]);

  useEffect(() => {
    setRecentWords(getRecentWords().slice(0, 5));
  }, []);

  const handleSearch = (word: string) => {
    const trimmed = word.trim();
    if (!trimmed) return;
    navigate(`/explore/${encodeURIComponent(trimmed.toLowerCase())}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch(query);
  };

  const lastWord = recentWords[0];

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero section */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 py-16 md:py-24">
        {/* Wordmark */}
        <div className="mb-10 text-center">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-3">
            What word are you{' '}
            <span className="text-primary">curious about?</span>
          </h1>
          <p className="text-muted-foreground text-base md:text-lg max-w-md mx-auto">
            Explore words through meaning, synonyms, antonyms, and connections.
          </p>
        </div>

        {/* Search form */}
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-lg flex gap-2"
          role="search"
          aria-label="Word search"
        >
          <div className="relative flex-1">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none"
              aria-hidden
            />
            <Input
              type="search"
              placeholder="Enter any word…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10 h-12 text-base"
              aria-label="Search for a word"
              autoFocus
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
            />
          </div>
          <Button
            type="submit"
            size="lg"
            disabled={!query.trim()}
            aria-label="Explore this word"
            className="h-12 px-5"
          >
            <ArrowRight className="w-4 h-4" aria-hidden />
            <span className="sr-only">Explore</span>
          </Button>
        </form>

        {/* Suggestion chips */}
        <div
          className="flex flex-wrap items-center gap-2 mt-5 text-sm"
          role="list"
          aria-label="Example words to explore"
        >
          <span className="text-muted-foreground">Try:</span>
          {SUGGESTION_WORDS.map((word) => (
            <button
              key={word}
              type="button"
              role="listitem"
              onClick={() => handleSearch(word)}
              className={cn(
                'px-3 py-1 rounded-full border border-border',
                'text-sm text-muted-foreground hover:text-foreground hover:border-foreground/30',
                'hover:bg-accent/50 transition-colors focus-ring',
              )}
              aria-label={`Explore the word ${word}`}
            >
              {word}
            </button>
          ))}
        </div>

        {/* Continue exploring */}
        {lastWord && (
          <div className="mt-8 text-center">
            <p className="text-sm text-muted-foreground mb-2">
              Continue exploring
            </p>
            <button
              type="button"
              onClick={() => handleSearch(lastWord)}
              className={cn(
                'inline-flex items-center gap-1.5 text-sm font-medium',
                'text-foreground hover:text-primary transition-colors',
                'focus-ring rounded px-1',
              )}
              aria-label={`Continue exploring: ${lastWord}`}
            >
              <ArrowRight className="w-3.5 h-3.5" aria-hidden />
              {lastWord}
            </button>
          </div>
        )}
      </section>

      {/* Recent words */}
      {recentWords.length > 0 && (
        <section
          className="border-t border-border px-6 py-8 max-w-lg mx-auto w-full"
          aria-label="Recently explored words"
        >
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-muted-foreground" aria-hidden />
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Recently explored
            </h2>
          </div>
          <ul className="flex flex-wrap gap-2">
            {recentWords.map((word) => (
              <li key={word}>
                <button
                  type="button"
                  onClick={() => handleSearch(word)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-sm',
                    'bg-muted text-muted-foreground hover:text-foreground',
                    'hover:bg-accent transition-colors focus-ring capitalize',
                  )}
                  aria-label={`Explore ${word} again`}
                >
                  {word}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
