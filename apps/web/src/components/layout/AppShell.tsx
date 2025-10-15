"use client";

import type { ReactNode } from "react";

import { AppBreadcrumbs } from "./app-breadcrumbs";
import { AppHeader } from "./app-header";
import { AppSidebar } from "./app-sidebar";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex min-h-screen w-full bg-muted/30">
      <AppSidebar />
      <div className="flex min-h-screen flex-1 flex-col">
        <AppHeader />
        <div className="flex flex-1 flex-col gap-4 px-4 py-6 md:px-6 lg:px-8">
          <AppBreadcrumbs />
          <main className="flex-1">{children}</main>
        </div>
      </div>
    </div>
  );
}
