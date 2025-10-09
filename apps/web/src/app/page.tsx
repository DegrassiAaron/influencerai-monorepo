"use client";

import React from "react";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { ModeToggle } from "../components/mode-toggle";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const highlights = [
  {
    title: "Campagne attive",
    value: "12",
    delta: "+3 rispetto alla scorsa settimana",
  },
  {
    title: "Scene generate",
    value: "248",
    delta: "Ultimo batch completato 8 min fa",
  },
  {
    title: "Soddisfazione QA",
    value: "96%",
    delta: "Nuove linee guida adottate",
  },
];

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
