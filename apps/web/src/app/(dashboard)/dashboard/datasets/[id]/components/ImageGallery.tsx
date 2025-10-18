'use client';

import Image from 'next/image';
import { ImageIcon } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export type GalleryImage = {
  id: string;
  url: string;
  caption?: string;
  thumbnailUrl?: string;
};

export type ImageGalleryProps = {
  images: GalleryImage[];
  datasetId?: string; // Optional for future features (e.g., image upload)
};

export function ImageGallery({ images }: ImageGalleryProps) {
  return (
    <section role="region" aria-label="Dataset images" className="w-full">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-muted-foreground" />
            <span>Images</span>
          </CardTitle>
          <CardDescription>
            {images.length} {images.length === 1 ? 'image' : 'images'} in this dataset
          </CardDescription>
        </CardHeader>
        <CardContent>
          {images.length === 0 ? (
            <div className="flex min-h-[200px] flex-col items-center justify-center rounded-lg border-2 border-dashed border-border/60 bg-muted/20 p-8 text-center">
              <ImageIcon className="mb-4 h-12 w-12 text-muted-foreground/40" />
              <p className="text-sm font-medium text-muted-foreground">No images found</p>
              <p className="mt-1 text-xs text-muted-foreground/80">
                Upload images to this dataset to get started
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {images.map((image) => (
                <div
                  key={image.id}
                  className="group relative aspect-square overflow-hidden rounded-lg border border-border/60 bg-muted/20 transition-all hover:border-border hover:shadow-md"
                >
                  <Image
                    src={image.thumbnailUrl || image.url}
                    alt={image.caption || `Image ${image.id}`}
                    fill
                    className="object-cover transition-transform group-hover:scale-105"
                    sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
                    loading="lazy"
                  />
                  {image.caption && (
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
                      <p className="line-clamp-2 text-xs text-white">{image.caption}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
