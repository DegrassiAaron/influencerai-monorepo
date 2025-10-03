"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { ApiError, apiGet } from "../lib/api";

type QueueStats = {
  active: number;
  waiting: number;
  failed: number;
};

const STAT_DEFINITION: Array<{
  key: keyof QueueStats;
  label: string;
  description: string;
  accentClass: string;
}> = [
  {
    key: "active",
    label: "Attivi",
    description: "Job in elaborazione",
    accentClass: "border-blue-200 bg-blue-50 text-blue-700",
  },
  {
    key: "waiting",
    label: "In coda",
    description: "Job in attesa",
    accentClass: "border-slate-200 bg-slate-50 text-slate-700",
  },
  {
    key: "failed",
    label: "Falliti",
    description: "Richiedono attenzione",
    accentClass: "border-rose-200 bg-rose-50 text-rose-700",
  },
];

const numberFormatter = new Intl.NumberFormat("it-IT");

function StatSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-4">
      {STAT_DEFINITION.map(({ key }) => (
        <div key={key} className="rounded-lg border border-slate-200 p-3">
          <div className="h-6 w-16 animate-pulse rounded bg-slate-200" />
          <div className="mt-2 h-4 w-full animate-pulse rounded bg-slate-200" />
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
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <header className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Job Queues</h2>
          <p className="text-sm text-slate-500">Monitoraggio BullMQ</p>
        </div>
      </header>

      <div className="mt-4 text-sm text-slate-600">
        {isLoading && <StatSkeleton />}
        {error && (
          <p className="rounded-md border border-red-200 bg-red-50 p-3 text-red-700">
            {error instanceof ApiError ? error.message : "Impossibile recuperare le code"}
          </p>
        )}
        {stats && (
          <dl className="grid grid-cols-1 gap-4 md:grid-cols-3" aria-live="polite">
            {stats.map(({ key, label, description, accentClass, value }) => (
              <div key={key} className="rounded-lg border border-slate-200 p-4">
                <dt className="text-sm font-medium text-slate-500">{label}</dt>
                <dd className="mt-2 text-3xl font-semibold text-slate-900">
                  <span className={`inline-flex rounded-full border px-3 py-1 text-base ${accentClass}`}>
                    {numberFormatter.format(value)}
                  </span>
                </dd>
                <p className="mt-2 text-xs text-slate-500">{description}</p>
              </div>
            ))}
          </dl>
        )}
      </div>
    </section>
  );
}
