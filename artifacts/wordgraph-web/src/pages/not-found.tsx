import { Card, CardContent } from '@workspace/wordgraph-design-system/components/ui/card';
import { AlertCircle } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-2 items-start">
            <AlertCircle className="h-6 w-6 text-destructive shrink-0 mt-0.5" aria-hidden />
            <div>
              <h1 className="text-xl font-bold text-foreground">404 — Page Not Found</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                This page doesn&apos;t exist. Try navigating home.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
