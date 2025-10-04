import { HealthCard } from "@/components/HealthCard";
import { JobsChart } from "@/components/JobsChart";
import { QueuesWidget } from "@/components/QueuesWidget";

export default function DashboardPage() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
      <header className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Operations</p>
        <h1 className="text-3xl font-bold">Operational Dashboard</h1>
        <p className="text-muted-foreground">Stato code, servizi e job recenti per il team di contenuti virtuali.</p>
      </header>
      <section className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <QueuesWidget />
        <HealthCard />
      </section>
      <section>
        <JobsChart />
      </section>
    </div>
  );
}
