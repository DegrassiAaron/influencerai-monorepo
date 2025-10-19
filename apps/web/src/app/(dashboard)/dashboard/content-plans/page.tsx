import type { Metadata } from 'next';

import { ContentPlansListPage } from '@/components/content-plans/ContentPlansListPage';

export const metadata: Metadata = {
  title: 'Content Plans',
  description: 'Monitora e gestisci i content plan generati dal team.',
};

export default function ContentPlansPage() {
  return <ContentPlansListPage />;
}
