"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ApiError, apiGet } from "../lib/api";

type QueueStats = {
  active: number;
  waiting: number;
  failed: number;
};

type StatDefinition = {
  key: keyof QueueStats;
  label: string;
  description: string;
  badgeVariant: "info" | "secondary" | "destructive";
};

const STAT_DEFINITION: StatDefinition[] = [
  {
    key: "active",
    label: "Attivi",
    description: "Job in elaborazione",
    badgeVariant: "info",
  },
  {
    key: "waiting",
    label: "In coda",
    description: "Job in attesa",
    badgeVariant: "secondary",
  },
  {
    key: "failed",
    label: "Falliti",
    description: "Richiedono attenzione",
    badgeVariant: "destructive",
  },
];

const numberFormatter = new Intl.NumberFormat("it-IT");

function StatSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {STAT_DEFINITION.map(({ key }) => (
        <div key={key} className="rounded-lg border border-border/70 p-4">
          <div className="h-6 w-20 animate-pulse rounded bg-muted" />
          <div className="mt-2 h-8 w-24 animate-pulse rounded bg-muted/80" />
          <div className="mt-2 h-3 w-32 animate-pulse rounded bg-muted/70" />
        </div>
      ))}
    </div>
  );
}

export function QueuesWidget() {
  const { data, error, isLoading } = useQuery<QueueStats, Error>({
    queryKey: ["queues"],
    queryFn: () => apiGet<QueueStats>("/queues/summary"),
    refetchInterval: 4000,
  });

  const stats = useMemo(() => {
    if (!data) return null;
    return STAT_DEFINITION.map((definition) => ({
      ...definition,
      value: data[definition.key],
    }));
  }, [data]);

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Job Queues</CardTitle>
          <CardDescription>Monitoraggio BullMQ</CardDescription>
        </div>
      </CardHeader>

      <CardContent className="text-sm text-muted-foreground">
        {isLoading && <StatSkeleton />}
        {error && (
          <div className="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-destructive">
            {error instanceof ApiError
              ? error.message
              : "Impossibile recuperare le code"}
          </div>
        )}
        {stats && (
          <dl className="grid grid-cols-1 gap-4 md:grid-cols-3" aria-live="polite">
            {stats.map(({ key, label, description, badgeVariant, value }) => (
              <div
                key={key}
                className="rounded-lg border border-border bg-card/40 p-4 shadow-sm"
              >
                <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
                <dd className="mt-2 text-3xl font-semibold text-foreground">
                  <Badge variant={badgeVariant} className="text-base">
                    {numberFormatter.format(value)}
                  </Badge>
                </dd>
                <p className="mt-2 text-xs text-muted-foreground">{description}</p>
              </div>
            ))}
          </dl>
        )}
      </CardContent>
    </Card>
  );
}
