'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

import { mainNav, supportNav } from './nav-config';
import { iconMap } from './icon-map';

function NavButton({
  href,
  label,
  description,
  isActive,
  icon,
}: {
  href: string;
  label: string;
  description?: string;
  isActive: boolean;
  icon?: string;
}) {
  const Icon = icon ? iconMap[icon] : undefined;
  return (
    <Button
      variant={isActive ? 'secondary' : 'ghost'}
      asChild
      className={cn(
        'h-auto w-full justify-start gap-3 px-3 py-2 text-left font-medium',
        isActive && 'bg-brand-50 text-brand-700 hover:bg-brand-100'
      )}
    >
      <Link href={href}>
        <div className="flex items-center gap-3">
          {Icon ? (
            <Icon
              className={cn('h-4 w-4', isActive ? 'text-brand-600' : 'text-muted-foreground')}
            />
          ) : null}
          <div className="flex flex-col">
            <span>{label}</span>
            {description ? (
              <span className="text-xs font-normal text-muted-foreground">{description}</span>
            ) : null}
          </div>
        </div>
      </Link>
    </Button>
  );
}

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-72 shrink-0 border-r bg-card/60 px-4 py-6 lg:flex lg:flex-col">
      <Link href="/" className="flex items-center gap-2 px-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white shadow-brand">
          IA
        </span>
        <div className="flex flex-col text-sm">
          <span className="font-semibold text-foreground">InfluencerAI</span>
          <span className="text-xs text-muted-foreground">Operations Suite</span>
        </div>
      </Link>
      <Badge className="mt-4 w-fit bg-brand-100 text-brand-700" variant="brand">
        v0.6 WEB Shell
      </Badge>
      <nav className="mt-6 space-y-1">
        {mainNav.map((item) => (
          <NavButton
            key={item.href}
            href={item.href}
            label={item.title}
            description={item.description}
            icon={item.icon}
            isActive={pathname === item.href}
          />
        ))}
      </nav>
      <Separator className="my-6" />
      <nav className="space-y-1">
        {supportNav.map((item) => {
          const Icon = item.icon ? iconMap[item.icon] : undefined;
          return (
            <Button
              key={item.href}
              variant="ghost"
              asChild
              className="h-auto w-full justify-start gap-3 px-3 py-2 text-left font-medium"
            >
              <Link href={item.href} target="_blank" rel="noreferrer">
                <div className="flex items-center gap-3">
                  {Icon ? <Icon className="h-4 w-4 text-muted-foreground" /> : null}
                  <span>{item.title}</span>
                </div>
              </Link>
            </Button>
          );
        })}
      </nav>
      <div className="mt-auto rounded-lg border border-dashed border-border/60 bg-muted/50 p-4 text-xs text-muted-foreground">
        <p className="font-medium text-foreground">Suggerimento</p>
        <p className="mt-2">
          Organizza i workflow del team direttamente dalla dashboard: crea viste salvate per
          campagne, personaggi e sprint.
        </p>
      </div>
    </aside>
  );
}
