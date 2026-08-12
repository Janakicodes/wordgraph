import { type ReactNode, lazy, Suspense } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@workspace/wordgraph-design-system/components/ui/toaster';
import { TooltipProvider } from '@workspace/wordgraph-design-system/components/ui/tooltip';
import { AppShell } from '@/components/shell/AppShell';
import NotFound from '@/pages/not-found';
import {
  Route,
  Switch,
  useLocation,
  Router as WouterRouter,
} from 'wouter';

const queryClient = new QueryClient();

const HomePage = lazy(() => import('@/pages/home'));
const ExplorePage = lazy(() => import('@/pages/explore'));
const LibraryPage = lazy(() => import('@/pages/library'));
const SettingsPage = lazy(() => import('@/pages/settings'));

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[40vh]">
      <span className="text-muted-foreground text-sm">Loading…</span>
    </div>
  );
}

function Router() {
  return (
    <AppShell>
      <RoutedErrorBoundary>
        <Suspense fallback={<PageLoader />}>
          <Switch>
            <Route path="/" component={HomePage} />
            <Route path="/explore" component={ExplorePage} />
            <Route path="/explore/:word" component={ExplorePage} />
            <Route path="/library" component={LibraryPage} />
            <Route path="/settings" component={SettingsPage} />
            <Route component={NotFound} />
          </Switch>
        </Suspense>
      </RoutedErrorBoundary>
    </AppShell>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
