import { type ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { Home, Compass, BookOpen, Settings, Sun, Moon } from 'lucide-react';
import { cn } from '@workspace/wordgraph-design-system/lib/utils';
import { useTheme } from '@/hooks/use-theme';

interface NavItem {
  label: string;
  href: string;
  icon: typeof Home;
  mobileHidden?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Home', href: '/', icon: Home },
  { label: 'Explore', href: '/explore', icon: Compass },
  { label: 'Library', href: '/library', icon: BookOpen },
  { label: 'Settings', href: '/settings', icon: Settings, mobileHidden: true },
];

function isActive(href: string, location: string): boolean {
  if (href === '/') return location === '/';
  return location.startsWith(href);
}

function ThemeToggle() {
  const { resolvedTheme, toggle } = useTheme();
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
      className={cn(
        'flex items-center justify-center w-9 h-9 rounded-lg',
        'text-muted-foreground hover:text-foreground hover:bg-accent',
        'transition-colors focus-ring',
      )}
    >
      {resolvedTheme === 'dark' ? (
        <Sun className="w-4 h-4" aria-hidden />
      ) : (
        <Moon className="w-4 h-4" aria-hidden />
      )}
    </button>
  );
}

// ── Desktop sidebar ───────────────────────────────────────────────────────────

function DesktopSidebar({ location }: { location: string }) {
  return (
    <nav
      aria-label="Main navigation"
      className={cn(
        'hidden md:flex flex-col fixed left-0 top-0 bottom-0 z-40',
        'w-56 border-r border-border bg-background',
        'px-3 py-5 gap-1',
      )}
    >
      {/* Wordmark */}
      <Link
        href="/"
        className="flex items-center gap-2 px-3 py-2 mb-4 focus-ring rounded-lg"
        aria-label="WordGraph home"
      >
        <span className="text-lg font-bold tracking-tight text-foreground">
          WordGraph
        </span>
      </Link>

      {/* Nav items */}
      <div className="flex flex-col gap-1 flex-1">
        {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
          const active = isActive(href, location);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium',
                'transition-colors focus-ring',
                active
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/50',
              )}
              aria-current={active ? 'page' : undefined}
            >
              <Icon className="w-4 h-4" aria-hidden />
              {label}
            </Link>
          );
        })}
      </div>

      {/* Theme toggle at bottom */}
      <div className="flex items-center px-2">
        <ThemeToggle />
      </div>
    </nav>
  );
}

// ── Mobile bottom bar ─────────────────────────────────────────────────────────

function MobileBottomBar({ location }: { location: string }) {
  const visibleItems = NAV_ITEMS.filter((item) => !item.mobileHidden);
  return (
    <nav
      aria-label="Main navigation"
      className={cn(
        'md:hidden fixed bottom-0 left-0 right-0 z-40',
        'bg-background border-t border-border',
        'flex items-center justify-around px-2 pb-safe',
        'h-16',
      )}
    >
      {visibleItems.map(({ label, href, icon: Icon }) => {
        const active = isActive(href, location);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg',
              'text-xs font-medium transition-colors focus-ring flex-1',
              active
                ? 'text-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
            aria-current={active ? 'page' : undefined}
          >
            <Icon
              className={cn(
                'w-5 h-5',
                active ? 'text-foreground' : 'text-muted-foreground',
              )}
              aria-hidden
            />
            <span>{label}</span>
          </Link>
        );
      })}
      {/* Theme toggle on mobile */}
      <div className="flex flex-col items-center justify-center">
        <ThemeToggle />
      </div>
    </nav>
  );
}

// ── Shell layout ──────────────────────────────────────────────────────────────

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [location] = useLocation();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <DesktopSidebar location={location} />
      <MobileBottomBar location={location} />

      {/* Main content area */}
      <main
        className={cn(
          'md:ml-56', // offset for sidebar
          'pb-16 md:pb-0', // offset for mobile bottom bar
          'min-h-screen',
        )}
      >
        {children}
      </main>
    </div>
  );
}
