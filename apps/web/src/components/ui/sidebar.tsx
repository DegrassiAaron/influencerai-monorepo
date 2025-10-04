"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

type SidebarContextValue = {
  open: boolean;
  toggle: () => void;
};

const SidebarContext = React.createContext<SidebarContextValue | undefined>(undefined);

export type SidebarProviderProps = {
  children: React.ReactNode;
  defaultOpen?: boolean;
};

export function SidebarProvider({ children, defaultOpen = true }: SidebarProviderProps) {
  const [open, setOpen] = React.useState(defaultOpen);
  const toggle = React.useCallback(() => setOpen((prev) => !prev), []);

  const value = React.useMemo(() => ({ open, toggle }), [open, toggle]);

  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>;
}

export function useSidebar() {
  const context = React.useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }

  return context;
}

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
    <div
      ref={ref}
      className={cn("flex min-h-screen flex-1 flex-col bg-background", className)}
      {...props}
    />
  ),
);
SidebarInset.displayName = "SidebarInset";

export const SidebarHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("px-4 py-3", className)} {...props} />
  ),
);
SidebarHeader.displayName = "SidebarHeader";

export const SidebarContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex-1 space-y-2 px-2 py-4", className)} {...props} />
  ),
);
SidebarContent.displayName = "SidebarContent";

export const SidebarFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("px-4 py-3", className)} {...props} />
  ),
);
SidebarFooter.displayName = "SidebarFooter";

export const SidebarGroup = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("space-y-1", className)} {...props} />
  ),
);
SidebarGroup.displayName = "SidebarGroup";

export const SidebarGroupLabel = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn("px-3 text-xs font-semibold uppercase text-muted-foreground", className)} {...props} />
  ),
);
SidebarGroupLabel.displayName = "SidebarGroupLabel";

export const SidebarGroupContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("space-y-1", className)} {...props} />
  ),
);
SidebarGroupContent.displayName = "SidebarGroupContent";

export const SidebarMenu = React.forwardRef<HTMLUListElement, React.HTMLAttributes<HTMLUListElement>>(
  ({ className, ...props }, ref) => (
    <ul ref={ref} className={cn("space-y-1", className)} {...props} />
  ),
);
SidebarMenu.displayName = "SidebarMenu";

export const SidebarMenuItem = React.forwardRef<HTMLLIElement, React.LiHTMLAttributes<HTMLLIElement>>(
  ({ className, ...props }, ref) => (
    <li ref={ref} className={cn("list-none", className)} {...props} />
  ),
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

export const SidebarRail = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("hidden w-[1px] bg-border md:block", className)} {...props} />
  ),
);
SidebarRail.displayName = "SidebarRail";
