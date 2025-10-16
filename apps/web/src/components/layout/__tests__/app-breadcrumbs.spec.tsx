import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { AppBreadcrumbs } from '@/components/layout/app-breadcrumbs';

const mockUsePathname = vi.fn();

vi.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
}));

vi.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, ...props }: { children: ReactNode; href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe('AppBreadcrumbs', () => {
  it('formats breadcrumb labels using nav titles and title casing', () => {
    mockUsePathname.mockReturnValue('/dashboard/content-plans/new-campaign');

    render(<AppBreadcrumbs />);

    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('href', '/dashboard');
    expect(screen.getByRole('link', { name: 'Content Plans' })).toHaveAttribute(
      'href',
      '/dashboard/content-plans'
    );
    expect(screen.getByText('New Campaign')).toBeInTheDocument();
  });
});
