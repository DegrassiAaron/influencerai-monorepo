import Link from 'next/link';
import { FileQuestion } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function DatasetNotFound() {
  return (
    <div className="flex h-full flex-col gap-8">
      <header className="border-b border-border/60 pb-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold text-foreground">Dataset not found</h1>
          <p className="text-sm text-muted-foreground">
            The dataset you are looking for does not exist or has been removed.
          </p>
        </div>
      </header>

      <Card className="border-muted">
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileQuestion className="h-5 w-5 text-muted-foreground" />
            <CardTitle>404 - Not found</CardTitle>
          </div>
          <CardDescription>
            This dataset may have been deleted or you may not have access to it.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/dashboard/datasets">Back to datasets</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
