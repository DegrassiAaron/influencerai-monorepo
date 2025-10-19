import type { Metadata } from 'next';
import { ImageGenerationWorkspace } from '@/components/image-generation';

export const metadata: Metadata = {
  title: 'Image Generation Playground',
  description:
    'Crea immagini a partire dal modello LoRA addestrato, sperimentando prompt e parametri diversi.',
};

interface PageProps {
  params: {
    jobId: string;
  };
}

export default function ImageGenerationPage({ params }: PageProps) {
  return <ImageGenerationWorkspace trainingJobId={params.jobId} />;
}
