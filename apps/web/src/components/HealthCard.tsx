"use client";

import { useQuery } from "@tanstack/react-query";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

import { apiGet, ApiError } from "../lib/api";

type HealthResponse = {
  status: "ok" | "degraded" | "down";
  checks: Record<string, boolean>;
};

const STATUS_CONFIG: Record<
  HealthResponse["status"],
  { label: string; badgeClass: string }
> = {
  ok: {
    label: "Tutti i servizi operativi",
    badgeClass: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  degraded: {
    label: "Servizi con degrado",
    badgeClass: "border-amber-200 bg-amber-50 text-amber-700",
  },
  down: {
    label: "Servizi non disponibili",
    badgeClass: "border-red-200 bg-red-50 text-red-700",
  },
};

function ChecksSkeleton() {
  return (
    <div className="space-y-2">
      {[0, 1, 2].map((index) => (
        <div key={index} className="h-3 w-full animate-pulse rounded bg-muted" />
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
    <Card className="h-full border-border/60 bg-card/70">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>Health</CardTitle>
            <CardDescription>Aggregazione di healthz / readyz</CardDescription>
          </div>
          {status && (
            <Badge
              variant="secondary"
              className={cn("border px-3 py-1 text-xs font-semibold", status.badgeClass)}
            >
              {status.label}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0 text-sm text-muted-foreground">
        {isLoading && <ChecksSkeleton />}
        {error && (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-destructive">
            {error instanceof ApiError ? error.message : "Impossibile recuperare lo stato"}
          </p>
        )}
        {!isLoading && !error && (
          <ul className="space-y-2" aria-live="polite">
            {checks.length === 0 && <li>Nessun check registrato.</li>}
            {checks.map(([service, healthy]) => (
              <li key={service} className="flex items-center justify-between gap-3">
                <span className="font-medium text-foreground">{service}</span>
                <Badge
                  variant="outline"
                  className={cn(
                    "inline-flex items-center gap-2 border px-3 py-1 text-xs font-semibold",
                    healthy
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-red-200 bg-red-50 text-red-700",
                  )}
                >
                  <span className={cn("h-2 w-2 rounded-full", healthy ? "bg-emerald-500" : "bg-red-500")} />
                  {healthy ? "OK" : "Down"}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
