'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export type DatasetDetailErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function DatasetDetailError({ error, reset }: DatasetDetailErrorProps) {
  const router = useRouter();

  useEffect(() => {
    // Log error to error reporting service
    console.error('Dataset detail page error:', error);
  }, [error]);

  return (
    <div className="flex h-full flex-col gap-8">
      <header className="border-b border-border/60 pb-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold text-foreground">Error loading dataset</h1>
          <p className="text-sm text-muted-foreground">
            Something went wrong while loading the dataset details.
          </p>
        </div>
      </header>

      <Card className="border-destructive/30 bg-destructive/5">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <CardTitle className="text-destructive">An error occurred</CardTitle>
          </div>
          <CardDescription>{error.message || 'An unknown error occurred'}</CardDescription>
          {error.digest && (
            <CardDescription className="font-mono text-xs">Error ID: {error.digest}</CardDescription>
          )}
        </CardHeader>
        <CardContent className="flex gap-2">
          <Button onClick={reset} variant="outline" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Try again
          </Button>
          <Button onClick={() => router.push('/dashboard/datasets')} variant="default">
            Back to datasets
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
