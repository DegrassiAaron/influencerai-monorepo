"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { QueueSummary } from "@influencerai/core-schemas";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

import { ApiError, apiGet } from "../lib/api";

type StatDefinition = {
  key: keyof QueueSummary;
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
        <div key={key} className="rounded-lg border border-border/60 p-3">
          <div className="h-6 w-16 animate-pulse rounded bg-muted" />
          <div className="mt-2 h-4 w-full animate-pulse rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}

export function QueuesWidget() {
  const { data, error, isLoading } = useQuery<QueueSummary, Error>({
    queryKey: ["queues"],
    queryFn: () => apiGet<QueueSummary>("/queues/summary"),
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
    <Card className="h-full border-border/60 bg-card/70">
      <CardHeader>
        <CardTitle>Job Queues</CardTitle>
        <CardDescription>Monitoraggio BullMQ</CardDescription>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        {isLoading && <StatSkeleton />}
        {error && (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-destructive">
            {error instanceof ApiError ? error.message : "Impossibile recuperare le code"}
          </p>
        )}
        {stats && (
          <dl className="grid grid-cols-1 gap-4 md:grid-cols-3" aria-live="polite">
            {stats.map(({ key, label, description, accentClass, value }) => (
              <div key={key} className="rounded-lg border border-border/60 bg-background/60 p-4">
                <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
                <dd className="mt-3 text-3xl font-semibold text-foreground">
                  <span className={cn("inline-flex rounded-full border px-3 py-1 text-base", accentClass)}>
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
