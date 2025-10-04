"use client";

import { ArrowUpRight, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";

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
    <div className="flex h-full flex-col gap-8">
      <header className="flex flex-col gap-4 border-b border-border/60 pb-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <Badge variant="brand" className="bg-brand-100 text-brand-700">
            Release 24.12
          </Badge>
          <h1 className="text-3xl font-semibold leading-tight tracking-tight text-foreground">
            Benvenuta nella control room di InfluencerAI
          </h1>
          <p className="max-w-2xl text-base text-muted-foreground">
            Coordina asset, campagne e generazioni da un’unica interfaccia. Monitora le operazioni in tempo reale e reagisci
            rapidamente a colli di bottiglia o incidenti di qualità.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" className="gap-2">
            <Sparkles className="h-4 w-4 text-brand-500" />
            Guida rapida
          </Button>
          <Button variant="outline" onClick={logout} className="gap-2">
            Esci
            <ArrowUpRight className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        {highlights.map((item) => (
          <Card key={item.title} className="border-border/60 bg-card/70">
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-medium text-muted-foreground">{item.title}</CardTitle>
              <CardDescription className="text-3xl font-semibold text-foreground">
                {item.value}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm text-muted-foreground">{item.delta}</p>
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}
