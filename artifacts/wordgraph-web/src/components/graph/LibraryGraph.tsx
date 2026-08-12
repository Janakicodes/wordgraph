// Personal vocabulary graph — shows saved words as nodes with relationship edges.
// Visual style mirrors the explore WordGraph (typographic nodes, colour-coded edges).

import { useMemo } from 'react';
import { useLocation } from 'wouter';
import { cn } from '@workspace/wordgraph-design-system/lib/utils';
import { WORD_DB } from '@/data/words';
import type { SavedWord } from '@/lib/db';

interface LibraryGraphProps {
  words: SavedWord[];
  className?: string;
}

interface Edge {
  from: string;
  to: string;
  type: 'synonym' | 'antonym' | 'related';
}

interface Node {
  word: string;
  x: number;
  y: number;
}

// Derive relationship edges between saved words using WORD_DB
function computeEdges(words: SavedWord[]): Edge[] {
  const wordSet = new Set(words.map((w) => w.word));
  const edges: Edge[] = [];
  const seen = new Set<string>();

  for (const { word } of words) {
    const data = WORD_DB[word];
    if (!data) continue;

    const add = (target: string, type: Edge['type']) => {
      if (!wordSet.has(target)) return;
      const key = [word, target].sort().join(':');
      if (seen.has(key)) return;
      seen.add(key);
      edges.push({ from: word, to: target, type });
    };

    for (const w of data.synonyms) add(w, 'synonym');
    for (const w of data.antonyms) add(w, 'antonym');
    for (const w of data.related) add(w, 'related');
  }

  return edges;
}

// Layout: spread nodes over a circle (or nested rings for many words)
function computeLayout(words: SavedWord[], W: number, H: number): Node[] {
  const n = words.length;
  if (n === 0) return [];
  const cx = W / 2;
  const cy = H / 2;

  if (n === 1) return [{ word: words[0].word, x: cx, y: cy }];

  // Two rings for more than 8 nodes
  if (n <= 8) {
    const R = Math.min(W, H) * 0.38;
    return words.map((w, i) => ({
      word: w.word,
      x: cx + R * Math.cos((2 * Math.PI * i) / n - Math.PI / 2),
      y: cy + R * Math.sin((2 * Math.PI * i) / n - Math.PI / 2),
    }));
  }

  // Inner ring: 7 nodes, outer ring: rest
  const inner = words.slice(0, 7);
  const outer = words.slice(7);
  const R1 = Math.min(W, H) * 0.24;
  const R2 = Math.min(W, H) * 0.42;

  const innerNodes: Node[] = inner.map((w, i) => ({
    word: w.word,
    x: cx + R1 * Math.cos((2 * Math.PI * i) / inner.length - Math.PI / 2),
    y: cy + R1 * Math.sin((2 * Math.PI * i) / inner.length - Math.PI / 2),
  }));

  const outerNodes: Node[] = outer.map((w, i) => ({
    word: w.word,
    x: cx + R2 * Math.cos((2 * Math.PI * i) / outer.length - Math.PI / 2),
    y: cy + R2 * Math.sin((2 * Math.PI * i) / outer.length - Math.PI / 2),
  }));

  return [...innerNodes, ...outerNodes];
}

const EDGE_COLORS: Record<Edge['type'], string> = {
  synonym: '#22c55e',   // green-500
  antonym: '#f87171',   // red-400
  related: '#60a5fa',   // blue-400
};

const EDGE_LABELS: Record<Edge['type'], string> = {
  synonym: 'synonym',
  antonym: 'antonym',
  related: 'related',
};

export function LibraryGraph({ words, className }: LibraryGraphProps) {
  const [, navigate] = useLocation();
  const W = 800;
  const H = 560;

  const nodes = useMemo(() => computeLayout(words, W, H), [words]);
  const edges = useMemo(() => computeEdges(words), [words]);
  const posMap = useMemo(() => {
    const m = new Map<string, { x: number; y: number }>();
    for (const n of nodes) m.set(n.word, { x: n.x, y: n.y });
    return m;
  }, [nodes]);

  if (words.length === 0) {
    return (
      <div className={cn('flex items-center justify-center text-muted-foreground text-sm', className)}>
        Save words to see your vocabulary graph
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto"
        role="img"
        aria-label="Personal vocabulary relationship graph"
      >
        {/* Edges */}
        {edges.map((edge, i) => {
          const from = posMap.get(edge.from);
          const to = posMap.get(edge.to);
          if (!from || !to) return null;
          return (
            <line
              key={i}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke={EDGE_COLORS[edge.type]}
              strokeWidth={1.5}
              strokeOpacity={0.45}
              strokeLinecap="round"
            />
          );
        })}

        {/* Nodes */}
        {nodes.map(({ word, x, y }) => (
          <g
            key={word}
            className="cursor-pointer"
            onClick={() => navigate(`/explore/${encodeURIComponent(word)}`)}
            role="button"
            tabIndex={0}
            aria-label={`Explore ${word}`}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                navigate(`/explore/${encodeURIComponent(word)}`);
              }
            }}
          >
            {/* Background pill */}
            <rect
              x={x - 44}
              y={y - 18}
              width={88}
              height={36}
              rx={18}
              fill="hsl(var(--accent))"
              className="transition-all"
            />
            {/* Word label */}
            <text
              x={x}
              y={y + 1}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={11}
              fontWeight={600}
              fontFamily="inherit"
              fill="hsl(var(--accent-foreground))"
              style={{ pointerEvents: 'none', userSelect: 'none' }}
            >
              {word.length > 11 ? word.slice(0, 10) + '…' : word}
            </text>
          </g>
        ))}
      </svg>

      {/* Legend */}
      {edges.length > 0 && (
        <div className="flex items-center gap-4 justify-center flex-wrap text-xs text-muted-foreground">
          {(Object.entries(EDGE_COLORS) as [Edge['type'], string][]).map(
            ([type, color]) => (
              <span key={type} className="flex items-center gap-1.5">
                <span
                  className="inline-block w-4 h-0.5 rounded"
                  style={{ backgroundColor: color }}
                  aria-hidden
                />
                {EDGE_LABELS[type]}
              </span>
            ),
          )}
        </div>
      )}
    </div>
  );
}
