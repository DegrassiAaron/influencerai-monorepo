'use client';

import { usePathname } from 'next/navigation';
import { Bell, Menu } from 'lucide-react';

import { ThemeToggle } from '@/components/theme-toggle';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

import { mainNav, supportNav } from './nav-config';
import { iconMap } from './icon-map';
import { MobileNavigation } from './mobile-navigation';

export function AppHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b bg-background/95 px-4 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/75">
      <div className="flex items-center gap-3">
        <MobileNavigation
          trigger={
            <Button variant="ghost" size="icon" className="lg:hidden">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Apri navigazione</span>
            </Button>
          }
          activePath={pathname}
          mainNav={mainNav}
          supportNav={supportNav}
          iconMap={iconMap}
        />
        <div className="hidden flex-col text-sm lg:flex">
          <span className="font-semibold text-foreground">InfluencerAI</span>
          <span className="text-xs text-muted-foreground">Virtual Influencer Platform</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          <span className="absolute right-1 top-1 inline-flex h-2 w-2 rounded-full bg-brand-500" />
          <span className="sr-only">Notifiche</span>
        </Button>
        <ThemeToggle />
        <Separator orientation="vertical" className="mx-1 hidden h-6 lg:block" />
        <Button variant="ghost" className="hidden items-center gap-2 px-2 lg:flex">
          <Avatar className="h-8 w-8">
            <AvatarFallback>AP</AvatarFallback>
          </Avatar>
          <div className="flex flex-col items-start">
            <span className="text-sm font-medium leading-none">Arianna P.</span>
            <span className="text-xs text-muted-foreground">Operations Lead</span>
          </div>
        </Button>
      </div>
    </header>
  );
}
