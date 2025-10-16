import { Metadata } from 'next';

import { ContentPlanWizard } from '@/components/content-plans/ContentPlanWizard';

export const metadata: Metadata = {
  title: 'Content Plans Wizard',
  description: 'Configura, genera e approva piani editoriali guidati.',
};

export default function ContentPlansPage() {
  return <ContentPlanWizard />;
}
