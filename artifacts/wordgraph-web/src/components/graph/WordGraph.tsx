import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'wouter';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@workspace/wordgraph-design-system/lib/utils';
import type { GraphData, RelationshipType } from '@/data/words';

// ── Types ─────────────────────────────────────────────────────────────────────

interface LayoutNode {
  word: string;
  type: RelationshipType;
  x: number;
  y: number;
}

interface WordGraphProps {
  data: GraphData;
  className?: string;
}

// ── Layout algorithm ──────────────────────────────────────────────────────────

const VIEWBOX = { w: 600, h: 480, cx: 300, cy: 220 };

function layoutNodes(data: GraphData): LayoutNode[] {
  // Arrange: synonyms top, related right+bottom, antonyms left-bottom
  const synonyms = data.nodes.filter((n) => n.type === 'synonym');
  const antonyms = data.nodes.filter((n) => n.type === 'antonym');
  const related = data.nodes.filter((n) => n.type === 'related');

  const positioned: LayoutNode[] = [];

  function place(
    nodes: typeof data.nodes,
    startDeg: number,
    endDeg: number,
    radius: number,
  ) {
    const count = nodes.length;
    if (count === 0) return;
    const step = count === 1 ? 0 : (endDeg - startDeg) / (count - 1);
    nodes.forEach((node, i) => {
      const deg = startDeg + i * step;
      const rad = (deg * Math.PI) / 180;
      positioned.push({
        word: node.word,
        type: node.type,
        x: Math.round(VIEWBOX.cx + radius * Math.cos(rad)),
        y: Math.round(VIEWBOX.cy + radius * Math.sin(rad)),
      });
    });
  }

  // Top arc: synonyms from -150° to -30° (top half)
  place(synonyms, -150, -30, 170);
  // Right arc: related from -20° to 100° (right side)
  place(related, -20, 100, 185);
  // Bottom-left: antonyms from 120° to 200°
  place(antonyms, 120, 200, 175);

  return positioned;
}

// ── Color helpers ─────────────────────────────────────────────────────────────

function typeColor(type: RelationshipType): string {
  switch (type) {
    case 'synonym':
      return 'var(--graph-synonym)';
    case 'antonym':
      return 'var(--graph-antonym)';
    case 'related':
      return 'var(--graph-related)';
  }
}

function typeLabel(type: RelationshipType): string {
  switch (type) {
    case 'synonym':
      return 'synonym';
    case 'antonym':
      return 'antonym';
    case 'related':
      return 'related word';
  }
}

// ── Graph node ────────────────────────────────────────────────────────────────

interface GraphNodeProps {
  node: LayoutNode;
  centreWord: string;
  onClick: (word: string) => void;
}

