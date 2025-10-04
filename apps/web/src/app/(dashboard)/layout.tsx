import type { ReactNode } from "react";

import { AppShell } from "@/components/layout/AppShell";

const navItems = [
  { title: "Dashboard", href: "/dashboard" },
  { title: "Jobs", href: "/dashboard/jobs" },
  { title: "Queues", href: "/dashboard/queues" },
];

const breadcrumbs = [
  { label: "Home", href: "/" },
  { label: "Dashboard" },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell breadcrumbs={breadcrumbs} navItems={navItems}>
      {children}
    </AppShell>
  );
}
