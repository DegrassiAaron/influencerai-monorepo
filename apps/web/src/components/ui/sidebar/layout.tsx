"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

import { useSidebar } from "./context";

type SidebarBaseProps<T extends HTMLElement> = React.HTMLAttributes<T> & {
  asChild?: boolean;
};

export const Sidebar = React.forwardRef<HTMLElement, SidebarBaseProps<HTMLElement>>(
  ({ className, ...props }, ref) => {
    const { open } = useSidebar();

    return (
      <aside
        ref={ref as React.ForwardedRef<HTMLElement>}
        data-state={open ? "expanded" : "collapsed"}
        className={cn(
          "flex border-r bg-card text-card-foreground transition-[width] duration-300",
          open ? "w-64" : "w-16",
          className,
        )}
        {...props}
      />
    );
  },
);
Sidebar.displayName = "Sidebar";

export const SidebarInset = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex min-h-screen flex-1 flex-col bg-background", className)} {...props} />
  ),
);
SidebarInset.displayName = "SidebarInset";

export const SidebarHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn("px-4 py-3", className)} {...props} />,
);
SidebarHeader.displayName = "SidebarHeader";

export const SidebarContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn("flex-1 space-y-2 px-2 py-4", className)} {...props} />,
);
SidebarContent.displayName = "SidebarContent";

export const SidebarFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn("px-4 py-3", className)} {...props} />,
);
SidebarFooter.displayName = "SidebarFooter";

export const SidebarGroup = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn("space-y-1", className)} {...props} />,
);
SidebarGroup.displayName = "SidebarGroup";

export const SidebarGroupLabel = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p ref={ref} className={cn("px-3 text-xs font-semibold uppercase text-muted-foreground", className)} {...props} />
));
SidebarGroupLabel.displayName = "SidebarGroupLabel";

export const SidebarGroupContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn("space-y-1", className)} {...props} />,
);
SidebarGroupContent.displayName = "SidebarGroupContent";

export const SidebarRail = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn("hidden w-[1px] bg-border md:block", className)} {...props} />,
);
SidebarRail.displayName = "SidebarRail";
