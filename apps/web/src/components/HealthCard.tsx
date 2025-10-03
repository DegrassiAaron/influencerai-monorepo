"use client";

import { useQuery } from "@tanstack/react-query";

import { apiGet, ApiError } from "../lib/api";

type HealthResponse = {
  status: "ok" | "degraded" | "down";
  checks: Record<string, boolean>;
};

const STATUS_CONFIG: Record<HealthResponse["status"], { label: string; badgeClass: string }> = {
  ok: {
    label: "Tutti i servizi operativi",
    badgeClass: "bg-emerald-100 text-emerald-700 border-emerald-200",
  },
  degraded: {
    label: "Servizi con degrado",
    badgeClass: "bg-amber-100 text-amber-700 border-amber-200",
  },
  down: {
    label: "Servizi non disponibili",
    badgeClass: "bg-red-100 text-red-700 border-red-200",
  },
};

function ChecksSkeleton() {
  return (
    <div className="space-y-2">
      {[0, 1, 2].map((index) => (
        <div key={index} className="h-3 w-full animate-pulse rounded bg-slate-200" />
      ))}
    </div>
  );
}

export function HealthCard() {
  const { data, error, isLoading } = useQuery<HealthResponse, Error>({
    queryKey: ["health"],
    queryFn: () => apiGet<HealthResponse>("/healthz"),
    refetchInterval: 5000,
  });

  const status = data ? STATUS_CONFIG[data.status] : undefined;
  const checks = data ? Object.entries(data.checks) : [];

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Health</h2>
          <p className="text-sm text-slate-500">Aggregazione di healthz / readyz</p>
        </div>
        {status && (
          <span className={`rounded-full border px-3 py-1 text-xs font-medium ${status.badgeClass}`}>
            {status.label}
          </span>
        )}
      </header>

      <div className="mt-4 text-sm text-slate-600">
        {isLoading && <ChecksSkeleton />}
        {error && (
          <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error instanceof ApiError ? error.message : "Impossibile recuperare lo stato"}
          </p>
        )}
        {!isLoading && !error && (
          <ul className="space-y-2" aria-live="polite">
            {checks.length === 0 && <li>Nessun check registrato.</li>}
            {checks.map(([service, healthy]) => (
              <li key={service} className="flex items-center justify-between gap-3">
                <span className="font-medium text-slate-700">{service}</span>
                <span
                  className={`inline-flex items-center gap-2 rounded-full border px-2 py-1 text-xs font-semibold ${
                    healthy
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-red-200 bg-red-50 text-red-700"
                  }`}
                >
                  <span className={`h-2 w-2 rounded-full ${healthy ? "bg-emerald-500" : "bg-red-500"}`} />
                  {healthy ? "OK" : "Down"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
