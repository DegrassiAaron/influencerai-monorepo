"use client";
import { useQuery } from "@tanstack/react-query";

type QueueStats = { active: number; waiting: number; failed: number };

async function fetchQueues(): Promise<QueueStats> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/queues/summary`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch queues");
  return res.json();
}

export function QueuesWidget() {
  const { data, error, isLoading } = useQuery({
    queryKey: ["queues"],
    queryFn: fetchQueues,
    refetchInterval: 4000,
  });

  return (
    <div className="rounded-lg border p-4">
      <h2 className="text-lg font-medium mb-2">Job Queues</h2>
      {isLoading && <p>Loading...</p>}
      {error && <p className="text-red-600">Errore queues</p>}
      {data && (
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold">{data.active}</div>
            <div className="text-sm text-gray-500">Active</div>
          </div>
          <div>
            <div className="text-2xl font-bold">{data.waiting}</div>
            <div className="text-sm text-gray-500">Waiting</div>
          </div>
          <div>
            <div className="text-2xl font-bold">{data.failed}</div>
            <div className="text-sm text-gray-500">Failed</div>
          </div>
        </div>
      )}
    </div>
  );
}
