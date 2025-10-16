"use client";

import { usePathname } from "next/navigation";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

import { mainNav } from "./nav-config";

const LABEL_OVERRIDES = new Map<string, string>([["/login", "Login"]]);

const NAV_LABELS = mainNav.reduce((registry, item) => {
  if (!item.href.startsWith("http")) {
    registry.set(item.href, item.title);
  }
  return registry;
}, new Map<string, string>());

function toTitleCase(segment: string) {
  const decoded = decodeURIComponent(segment);
  return decoded
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function resolveLabel(href: string, segment: string) {
  return NAV_LABELS.get(href) ?? LABEL_OVERRIDES.get(href) ?? toTitleCase(segment);
}

export function AppBreadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  const crumbs = segments.map((segment, index) => {
    const href = `/${segments.slice(0, index + 1).join("/")}`;
    const label = resolveLabel(href, segment);
    const isLast = index === segments.length - 1;
    return {
      href,
      label,
      isLast,
    };
  });

  if (crumbs.length === 0) {
    return null;
  }

  return (
    <Breadcrumb className="w-full">
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink href="/">Home</BreadcrumbLink>
        </BreadcrumbItem>
        {crumbs.map((crumb) => (
          <BreadcrumbItem key={crumb.href}>
            <BreadcrumbSeparator />
            {crumb.isLast ? (
              <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
            ) : (
              <BreadcrumbLink href={crumb.href}>{crumb.label}</BreadcrumbLink>
            )}
          </BreadcrumbItem>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
