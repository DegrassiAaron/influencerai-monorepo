"use client";
import React, { createContext, useContext, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";

type AuthState = {
  authenticated: boolean;
  isLoading: boolean;
  refetch: () => Promise<any>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const q = useQuery<{ authenticated: boolean }>({
    queryKey: ["auth/status"],
    queryFn: async () => {
      const res = await fetch("/api/session/status", { cache: "no-store" });
      if (!res.ok) return { authenticated: false };
      return res.json();
    },
    staleTime: 30_000,
  });

  const value: AuthState = {
    authenticated: Boolean(q.data?.authenticated),
    isLoading: q.isLoading,
    refetch: async () => q.refetch(),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

