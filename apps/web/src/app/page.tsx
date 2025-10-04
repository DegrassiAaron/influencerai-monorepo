"use client";
import React from "react";
import { useRouter } from "next/navigation";
import { ModeToggle } from "../components/mode-toggle";

export default function Home() {
  const router = useRouter();
  async function logout() {
    await fetch("/api/session/logout", { method: "POST" });
    router.refresh();
  }
  return (
    <main className="min-h-screen p-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-4xl font-bold mb-4">InfluencerAI Dashboard</h1>
        <div className="flex items-center gap-2">
          <ModeToggle />
          <button
            onClick={logout}
            className="rounded-md border border-input bg-background px-3 py-1 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Logout
          </button>
        </div>
      </div>
      <p className="text-gray-600">Virtual Influencer Content Generation Platform</p>
    </main>
  );
}
