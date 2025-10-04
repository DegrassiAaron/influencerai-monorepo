"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";

import { Breadcrumb, type BreadcrumbItem as BreadcrumbEntry } from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

export type AppShellNavItem = {
  title: string;
  href: string;
  icon?: React.ComponentType<{ className?: string }>;
};

export type AppShellProps = {
  children: React.ReactNode;
  navItems: AppShellNavItem[];
  breadcrumbs?: BreadcrumbEntry[];
  headerActions?: React.ReactNode;
  sidebarFooter?: React.ReactNode;
  sidebarTitle?: string;
};

export function AppShell({
  children,
  navItems,
  breadcrumbs = [],
  headerActions,
  sidebarFooter,
  sidebarTitle = "InfluencerAI",
}: AppShellProps) {
  const pathname = usePathname();

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background text-foreground">
        <Sidebar className="flex flex-col">
          <SidebarHeader className="flex items-center gap-2 text-lg font-semibold">
            <span>{sidebarTitle}</span>
          </SidebarHeader>
          <Separator className="mx-4 h-px" />
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Navigation</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const active = pathname.startsWith(item.href);

                    return (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton asChild active={active}>
                          <Link
                            className="flex items-center gap-2"
                            href={item.href}
                          >
                            {Icon ? <Icon className="h-4 w-4" /> : null}
                            <span className={cn("truncate", !Icon && "pl-0")}>{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          {sidebarFooter ? <SidebarFooter>{sidebarFooter}</SidebarFooter> : null}
        </Sidebar>
        <SidebarInset>
          <header className="flex h-16 items-center justify-between gap-4 border-b bg-background px-4">
            <div className="flex flex-1 items-center gap-3">
              <SidebarTrigger />
              {breadcrumbs.length > 0 ? <Breadcrumb items={breadcrumbs} /> : null}
            </div>
            {headerActions ? <div className="flex items-center gap-2">{headerActions}</div> : null}
          </header>
          <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
