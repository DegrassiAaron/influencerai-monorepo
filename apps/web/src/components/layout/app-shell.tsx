import type { ReactNode } from "react";

import { AppBreadcrumbs } from "./app-breadcrumbs";
import { AppHeader } from "./app-header";
import { AppSidebar } from "./app-sidebar";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen w-full bg-muted/30">
      <AppSidebar />
      <div className="flex min-h-screen flex-1 flex-col">
        <AppHeader />
        <main className="flex flex-1 flex-col gap-4 px-4 pb-10 pt-4 lg:px-8">
          <AppBreadcrumbs />
          <section className="flex-1 overflow-auto rounded-2xl border bg-card/70 shadow-sm backdrop-blur-sm">
            <div className="h-full w-full p-4 lg:p-8">{children}</div>
          </section>
        </main>
      </div>
    </div>
  );
}
