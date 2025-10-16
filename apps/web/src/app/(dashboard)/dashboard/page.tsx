import { ArrowUpRight } from 'lucide-react';

import { HealthCard } from '@/components/HealthCard';
import { JobsChart } from '@/components/JobsChart';
import { QueuesWidget } from '@/components/QueuesWidget';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function DashboardPage() {
  return (
    <div className="flex h-full flex-col gap-8">
      <header className="flex flex-col gap-4 border-b border-border/60 pb-6 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <Badge variant="brand" className="bg-brand-100 text-brand-700">
            Operations
          </Badge>
          <h1 className="text-3xl font-semibold text-foreground">Operational Dashboard</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Stato delle code, servizi e job recenti per coordinare il team di contenuti virtuali e
            anticipare i colli di bottiglia.
          </p>
        </div>
        <Button variant="secondary" className="gap-2">
          Scarica report
          <ArrowUpRight className="h-4 w-4" />
        </Button>
      </header>
      <section className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
        <QueuesWidget />
        <HealthCard />
      </section>
      <section>
        <JobsChart />
      </section>
    </div>
  );
}
