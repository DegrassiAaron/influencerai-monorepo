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

type StatusVariant = "success" | "warning" | "destructive";

const STATUS_CONFIG: Record<
  HealthResponse["status"],
  { label: string; badgeVariant: StatusVariant }
> = {
  ok: {
    label: "Tutti i servizi operativi",
    badgeVariant: "success",
  },
  degraded: {
    label: "Servizi con degrado",
    badgeVariant: "warning",
  },
  down: {
    label: "Servizi non disponibili",
    badgeVariant: "destructive",
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
    <Card>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle>Health</CardTitle>
          <CardDescription>Aggregazione di healthz / readyz</CardDescription>
        </div>
        {status && <Badge variant={status.badgeVariant}>{status.label}</Badge>}
      </CardHeader>

      <CardContent className="text-sm text-muted-foreground">
        {isLoading && <ChecksSkeleton />}
        {error && (
          <div className="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
            {error instanceof ApiError
              ? error.message
              : "Impossibile recuperare lo stato"}
          </div>
        )}
        {!isLoading && !error && (
          <ul className="space-y-2" aria-live="polite">
            {checks.length === 0 && <li>Nessun check registrato.</li>}
            {checks.map(([service, healthy]) => (
              <li key={service} className="flex items-center justify-between gap-3">
                <span className="font-medium text-foreground">{service}</span>
                <Badge
                  variant={healthy ? "success" : "destructive"}
                  className="inline-flex items-center gap-2"
                >
                  <span
                    className={cn(
                      "h-2 w-2 rounded-full",
                      healthy ? "bg-emerald-500" : "bg-destructive"
                    )}
                    aria-hidden
                  />
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
