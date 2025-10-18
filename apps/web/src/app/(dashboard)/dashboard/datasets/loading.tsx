import { Badge } from '@/components/ui/badge';

function DatasetCardSkeleton() {
  return (
    <div className="rounded-lg border border-border/60 bg-card/70 p-6">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 animate-pulse rounded-lg bg-muted" />
        <div className="flex-1 space-y-2">
          <div className="h-5 w-32 animate-pulse rounded bg-muted" />
          <div className="h-4 w-48 animate-pulse rounded bg-muted" />
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <div className="h-6 w-16 animate-pulse rounded-full bg-muted" />
        <div className="h-6 w-24 animate-pulse rounded-full bg-muted" />
      </div>
      <div className="mt-4 space-y-2">
        <div className="h-4 w-full animate-pulse rounded bg-muted" />
        <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}

export default function DatasetsLoading() {
  return (
    <div className="flex h-full flex-col gap-8">
      <header className="flex flex-col gap-4 border-b border-border/60 pb-6 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <Badge variant="brand" className="bg-brand-100 text-brand-700">
            Datasets
          </Badge>
          <h1 className="text-3xl font-semibold text-foreground">Training Datasets</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Manage image datasets for LoRA training and character development.
          </p>
        </div>
        <div className="h-10 w-40 animate-pulse rounded-md bg-muted" />
      </header>

      <section className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-10 animate-pulse rounded-md bg-muted" />
          ))}
        </div>
        <div className="flex gap-2">
          <div className="h-10 flex-1 animate-pulse rounded-md bg-muted" />
          <div className="h-10 w-24 animate-pulse rounded-md bg-muted" />
        </div>
      </section>

      <section className="flex-1">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <DatasetCardSkeleton key={i} />
          ))}
        </div>
      </section>
    </div>
  );
}
