"use client";

import * as React from "react";

export type SidebarContextValue = {
  open: boolean;
  toggle: () => void;
};

const SidebarContext = React.createContext<SidebarContextValue | undefined>(undefined);
SidebarContext.displayName = "SidebarContext";

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
SidebarProvider.displayName = "SidebarProvider";

export function useSidebar() {
  const context = React.useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }

  return context;
}