function GraphNode({ node, centreWord, onClick }: GraphNodeProps) {
  const shouldReduceMotion = useReducedMotion();
  const color = typeColor(node.type);
  const label = `${node.word} — ${typeLabel(node.type)} of ${centreWord}`;

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick(node.word);
    }
  };

  return (
    <motion.g
      role="button"
      tabIndex={0}
      aria-label={label}
      onClick={() => onClick(node.word)}
      onKeyDown={handleKey}
      initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
      transition={
        shouldReduceMotion
          ? { duration: 0 }
          : { duration: 0.4, ease: [0.22, 1, 0.36, 1] }
      }
      style={{ cursor: 'pointer', outline: 'none' }}
    >
      {/* Invisible hit area */}
      <rect
        x={node.x - 48}
        y={node.y - 16}
        width={96}
        height={32}
        fill="transparent"
        rx={4}
      />
      <text
        x={node.x}
        y={node.y}
        textAnchor="middle"
        dominantBaseline="middle"
        fill={color}
        fontSize={13}
        fontWeight={500}
        fontFamily="var(--font-sans)"
        letterSpacing="0.01em"
        style={{ textTransform: 'capitalize', userSelect: 'none' }}
      >
        {node.word}
      </text>
    </motion.g>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function WordGraph({ data, className }: WordGraphProps) {
  const [, navigate] = useLocation();
  const shouldReduceMotion = useReducedMotion();
  const svgRef = useRef<SVGSVGElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const panStart = useRef<{ mx: number; my: number; px: number; py: number } | null>(null);

  const nodes = layoutNodes(data);

  const handleNodeClick = useCallback(
    (word: string) => {
      navigate(`/explore/${encodeURIComponent(word.toLowerCase())}`);
    },
    [navigate],
  );

  const resetPan = () => setPan({ x: 0, y: 0 });

  // Mouse pan handlers
  const onMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    // Only start pan if clicking on the SVG background
    if ((e.target as Element).tagName === 'svg' || (e.target as Element).tagName === 'line') {
      setIsPanning(true);
      panStart.current = { mx: e.clientX, my: e.clientY, px: pan.x, py: pan.y };
    }
  };

  const onMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!isPanning || !panStart.current) return;
    setPan({
      x: panStart.current.px + (e.clientX - panStart.current.mx),
      y: panStart.current.py + (e.clientY - panStart.current.my),
    });
  };

  const onMouseUp = () => {
    setIsPanning(false);
    panStart.current = null;
  };

  useEffect(() => {
    window.addEventListener('mouseup', onMouseUp);
    return () => window.removeEventListener('mouseup', onMouseUp);
  });

  const hasPanned = pan.x !== 0 || pan.y !== 0;

  return (
    <div className={cn('relative flex flex-col items-center gap-3', className)}>
      {/* Graph SVG */}
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VIEWBOX.w} ${VIEWBOX.h}`}
        aria-label={`Word graph for ${data.centre}`}
        role="img"
        className="w-full max-w-2xl select-none"
        style={{ cursor: isPanning ? 'grabbing' : 'grab', touchAction: 'none' }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
      >
        <g transform={`translate(${pan.x}, ${pan.y})`}>
          {/* Edges */}
          {nodes.map((node) => (
            <line
              key={`edge-${node.word}`}
              x1={VIEWBOX.cx}
              y1={VIEWBOX.cy}
              x2={node.x}
              y2={node.y}
              stroke={typeColor(node.type)}
              strokeWidth={1}
              strokeOpacity={0.25}
              aria-label={`${typeLabel(node.type)} connection to ${node.word}`}
            />
          ))}

          {/* Satellite nodes */}
          {nodes.map((node) => (
            <GraphNode
              key={node.word}
              node={node}
              centreWord={data.centre}
              onClick={handleNodeClick}
            />
          ))}

          {/* Centre node */}
          <motion.g
            key={`centre-${data.centre}`}
            initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={
              shouldReduceMotion
                ? { duration: 0 }
                : { duration: 0.35, ease: 'easeOut' }
            }
            aria-label={`${data.centre} — centre word`}
          >
            <text
              x={VIEWBOX.cx}
              y={VIEWBOX.cy}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="var(--color-foreground)"
              fontSize={22}
              fontWeight={700}
              fontFamily="var(--font-sans)"
              letterSpacing="-0.01em"
              style={{ textTransform: 'uppercase', userSelect: 'none' }}
            >
              {data.centre}
            </text>
          </motion.g>
        </g>
      </svg>

      {/* Legend + controls row */}
      <div className="flex items-center justify-between w-full max-w-2xl px-2">
        {/* Legend */}
        <div
          className="flex items-center gap-4 text-xs"
          role="list"
          aria-label="Graph legend"
        >
          {(
            [
              ['synonym', 'Synonym'],
              ['antonym', 'Antonym'],
              ['related', 'Related'],
            ] as [RelationshipType, string][]
          ).map(([type, label]) => (
            <div
              key={type}
              role="listitem"
              className="flex items-center gap-1.5"
              aria-label={`${label} nodes are shown in ${type === 'synonym' ? 'green' : type === 'antonym' ? 'red' : 'blue'}`}
            >
              <span
                className="block w-2 h-2 rounded-full"
                style={{ backgroundColor: typeColor(type) }}
                aria-hidden
              />
              <span style={{ color: typeColor(type) }}>{label}</span>
            </div>
          ))}
        </div>

        {/* Reset pan button */}
        {hasPanned && (
          <button
            type="button"
            onClick={resetPan}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors focus-ring rounded px-2 py-0.5"
            aria-label="Reset graph position"
          >
            Reset view
          </button>
        )}
      </div>
    </div>
  );
}
