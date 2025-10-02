"use client";
import { useQuery } from "@tanstack/react-query";

export function useAuth() {
  const q = useQuery<{ authenticated: boolean }>({
    queryKey: ["auth/status"],
    queryFn: async () => {
      const res = await fetch("/api/session/status", { cache: "no-store" });
      if (!res.ok) return { authenticated: false };
      return res.json();
    },
    staleTime: 30_000,
  });

  return {
    authenticated: Boolean(q.data?.authenticated),
    isLoading: q.isLoading,
    refetch: q.refetch,
  };
}

