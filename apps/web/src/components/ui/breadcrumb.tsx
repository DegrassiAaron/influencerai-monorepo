import * as React from "react";
import Link from "next/link";

import { cn } from "@/lib/utils";

export type BreadcrumbItem = {
  label: string;
  href?: string;
};

export type BreadcrumbProps = {
  items: BreadcrumbItem[];
  className?: string;
};

export function Breadcrumb({ items, className }: BreadcrumbProps) {
  if (!items.length) {
    return null;
  }

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn("flex items-center gap-1 text-sm text-muted-foreground", className)}
    >
      <ol className="flex items-center gap-1">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          const content = item.href && !isLast ? (
            <Link
              className="transition-colors hover:text-foreground"
              href={item.href}
            >
              {item.label}
            </Link>
          ) : (
            <span aria-current={isLast ? "page" : undefined}>{item.label}</span>
          );

          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-1">
              {index > 0 && <span className="text-muted-foreground/70">/</span>}
              {content}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
