"use client";

import Link from "next/link";

import { useCallback } from "react";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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
] as const;

export default function Home() {
  const router = useRouter();

  const handleLogout = useCallback(async () => {
    try {
      await fetch("/api/session/logout", { method: "POST" });
    } finally {
      router.refresh();
    }
  }, [router]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <Badge variant="outline" className="w-fit bg-brand-50 text-brand-700">
            Operations snapshot
          </Badge>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground lg:text-4xl">
            Benvenuto nel Control Center di InfluencerAI
          </h1>
          <p className="text-sm text-muted-foreground lg:text-base">
            Monitora campagne, job e content plan in un unico spazio. Usa le azioni rapide per passare alla dashboard o
            lanciare un nuovo piano editoriale.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline" className="gap-2">
            <Link href="/dashboard">
              Vai alla dashboard
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button className="gap-2" asChild>
            <Link href="/dashboard/content-plans/new">
              <Sparkles className="h-4 w-4" />
              Nuovo content plan
            </Link>
          </Button>
          <Button variant="ghost" onClick={handleLogout}>
            Esci
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {highlights.map((item) => (
          <Card key={item.title} className="border border-border/60 bg-card/80 shadow-sm backdrop-blur">
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
              <div>
                <CardTitle className="text-sm font-medium text-muted-foreground">{item.title}</CardTitle>
                <CardDescription className="text-xs">Aggiornato pochi minuti fa</CardDescription>
              </div>
              <Badge variant="secondary" className="text-xs font-medium">
                {item.delta}
              </Badge>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold tracking-tight text-foreground">{item.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border border-dashed border-brand-200 bg-brand-50 text-brand-700">
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-lg font-semibold">Velocizza l&apos;onboarding del team</CardTitle>
            <CardDescription className="text-sm text-brand-700/80">
              Esplora la guida rapida per mappare funzionalità, ruoli e DoD dei flussi WEB-06.
            </CardDescription>
          </div>
          <Button asChild variant="secondary" className="bg-white text-brand-700 hover:bg-brand-100">
            <Link href="/docs/web-shell">
              Apri guida
              <ArrowUpRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </CardHeader>
      </Card>
    </div>
  );
}
