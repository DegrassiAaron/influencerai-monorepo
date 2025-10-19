'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { LucideIcon } from 'lucide-react';
import { Activity, AlertTriangle, CheckCircle, Clock, RefreshCw } from 'lucide-react';

import { JobsChart } from '@/components/JobsChart';
import { QueuesWidget } from '@/components/QueuesWidget';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { listJobs, type JobRecord, type JobStatus, type JobType, type ListJobsParams } from '@/lib/jobs';

type StatusFilter = 'all' | JobStatus;
type TypeFilter = 'all' | JobType;

const STATUS_FILTER_OPTIONS: Array<{ value: StatusFilter; label: string }> = [
  { value: 'all', label: 'Tutti gli stati' },
  { value: 'pending', label: 'In attesa' },
  { value: 'running', label: 'In esecuzione' },
  { value: 'succeeded', label: 'Completati' },
  { value: 'completed', label: 'Completati (legacy)' },
  { value: 'failed', label: 'Falliti' },
];

const TYPE_FILTER_OPTIONS: Array<{ value: TypeFilter; label: string }> = [
  { value: 'all', label: 'Tutti i tipi' },
  { value: 'lora-training', label: 'LoRA Training' },
  { value: 'image-generation', label: 'Generazione immagini' },
  { value: 'video-generation', label: 'Generazione video' },
  { value: 'content-generation', label: 'Generazione contenuti' },
];

const STATUS_LABELS: Record<JobStatus, string> = {
  pending: 'In attesa',
  running: 'In esecuzione',
  succeeded: 'Completato',
  failed: 'Fallito',
  completed: 'Completato',
};

const TYPE_LABELS: Record<JobType, string> = {
  'content-generation': 'Generazione contenuti',
  'image-generation': 'Generazione immagini',
  'lora-training': 'LoRA training',
  'video-generation': 'Generazione video',
};

const STATUS_BADGE_VARIANTS: Record<JobStatus, NonNullable<BadgeProps['variant']>> = {
  pending: 'secondary',
  running: 'brand',
  succeeded: 'default',
  failed: 'destructive',
  completed: 'default',
};

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat('it-IT', {
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});

