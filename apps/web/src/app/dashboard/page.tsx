import { HealthCard } from "../../components/HealthCard";
import { QueuesWidget } from "../../components/QueuesWidget";
import { JobsChart } from "../../components/JobsChart";

export default function DashboardPage() {
  return (
    <main className="min-h-screen p-8 space-y-8">
      <header>
        <h1 className="text-3xl font-semibold">Operational Dashboard</h1>
        <p className="text-gray-500">Stato code, servizi e job recenti</p>
      </header>
      <section className="grid gap-6 md:grid-cols-2">
        <QueuesWidget />
        <HealthCard />
      </section>
      <section>
        <JobsChart />
      </section>
    </main>
  );
}
