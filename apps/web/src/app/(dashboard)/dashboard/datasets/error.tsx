'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function DatasetsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Datasets page error:', error);
  }, [error]);

  return (
    <div className="flex h-full flex-col gap-8">
      <header className="flex flex-col gap-4 border-b border-border/60 pb-6">
        <div className="space-y-2">
          <Badge variant="brand" className="bg-brand-100 text-brand-700">
            Datasets
          </Badge>
          <h1 className="text-3xl font-semibold text-foreground">Training Datasets</h1>
        </div>
      </header>

      <Card className="border-destructive/30 bg-destructive/5">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <CardTitle className="text-destructive">Something went wrong</CardTitle>
          </div>
          <CardDescription className="mt-2">
            {error.message || 'An unexpected error occurred while loading datasets.'}
          </CardDescription>
          {error.digest && (
            <CardDescription className="mt-1 font-mono text-xs">
              Error ID: {error.digest}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <Button onClick={reset} variant="outline" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
