"use client";
import { useQuery } from "@tanstack/react-query";

type HealthResponse = { status: "ok" | "degraded" | "down"; checks: Record<string, boolean> };

async function fetchHealth(): Promise<HealthResponse> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/healthz`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch health");
  return res.json();
}

export function HealthCard() {
  const { data, error, isLoading } = useQuery({
    queryKey: ["health"],
    queryFn: fetchHealth,
    refetchInterval: 5000,
  });

  return (
    <div className="rounded-lg border p-4">
      <h2 className="text-lg font-medium mb-2">Health</h2>
      {isLoading && <p>Loading...</p>}
      {error && <p className="text-red-600">Errore health</p>}
      {data && (
        <div>
          <p className="mb-2">Stato: <span className="font-semibold">{data.status}</span></p>
          <ul className="list-disc ml-5 text-sm text-gray-600">
            {Object.entries(data.checks).map(([k, v]) => (
              <li key={k}>{k}: {v ? "ok" : "down"}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
