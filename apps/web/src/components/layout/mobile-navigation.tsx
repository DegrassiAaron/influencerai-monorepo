"use client";

import Link from "next/link";
import * as React from "react";
import { ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

import type { NavItem } from "./nav-config";

type MobileNavigationProps = {
  trigger: React.ReactNode;
  mainNav: NavItem[];
  supportNav: NavItem[];
  iconMap: Record<string, React.ComponentType<{ className?: string }>>;
  activePath: string;
};

export function MobileNavigation({ trigger, mainNav, supportNav, iconMap, activePath }: MobileNavigationProps) {
  return (
    <Sheet>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent side="left" className="w-full max-w-xs border-r bg-background/95 p-0">
        <SheetHeader className="border-b border-border/60 bg-muted/40 px-6 py-5 text-left">
          <SheetTitle className="text-base font-semibold">InfluencerAI</SheetTitle>
          <SheetDescription className="text-xs text-muted-foreground">
            Navigazione rapida della suite operativa.
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-6 px-4 py-6">
          <nav className="space-y-1">
            {mainNav.map((item) => {
              const Icon = item.icon ? iconMap[item.icon] : undefined;
              return (
                <SheetClose key={item.href} asChild>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      activePath === item.href
                        ? "bg-brand-50 text-brand-700"
                        : "hover:bg-muted/60 hover:text-foreground",
                    )}
                  >
                    <span className="flex items-center gap-3">
                      {Icon ? <Icon className="h-4 w-4 text-muted-foreground" /> : null}
                      {item.title}
                    </span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                </SheetClose>
              );
            })}
          </nav>
          <div className="space-y-2">
            <p className="px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Supporto</p>
            <div className="space-y-1">
              {supportNav.map((item) => {
                const Icon = item.icon ? iconMap[item.icon] : undefined;
                return (
                  <Button
                    key={item.href}
                    asChild
                    variant="ghost"
                    className="h-auto w-full justify-start gap-3 px-3 py-2 text-sm"
                  >
                    <Link href={item.href} target="_blank" rel="noreferrer">
                      {Icon ? <Icon className="h-4 w-4 text-muted-foreground" /> : null}
                      <span>{item.title}</span>
                    </Link>
                  </Button>
                );
              })}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
