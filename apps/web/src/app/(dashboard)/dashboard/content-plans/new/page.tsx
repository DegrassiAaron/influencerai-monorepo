import type { Metadata } from 'next';

import { ContentPlanWizard } from '@/components/content-plans/ContentPlanWizard';

export const metadata: Metadata = {
  title: 'New Content Plan',
  description: 'Configura, genera e approva piani editoriali guidati.',
};

export default function NewContentPlanPage() {
  return <ContentPlanWizard />;
}
