// SearchSuggestions — dropdown of word completions rendered below the search input.
// Keyboard: ArrowUp/Down to navigate, Enter to select, Escape to close.
// Closes on outside click via onBlur with a short delay.

import { useRef, useEffect } from 'react';
import { cn } from '@workspace/wordgraph-design-system/lib/utils';

interface SearchSuggestionsProps {
  id?: string;
  suggestions: string[];
  activeIndex: number;
  onSelect: (word: string) => void;
  onActiveIndexChange: (index: number) => void;
  query: string;
}

export function SearchSuggestions({
  id,
  suggestions,
  activeIndex,
  onSelect,
  onActiveIndexChange,
  query,
}: SearchSuggestionsProps) {
  const listRef = useRef<HTMLUListElement>(null);

  // Scroll active item into view
  useEffect(() => {
    if (!listRef.current) return;
    const active = listRef.current.querySelector<HTMLLIElement>(
      `[data-active="true"]`,
    );
    active?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  if (suggestions.length === 0) return null;

  return (
    <ul
      ref={listRef}
      id={id}
      role="listbox"
      aria-label="Word suggestions"
      className={cn(
        'absolute top-full left-0 right-0 z-50 mt-1',
        'bg-popover border border-border rounded-lg shadow-md',
        'py-1 max-h-56 overflow-y-auto',
      )}
    >
      {suggestions.map((word, index) => {
        const isActive = index === activeIndex;
        // Highlight the matching portion of the word
        const q = query.toLowerCase();
        const matchIdx = word.toLowerCase().indexOf(q);

        let label: React.ReactNode = word;
        if (matchIdx !== -1) {
          label = (
            <>
              {word.slice(0, matchIdx)}
              <span className="font-semibold text-foreground">
                {word.slice(matchIdx, matchIdx + q.length)}
              </span>
              {word.slice(matchIdx + q.length)}
            </>
          );
        }

        return (
          <li
            key={word}
            id={`suggestion-${index}`}
            role="option"
            aria-selected={isActive}
            data-active={isActive}
            onMouseEnter={() => onActiveIndexChange(index)}
            onMouseDown={(e) => {
              // Prevent input blur before we handle the click
              e.preventDefault();
              onSelect(word);
            }}
            className={cn(
              'flex items-center px-3 py-2 cursor-pointer text-sm text-muted-foreground',
              'transition-colors select-none',
              isActive
                ? 'bg-accent text-foreground'
                : 'hover:bg-accent/50 hover:text-foreground',
            )}
          >
            {label}
          </li>
        );
      })}
    </ul>
  );
}
