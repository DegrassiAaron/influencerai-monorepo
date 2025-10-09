import type { ReactNode } from "react";

import { AppShell } from "@/components/layout/AppShell";

const navItems = [
  { title: "Dashboard", href: "/dashboard" },
  { title: "Content Plans", href: "/dashboard/content-plans" },
  { title: "Jobs", href: "/dashboard/jobs" },
  { title: "Queues", href: "/dashboard/queues" },
  { title: "Content Plans", href: "/dashboard/content-plans" },
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
