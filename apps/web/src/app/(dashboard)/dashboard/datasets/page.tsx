import { Metadata } from 'next';

import { DatasetsPageClient } from './DatasetsPageClient';

export const metadata: Metadata = {
  title: 'Datasets - InfluencerAI',
  description:
    'Manage image datasets for LoRA training and character development. Upload, organize, and prepare training data for consistent influencer appearances.',
};

export default function DatasetsPage() {
  return <DatasetsPageClient />;
}
