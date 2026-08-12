import { BookOpen } from 'lucide-react';

export default function LibraryPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 py-16 text-center">
      <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-6">
        <BookOpen className="w-8 h-8 text-muted-foreground" aria-hidden />
      </div>
      <h1 className="text-2xl font-bold text-foreground mb-3">Your Library</h1>
      <p className="text-muted-foreground max-w-sm text-sm leading-relaxed">
        Words you save while exploring will appear here. Save a word from the
        explore view to add it to your library.
      </p>
      <p className="mt-6 text-xs text-muted-foreground/60">
        Full library features — collections, tags, and exploration history —
        are coming in a future update.
      </p>
    </div>
  );
}
