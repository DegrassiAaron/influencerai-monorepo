"use client";
import { useQuery } from "@tanstack/react-query";

type Point = { t: string; success: number; failed: number };

async function fetchSeries(): Promise<Point[]> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/jobs/series?window=1h`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch jobs series");
  return res.json();
}

export function JobsChart() {
  const { data, error, isLoading } = useQuery({
    queryKey: ["jobs-series"],
    queryFn: fetchSeries,
    refetchInterval: 6000,
  });

  if (isLoading) return <div className="rounded-lg border p-4">Loading chart...</div>;
  if (error) return <div className="rounded-lg border p-4 text-red-600">Errore chart</div>;

  return (
    <div className="rounded-lg border p-4">
      <h2 className="text-lg font-medium mb-2">Andamento ultimi job</h2>
      <div className="h-40 grid grid-cols-12 gap-1 items-end">
        {data?.map((p, i) => (
          <div key={i} className="col-span-1 flex flex-col gap-1">
            <div className="bg-green-500" style={{ height: `${Math.min(100, p.success)}%`, minHeight: 2 }} />
            <div className="bg-red-500" style={{ height: `${Math.min(100, p.failed)}%`, minHeight: 2 }} />
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-500 mt-2">Green=success, Red=failed (scaled)</p>
    </div>
  );
}