const TIME_FORMATTER = new Intl.DateTimeFormat('it-IT', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

const NUMBER_FORMATTER = new Intl.NumberFormat('it-IT');

function formatDate(value: string | null): string {
  if (!value) {
    return '—';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }
  return DATE_TIME_FORMATTER.format(date);
}

function formatDuration(job: JobRecord): string {
  const { startedAt, finishedAt } = job;
  if (!startedAt) {
    return '—';
  }

  const startDate = new Date(startedAt);
  if (Number.isNaN(startDate.getTime())) {
    return '—';
  }

  const endDate = finishedAt ? new Date(finishedAt) : new Date();
  if (Number.isNaN(endDate.getTime())) {
    return '—';
  }

  const diffMs = Math.max(0, endDate.getTime() - startDate.getTime());
  const totalSeconds = Math.floor(diffMs / 1000);

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts: string[] = [];
  if (hours > 0) {
    parts.push(`${hours}h`);
  }
  if (hours > 0 || minutes > 0) {
    parts.push(`${minutes}m`);
  }
  parts.push(`${seconds}s`);

  const formatted = parts.join(' ');
  return finishedAt ? formatted : `${formatted} • live`;
}

function getStatusBadgeVariant(status: JobStatus) {
  return STATUS_BADGE_VARIANTS[status];
}

function JobStatusBadge({ status }: { status: JobStatus }) {
  return (
    <Badge variant={getStatusBadgeVariant(status)} className="px-2.5 py-1 text-xs">
      {STATUS_LABELS[status]}
    </Badge>
  );
}

function JobsTableSkeleton() {
  return (
    <>
      {Array.from({ length: 8 }).map((_, index) => (
        <TableRow key={index}>
          <TableCell>
            <Skeleton className="h-4 w-28" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-32" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-5 w-20" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-24" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-24" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-16" />
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}

function JobsTableEmpty() {
  return (
    <TableRow>
      <TableCell colSpan={6}>
        <div className="py-10 text-center text-sm text-muted-foreground">
          Nessun job trovato per i filtri selezionati.
        </div>
      </TableCell>
    </TableRow>
  );
}

type SummaryItem = {
  label: string;
  value: string;
  description: string;
  icon: LucideIcon;
};

function SummaryCard({ items, updatedAt }: { items: SummaryItem[]; updatedAt: string }) {
  return (
    <Card className="border-border/60 bg-card/70">
      <CardHeader className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Snapshot job attivi</CardTitle>
          <CardDescription>Ultimi 50 job dal worker cluster</CardDescription>
        </div>
        <p className="text-xs text-muted-foreground">Aggiornato alle {updatedAt}</p>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {items.map(({ label, value, description, icon: Icon }) => (
            <div
              key={label}
              className="rounded-lg border border-border/50 bg-background/60 p-4"
            >
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-brand-600" />
                <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
              </div>
              <dd className="mt-2 text-2xl font-semibold text-foreground">{value}</dd>
              <p className="mt-1 text-xs text-muted-foreground">{description}</p>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}

export function JobsDashboardPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');

  const filters = useMemo<ListJobsParams>(() => {
    const params: ListJobsParams = { take: 50 };
    if (statusFilter !== 'all') {
      params.status = statusFilter;
    }
    if (typeFilter !== 'all') {
      params.type = typeFilter;
    }
    return params;
  }, [statusFilter, typeFilter]);

  const {
    data,
    error,
    isLoading,
    isFetching,
    refetch,
    dataUpdatedAt,
  } = useQuery<JobRecord[], Error>({
    queryKey: ['jobs-dashboard', filters],
    queryFn: () => listJobs(filters),
    refetchInterval: 5000,
  });

  const jobs = data ?? [];

  const summary = useMemo(() => {
    const totals = {
      total: jobs.length,
      active: 0,
      completed: 0,
      failed: 0,
      costTok: 0,
    };

    for (const job of jobs) {
      if (job.status === 'pending' || job.status === 'running') {
        totals.active += 1;
      }
      if (job.status === 'succeeded' || job.status === 'completed') {
        totals.completed += 1;
      }
      if (job.status === 'failed') {
        totals.failed += 1;
      }
      if (typeof job.costTok === 'number') {
        totals.costTok += job.costTok;
      }
    }

    return totals;
  }, [jobs]);

  const lastUpdatedLabel =
    dataUpdatedAt > 0 ? TIME_FORMATTER.format(new Date(dataUpdatedAt)) : '—';

  const summaryItems: SummaryItem[] = [
    {
      label: 'Job totali',
      value: NUMBER_FORMATTER.format(summary.total),
      description: 'Dataset limitato ai 50 job più recenti',
      icon: Activity,
    },
    {
      label: 'In corso',
      value: NUMBER_FORMATTER.format(summary.active),
      description: 'Pending + Running in tempo reale',
      icon: Clock,
    },
    {
      label: 'Completati',
      value: NUMBER_FORMATTER.format(summary.completed),
      description: 'Jobs riusciti nelle ultime esecuzioni',
      icon: CheckCircle,
    },
    {
      label: 'Falliti',
      value: NUMBER_FORMATTER.format(summary.failed),
      description: 'Richiedono debug o ri-esecuzione',
      icon: AlertTriangle,
    },
  ];

  return (
    <div className="flex h-full flex-col gap-8">
      <header className="flex flex-col gap-4 border-b border-border/60 pb-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <Badge variant="brand" className="bg-brand-100 text-brand-700">
            Monitoring
          </Badge>
          <h1 className="text-3xl font-semibold text-foreground">Job Monitoring Dashboard</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Supervisione in tempo reale delle pipeline BullMQ. Filtra per tipo di job o stato per
            individuare rapidamente colli di bottiglia e retry necessari.
          </p>
        </div>
        <Button
          variant="secondary"
          onClick={() => refetch()}
          className="gap-2"
          disabled={isFetching}
        >
          <RefreshCw className={isFetching ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
          Aggiorna
        </Button>
      </header>

      <section className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
        <SummaryCard items={summaryItems} updatedAt={lastUpdatedLabel} />
        <QueuesWidget />
      </section>

      <section>
        <JobsChart />
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Job recenti</h2>
            <p className="text-sm text-muted-foreground">
              Lista degli ultimi 50 job. Aggiornamento automatico ogni 5 secondi.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as StatusFilter)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Stato" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_FILTER_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={typeFilter}
              onValueChange={(value) => setTypeFilter(value as TypeFilter)}
            >
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Tipo di job" />
              </SelectTrigger>
              <SelectContent>
                {TYPE_FILTER_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-xs text-muted-foreground">
              Ultimo aggiornamento: {lastUpdatedLabel}
            </span>
          </div>
        </div>

        {error ? (
          <Card className="border-destructive/40 bg-destructive/10 text-destructive">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Errore nel recupero dei job
              </CardTitle>
              <CardDescription className="text-destructive/80">
                {error.message || 'Impossibile caricare la lista dei job.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" onClick={() => refetch()}>
                Riprova
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border/60 bg-card/70">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Job ID</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Stato</TableHead>
                  <TableHead>Creato</TableHead>
                  <TableHead>Durata</TableHead>
                  <TableHead>Token</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <JobsTableSkeleton />
                ) : jobs.length === 0 ? (
                  <JobsTableEmpty />
                ) : (
                  jobs.map((job) => (
                    <TableRow key={job.id}>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {job.id}
                      </TableCell>
                      <TableCell className="text-sm text-foreground">
                        {TYPE_LABELS[job.type]}
                      </TableCell>
                      <TableCell>
                        <JobStatusBadge status={job.status} />
                      </TableCell>
                      <TableCell className="text-sm text-foreground">
                        {formatDate(job.createdAt)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDuration(job)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {typeof job.costTok === 'number'
                          ? NUMBER_FORMATTER.format(job.costTok)
                          : '—'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </div>
  );
}
