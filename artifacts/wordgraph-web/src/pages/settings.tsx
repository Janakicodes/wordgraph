import { useRef, useState } from 'react';
import { Download, Upload, FileJson, FileText, Table } from 'lucide-react';
import { Button } from '@workspace/wordgraph-design-system/components/ui/button';
import { useToast } from '@workspace/wordgraph-design-system/hooks/use-toast';
import { cn } from '@workspace/wordgraph-design-system/lib/utils';
import { WORD_DB, COMMONNESS_LABELS } from '@/data/words';
import {
  buildSnapshot,
  mergeSnapshot,
  type LibrarySnapshot,
} from '@/hooks/use-library';

// ── Download helper ───────────────────────────────────────────────────────────

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── Export functions ──────────────────────────────────────────────────────────

async function exportJson(): Promise<void> {
  const snapshot = await buildSnapshot();
  const blob = new Blob([JSON.stringify(snapshot, null, 2)], {
    type: 'application/json',
  });
  triggerDownload(blob, 'wordgraph-library.json');
}

async function exportMarkdown(): Promise<void> {
  const snapshot = await buildSnapshot();

  // Build collection name lookup
  const colMap = new Map(
    snapshot.collections.map((c) => [c.id!, c.name]),
  );
  const wordColsMap = new Map<string, string[]>();
  for (const wc of snapshot.wordCollections) {
    const name = colMap.get(wc.collectionId);
    if (!name) continue;
    const arr = wordColsMap.get(wc.word) ?? [];
    arr.push(name);
    wordColsMap.set(wc.word, arr);
  }

  const lines: string[] = [
    '# WordGraph Library',
    '',
    `_Exported on ${new Date().toLocaleDateString('en', { dateStyle: 'long' })}_`,
    '',
  ];

  for (const sw of snapshot.savedWords) {
    const data = WORD_DB[sw.word];
    lines.push(`## ${sw.word}`);
    lines.push('');
    if (data) {
      lines.push(
        `**${data.partOfSpeech}** · ${data.pronunciation} · ${COMMONNESS_LABELS[data.commonness]}`,
      );
      lines.push('');
      lines.push(data.definition);
      lines.push('');
    }
    if (sw.notes) {
      lines.push(`**Notes:** ${sw.notes}`);
      lines.push('');
    }
    if (sw.tags.length > 0) {
      lines.push(`**Tags:** ${sw.tags.map((t) => `#${t}`).join(' ')}`);
      lines.push('');
    }
    const cols = wordColsMap.get(sw.word) ?? [];
    if (cols.length > 0) {
      lines.push(`**Collections:** ${cols.join(', ')}`);
      lines.push('');
    }
    lines.push('---');
    lines.push('');
  }

  const blob = new Blob([lines.join('\n')], { type: 'text/markdown' });
  triggerDownload(blob, 'wordgraph-library.md');
}

async function exportCsv(): Promise<void> {
  const snapshot = await buildSnapshot();

  const colMap = new Map(
    snapshot.collections.map((c) => [c.id!, c.name]),
  );
  const wordColsMap = new Map<string, string[]>();
  for (const wc of snapshot.wordCollections) {
    const name = colMap.get(wc.collectionId);
    if (!name) continue;
    const arr = wordColsMap.get(wc.word) ?? [];
    arr.push(name);
    wordColsMap.set(wc.word, arr);
  }

  const escape = (s: string) => `"${s.replace(/"/g, '""')}"`;

  const header = 'word,part_of_speech,definition,commonness,collections,tags,notes,saved_at\n';
  const rows = snapshot.savedWords.map((sw) => {
    const data = WORD_DB[sw.word];
    const cols = (wordColsMap.get(sw.word) ?? []).join('; ');
    const tags = sw.tags.join('; ');
    const savedDate = new Date(sw.savedAt).toISOString().split('T')[0];
    return [
      escape(sw.word),
      escape(data?.partOfSpeech ?? ''),
      escape(sw.definition),
      escape(data ? COMMONNESS_LABELS[data.commonness] : ''),
      escape(cols),
      escape(tags),
      escape(sw.notes),
      escape(savedDate),
    ].join(',');
  });

  const blob = new Blob([header + rows.join('\n')], { type: 'text/csv' });
  triggerDownload(blob, 'wordgraph-library.csv');
}

// ── Section wrapper ───────────────────────────────────────────────────────────

function SettingsSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        {description && (
          <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      <div className="border border-border rounded-xl p-5 bg-background">
        {children}
      </div>
    </section>
  );
}

// ── Export card ───────────────────────────────────────────────────────────────

function ExportCard() {
  const { toast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);

  const run = async (name: string, fn: () => Promise<void>) => {
    setLoading(name);
    try {
      await fn();
      toast({ title: 'Download started', description: `${name} file ready.` });
    } catch (err) {
      toast({
        title: 'Export failed',
        description: String(err),
        variant: 'destructive',
      });
    } finally {
      setLoading(null);
    }
  };

  const formats = [
    {
      id: 'JSON',
      icon: FileJson,
      description: 'Full library snapshot — words, notes, collections, tags.',
      action: () => run('JSON', exportJson),
    },
    {
      id: 'Markdown',
      icon: FileText,
      description: 'One heading per word with definition, notes, and tags.',
      action: () => run('Markdown', exportMarkdown),
    },
    {
      id: 'CSV',
      icon: Table,
      description: 'Spreadsheet-friendly: word, definition, collections, tags.',
      action: () => run('CSV', exportCsv),
    },
  ];

  return (
    <div className="space-y-3">
      {formats.map(({ id, icon: Icon, description, action }) => (
        <div
          key={id}
          className="flex items-center justify-between gap-4 py-3 border-b border-border last:border-0"
        >
          <div className="flex items-start gap-3">
            <Icon className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">{id}</p>
              <p className="text-xs text-muted-foreground">{description}</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={action}
            disabled={loading !== null}
            className="shrink-0 gap-1.5"
            aria-label={`Download ${id}`}
          >
            <Download className="w-3.5 h-3.5" aria-hidden />
            {loading === id ? 'Preparing…' : 'Download'}
          </Button>
        </div>
      ))}
    </div>
  );
}

// ── Import card ───────────────────────────────────────────────────────────────

function ImportCard() {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState<{
    words: number;
    collections: number;
  } | null>(null);
  const [parsed, setParsed] = useState<LibrarySnapshot | null>(null);
  const [fileName, setFileName] = useState('');

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    try {
      const text = await file.text();
      const data = JSON.parse(text) as LibrarySnapshot;
      if (!Array.isArray(data.savedWords)) throw new Error('Invalid format');
      setParsed(data);
      setPreview({
        words: data.savedWords?.length ?? 0,
        collections: data.collections?.length ?? 0,
      });
    } catch {
      toast({
        title: 'Invalid file',
        description: 'The file does not appear to be a valid WordGraph export.',
        variant: 'destructive',
      });
      setParsed(null);
      setPreview(null);
    }
    // Reset input so same file can be re-selected
    e.target.value = '';
  };

  const handleImport = async () => {
    if (!parsed) return;
    setImporting(true);
    try {
      await mergeSnapshot(parsed);
      toast({
        title: 'Import complete',
        description: `Processed ${preview?.words ?? 0} words and ${preview?.collections ?? 0} collections.`,
      });
      setParsed(null);
      setPreview(null);
      setFileName('');
    } catch (err) {
      toast({
        title: 'Import failed',
        description: String(err),
        variant: 'destructive',
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Import a previously exported WordGraph JSON file. Existing words are
        preserved — only new words and collections are added. Tags are merged.
      </p>

      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileRef.current?.click()}
          className="gap-1.5"
        >
          <Upload className="w-3.5 h-3.5" aria-hidden />
          Choose file
        </Button>
        {fileName && (
          <span className="text-sm text-muted-foreground truncate max-w-[180px]">
            {fileName}
          </span>
        )}
        <input
          ref={fileRef}
          type="file"
          accept=".json,application/json"
          onChange={handleFile}
          className="sr-only"
          aria-label="Choose JSON file to import"
        />
      </div>

      {preview && (
        <div
          className={cn(
            'flex items-center justify-between rounded-lg border border-border px-4 py-3',
            'bg-muted/40',
          )}
        >
          <div>
            <p className="text-sm font-medium text-foreground">Ready to import</p>
            <p className="text-xs text-muted-foreground">
              {preview.words} word{preview.words !== 1 ? 's' : ''},{' '}
              {preview.collections} collection
              {preview.collections !== 1 ? 's' : ''}
            </p>
          </div>
          <Button size="sm" onClick={handleImport} disabled={importing}>
            {importing ? 'Importing…' : 'Import'}
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Settings page ─────────────────────────────────────────────────────────────

export default function SettingsPage() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-10 space-y-10">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Settings
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your WordGraph preferences and library data.
        </p>
      </div>

      {/* Appearance */}
      <SettingsSection
        title="Appearance"
        description="Theme preference is controlled from the sidebar toggle."
      >
        <p className="text-sm text-muted-foreground">
          Use the{' '}
          <span className="font-medium text-foreground">
            sun/moon icon in the navigation sidebar
          </span>{' '}
          to switch between light and dark mode. Your preference is saved
          locally.
        </p>
      </SettingsSection>

      {/* Export */}
      <SettingsSection
        title="Export library"
        description="Download your saved words, notes, collections, and tags."
      >
        <ExportCard />
      </SettingsSection>

      {/* Import */}
      <SettingsSection
        title="Import library"
        description="Restore or merge data from a WordGraph JSON export."
      >
        <ImportCard />
      </SettingsSection>

      {/* Data & privacy */}
      <SettingsSection title="Data & privacy">
        <p className="text-sm text-muted-foreground leading-relaxed">
          All your library data — saved words, personal notes, collections, and
          tags — is stored entirely on this device using your browser&rsquo;s
          IndexedDB. Nothing is ever sent to a server or shared with anyone.
          Clearing your browser data will erase your library; use Export to keep
          a backup.
        </p>
      </SettingsSection>
    </div>
  );
}
