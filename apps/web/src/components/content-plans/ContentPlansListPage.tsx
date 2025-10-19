'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Plus, RefreshCw, Search } from 'lucide-react';

import {
  listContentPlans,
  type ContentPlanJob,
  type ListContentPlansParams,
} from '@/lib/content-plans';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const platformLabels: Record<string, string> = {
  instagram: 'Instagram',
  tiktok: 'TikTok',
  youtube: 'YouTube Shorts',
};

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }
  return new Intl.DateTimeFormat('it-IT', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function ApprovalBadge({ job }: { job: ContentPlanJob }) {
  const status = (job.plan as { approvalStatus?: string }).approvalStatus;
  if (status === 'approved') {
    return (
      <Badge className="bg-emerald-600 text-white hover:bg-emerald-500">Approved</Badge>
    );
  }
  if (status === 'rejected') {
    return (
      <Badge className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
        Rejected
      </Badge>
    );
  }
  return <Badge variant="outline">Pending</Badge>;
}

export function ContentPlansListPage() {
  const [influencerInput, setInfluencerInput] = useState('');
  const [filters, setFilters] = useState<ListContentPlansParams>({});

  const query = useQuery({
    queryKey: ['content-plans', filters],
    queryFn: () => listContentPlans(filters),
  });

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = influencerInput.trim();
    setFilters(trimmed ? { influencerId: trimmed } : {});
  };

  const handleResetFilters = () => {
    setInfluencerInput('');
    setFilters({});
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Content Plans
          </h1>
          <p className="text-sm text-muted-foreground">
            Storico dei content plan generati con lo stato di revisione più recente.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => query.refetch()}
            disabled={query.isFetching}
            aria-label="Aggiorna elenco"
          >
            <RefreshCw
              className={`h-4 w-4 ${query.isFetching ? 'animate-spin text-muted-foreground' : ''}`}
            />
          </Button>
          <Button asChild>
            <Link href="/dashboard/content-plans/new">
              <Plus className="mr-2 h-4 w-4" />
              Nuovo content plan
            </Link>
          </Button>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Filtri</CardTitle>
          <CardDescription>Restringi per influencer per ritrovare piani specifici.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-3 md:flex-row md:items-end"
          >
            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium text-muted-foreground" htmlFor="influencerId">
                Influencer ID
              </label>
              <Input
                id="influencerId"
                placeholder="es. inf_123"
                value={influencerInput}
                onChange={(event) => setInfluencerInput(event.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" className="gap-2">
                <Search className="h-4 w-4" />
                Applica
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={handleResetFilters}
                disabled={!influencerInput && Object.keys(filters).length === 0}
              >
                Reset
              </Button>
            </div>
          </form>

          {query.isError ? (
            <Alert variant="destructive">
              <AlertTitle>Errore durante il caricamento</AlertTitle>
              <AlertDescription>
                {(query.error as Error).message ?? 'Impossibile recuperare i content plan.'}
              </AlertDescription>
            </Alert>
          ) : null}

          {query.isPending ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-label="Loading" />
            </div>
          ) : null}

          {query.isSuccess && query.data.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-muted-foreground/40 py-12 text-center">
              <p className="text-sm text-muted-foreground">
                Nessun content plan trovato con i filtri correnti.
              </p>
              <Button asChild>
                <Link href="/dashboard/content-plans/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Genera il primo piano
                </Link>
              </Button>
            </div>
          ) : null}

          {query.isSuccess && query.data.length > 0 ? (
            <div className="rounded-md border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Creato</TableHead>
                    <TableHead>Influencer</TableHead>
                    <TableHead>Tema</TableHead>
                    <TableHead>Piattaforme</TableHead>
                    <TableHead className="text-center">Post</TableHead>
                    <TableHead className="text-center">Stato</TableHead>
                    <TableHead>Job ID</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {query.data.map((job) => (
                    <TableRow key={job.id}>
                      <TableCell>{formatDate(job.plan.createdAt)}</TableCell>
                      <TableCell>
                        <span className="rounded bg-muted px-2 py-1 text-xs font-medium">
                          {job.plan.influencerId}
                        </span>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">{job.plan.theme}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          {job.plan.targetPlatforms.map((platform) => (
                            <Badge key={`${job.id}-${platform}`} variant="secondary">
                              {platformLabels[platform] ?? platform}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">{job.plan.posts.length}</TableCell>
                      <TableCell className="text-center">
                        <ApprovalBadge job={job} />
                      </TableCell>
                      <TableCell>
                        <code className="text-xs text-muted-foreground">{job.id}</code>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
