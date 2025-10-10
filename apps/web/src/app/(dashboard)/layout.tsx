import type { ReactNode } from "react";

import { AppShell } from "@/components/layout/AppShell";
import type {
  AppShellBreadcrumb,
  AppShellNavItem,
} from "@/components/layout/AppShell";

const NAV_ITEMS: AppShellNavItem[] = [
  { title: "Dashboard", href: "/dashboard" },
  { title: "Content Plans", href: "/dashboard/content-plans" },
  { title: "Jobs", href: "/dashboard/jobs" },
  { title: "Queues", href: "/dashboard/queues" },
];

const ROOT_BREADCRUMBS: AppShellBreadcrumb[] = [
  { label: "Home", href: "/" },
  { label: "Dashboard" },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell breadcrumbs={ROOT_BREADCRUMBS} navItems={NAV_ITEMS}>
      {children}
    </AppShell>
  );
}
