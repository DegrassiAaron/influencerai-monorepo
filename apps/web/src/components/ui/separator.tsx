import * as React from "react";

import { cn } from "@/lib/utils";

export type SeparatorProps = React.HTMLAttributes<HTMLDivElement>;

export const Separator = React.forwardRef<HTMLDivElement, SeparatorProps>(
  ({ className, role = "separator", ...props }, ref) => (
    <div
      ref={ref}
      role={role}
      className={cn("shrink-0 bg-border", className)}
      {...props}
    />
  ),
);

Separator.displayName = "Separator";
