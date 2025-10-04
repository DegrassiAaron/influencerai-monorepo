export type NavItem = {
  title: string;
  href: string;
  icon?: string;
  description?: string;
};

export const mainNav: NavItem[] = [
  {
    title: "Overview",
    href: "/",
    icon: "layout-dashboard",
    description: "Sintesi dello stato della piattaforma.",
  },
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: "bar-chart-3",
    description: "Metriche operative e performance.",
  },
  {
    title: "Jobs",
    href: "/jobs",
    icon: "briefcase",
    description: "Pipeline di generazione e stato dei job.",
  },
  {
    title: "Library",
    href: "/library",
    icon: "library",
    description: "Asset creativi e dataset condivisi.",
  },
];

export const supportNav: NavItem[] = [
  {
    title: "Status Page",
    href: "https://status.influencer.ai",
    icon: "activity",
  },
  {
    title: "Documentation",
    href: "https://docs.influencer.ai",
    icon: "book-open",
  },
];
