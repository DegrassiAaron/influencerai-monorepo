"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { ApiError, apiGet } from "../lib/api";

type JobSeriesPoint = {
  t: string;
  success: number;
  failed: number;
};

function ChartSkeleton() {
  return (
    <div className="flex h-48 items-end gap-2">
      {Array.from({ length: 12 }).map((_, index) => (
        <div key={index} className="flex-1 space-y-2">
          <div className="h-16 animate-pulse rounded bg-slate-200" />
          <div className="h-10 animate-pulse rounded bg-slate-100" />
        </div>
      ))}
    </div>
  );
}

function formatTimestamp(timestamp: string) {
  const date = new Date(timestamp);
  return new Intl.DateTimeFormat("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function JobsChart() {
  const { data, error, isLoading } = useQuery<JobSeriesPoint[], Error>({
    queryKey: ["jobs-series"],
    queryFn: () => apiGet<JobSeriesPoint[]>("/jobs/series?window=1h"),
    refetchInterval: 6000,
  });

  const { maxValue, points } = useMemo(() => {
    if (!data || data.length === 0) {
      return { maxValue: 1, points: [] as JobSeriesPoint[] };
    }

    const maximum = Math.max(
      1,
      ...data.map((point) => Math.max(point.success, point.failed))
    );

    return { maxValue: maximum, points: data };
  }, [data]);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <header className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Andamento ultimi job</h2>
          <p className="text-sm text-slate-500">Ultima ora, aggiornamento automatico</p>
        </div>
      </header>

      <div className="mt-4">
        {isLoading && <ChartSkeleton />}
        {error && (
          <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error instanceof ApiError ? error.message : "Impossibile recuperare la serie dei job"}
          </p>
        )}
        {!isLoading && !error && (
          <>
            {points.length === 0 ? (
              <p className="text-sm text-slate-500">{"Nessun job registrato nell’ultima ora."}</p>
            ) : (
              <div role="img" aria-label="Grafico a barre dei job" className="flex h-48 items-end gap-2">
                {points.map((point) => {
                  const successHeight = (point.success / maxValue) * 100;
                  const failedHeight = (point.failed / maxValue) * 100;

                  return (
                    <div key={point.t} className="flex-1">
                      <div className="flex h-full flex-col justify-end gap-1">
                        <div
                          className="rounded-t bg-emerald-500"
                          style={{ height: `${successHeight}%`, minHeight: point.success > 0 ? 4 : 0 }}
                          aria-hidden
                        />
                        <div
                          className="rounded-b bg-rose-500"
                          style={{ height: `${failedHeight}%`, minHeight: point.failed > 0 ? 4 : 0 }}
                          aria-hidden
                        />
                      </div>
                      <div className="mt-2 text-center text-xs text-slate-500">
                        {formatTimestamp(point.t)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <p className="mt-3 text-xs text-slate-500">Verde = successi, Rosa = fallimenti. Le colonne sono normalizzate sul valore massimo.</p>
          </>
        )}
      </div>
    </section>
  );
}
