"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

import { useSidebar } from "./context";

export const SidebarMenu = React.forwardRef<HTMLUListElement, React.HTMLAttributes<HTMLUListElement>>(
  ({ className, ...props }, ref) => (
    <ul ref={ref} className={cn("space-y-1", className)} {...props} />
  ),
);
SidebarMenu.displayName = "SidebarMenu";

export const SidebarMenuItem = React.forwardRef<HTMLLIElement, React.LiHTMLAttributes<HTMLLIElement>>(
  ({ className, ...props }, ref) => <li ref={ref} className={cn("list-none", className)} {...props} />,
);
SidebarMenuItem.displayName = "SidebarMenuItem";

export type SidebarMenuButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean;
  asChild?: boolean;
};

export const SidebarMenuButton = React.forwardRef<HTMLButtonElement, SidebarMenuButtonProps>(
  ({ className, active, asChild, children, ...props }, ref) => {
    const classes = cn(
      "flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
      "hover:bg-muted hover:text-foreground",
      active ? "bg-muted text-foreground" : "text-muted-foreground",
      className,
    );

    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(children, {
        className: cn(classes, (children.props as { className?: string }).className),
        "data-active": active ? "true" : undefined,
      });
    }

    return (
      <button
        ref={ref}
        data-active={active ? "true" : "false"}
        className={classes}
        {...props}
      >
        {children}
      </button>
    );
  },
);
SidebarMenuButton.displayName = "SidebarMenuButton";

export const SidebarTrigger = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ className, ...props }, ref) => {
    const { toggle } = useSidebar();

    return (
      <button
        ref={ref}
        type="button"
        className={cn(
          "inline-flex h-9 w-9 items-center justify-center rounded-md border border-input bg-background text-sm",
          "font-medium transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2",
          "focus-visible:ring-ring focus-visible:ring-offset-2",
          className,
        )}
        onClick={toggle}
        {...props}
      >
        <span className="sr-only">Toggle sidebar</span>
        <svg
          aria-hidden="true"
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
    );
  },
);
SidebarTrigger.displayName = "SidebarTrigger";
