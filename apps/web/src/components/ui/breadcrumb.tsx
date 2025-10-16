import * as React from 'react';

import { cn } from '@/lib/utils';

const Breadcrumb = ({ children, className, ...props }: React.ComponentProps<'nav'>) => (
  <nav className={cn('flex w-full', className)} aria-label="breadcrumb" {...props}>
    {children}
  </nav>
);
Breadcrumb.displayName = 'Breadcrumb';

const BreadcrumbList = ({ children, className, ...props }: React.ComponentProps<'ol'>) => (
  <ol
    className={cn('flex flex-wrap items-center gap-1 text-sm text-muted-foreground', className)}
    {...props}
  >
    {children}
  </ol>
);
BreadcrumbList.displayName = 'BreadcrumbList';

const BreadcrumbItem = ({ children, className, ...props }: React.ComponentProps<'li'>) => (
  <li className={cn('inline-flex items-center gap-1', className)} {...props}>
    {children}
  </li>
);
BreadcrumbItem.displayName = 'BreadcrumbItem';

const BreadcrumbLink = ({ className, ...props }: React.ComponentProps<'a'>) => (
  <a className={cn('transition-colors hover:text-foreground', className)} {...props} />
);
BreadcrumbLink.displayName = 'BreadcrumbLink';

const BreadcrumbSeparator = ({ className, ...props }: React.ComponentProps<'span'>) => (
  <span className={cn('text-muted-foreground', className)} role="presentation" {...props}>
    /
  </span>
);
BreadcrumbSeparator.displayName = 'BreadcrumbSeparator';

const BreadcrumbPage = ({ className, ...props }: React.ComponentProps<'span'>) => (
  <span className={cn('font-medium text-foreground', className)} aria-current="page" {...props} />
);
BreadcrumbPage.displayName = 'BreadcrumbPage';

export {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
};
