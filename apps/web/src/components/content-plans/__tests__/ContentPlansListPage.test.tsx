import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';

import { ContentPlansListPage } from '../ContentPlansListPage';
import type { ContentPlanJob, ListContentPlansParams } from '@/lib/content-plans';

vi.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }: { children: ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

const mockListContentPlans = vi.fn<(params?: ListContentPlansParams) => Promise<ContentPlanJob[]>>();

vi.mock('@/lib/content-plans', async () => {
  const actual = await vi.importActual<typeof import('@/lib/content-plans')>('@/lib/content-plans');
  return {
    ...actual,
    listContentPlans: mockListContentPlans,
  };
});

function renderWithProviders(children: ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return render(<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>);
}

describe('ContentPlansListPage', () => {
  beforeEach(() => {
    mockListContentPlans.mockReset();
  });

  it('renders fetched content plans into the table', async () => {
    const plans: ContentPlanJob[] = [
      {
        id: 'job_1',
        plan: {
          influencerId: 'inf_1',
          theme: 'Summer Glow',
          targetPlatforms: ['instagram'],
          posts: [{ caption: 'Caption', hashtags: ['#summer'] }],
          createdAt: '2024-01-01T10:00:00.000Z',
          approvalStatus: 'approved',
        },
      },
    ];
    mockListContentPlans.mockResolvedValue(plans);

    renderWithProviders(<ContentPlansListPage />);

    await waitFor(() => expect(mockListContentPlans).toHaveBeenCalledWith({}));

    expect(await screen.findByText('Summer Glow')).toBeInTheDocument();
    expect(screen.getByText('Approved')).toBeInTheDocument();
    expect(screen.getByText('inf_1')).toBeInTheDocument();
  });

  it('applies influencer filter on submit', async () => {
    mockListContentPlans.mockResolvedValue([]);

    renderWithProviders(<ContentPlansListPage />);

    await waitFor(() => expect(mockListContentPlans).toHaveBeenCalledWith({}));

    mockListContentPlans.mockResolvedValue([]);
    await userEvent.type(screen.getByLabelText(/Influencer ID/i), 'inf_99');
    await userEvent.click(screen.getByRole('button', { name: /applica/i }));

    await waitFor(() =>
      expect(mockListContentPlans).toHaveBeenLastCalledWith({ influencerId: 'inf_99' })
    );
  });
});
