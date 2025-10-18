import { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { DatasetDetailPageClient } from './DatasetDetailPageClient';

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;

  return {
    title: `Dataset ${id} - InfluencerAI`,
    description: `View and manage dataset ${id} for LoRA training and character development.`,
  };
}

export default async function DatasetDetailPage({ params }: Props) {
  const { id } = await params;

  if (!id || typeof id !== 'string') {
    notFound();
  }

  return <DatasetDetailPageClient id={id} />;
}
