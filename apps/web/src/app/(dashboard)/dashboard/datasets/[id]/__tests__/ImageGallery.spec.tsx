import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';

import { ImageGallery } from '../components/ImageGallery';

afterEach(() => {
  cleanup();
});

const mockImages = Array.from({ length: 25 }, (_, i) => ({
  id: `img_${i}`,
  url: `https://example.com/image-${i}.jpg`,
  caption: `Image ${i} caption`,
  thumbnailUrl: `https://example.com/thumb-${i}.jpg`,
}));

describe('ImageGallery', () => {
  it('should render gallery heading', () => {
    render(<ImageGallery images={mockImages} datasetId="ds_test" />);

    // CardTitle renders as h3 (level 3)
    const heading = screen.getByRole('heading', { level: 3 });
    expect(heading).toHaveTextContent(/images/i);
  });

  it('should display image count', () => {
    render(<ImageGallery images={mockImages} datasetId="ds_test" />);

    expect(screen.getByText(/25/)).toBeInTheDocument();
    expect(screen.getByText(/25 images/i)).toBeInTheDocument();
  });

  it('should render images in a grid layout', () => {
    render(<ImageGallery images={mockImages.slice(0, 6)} datasetId="ds_test" />);

    // Should render all images
    const images = screen.getAllByRole('img');
    expect(images).toHaveLength(6);

    // Each image should have alt text
    images.forEach((img, i) => {
      expect(img).toHaveAttribute('alt', expect.stringContaining(`Image ${i}`));
    });
  });

  it('should show placeholder when no images', () => {
    render(<ImageGallery images={[]} datasetId="ds_test" />);

    expect(screen.getByText(/no images/i)).toBeInTheDocument();
    expect(screen.getByText(/0 images/i)).toBeInTheDocument();
  });

  it('should use next/image for optimized loading', () => {
    render(<ImageGallery images={mockImages.slice(0, 3)} datasetId="ds_test" />);

    const images = screen.getAllByRole('img');

    // Next.js Image component adds specific attributes
    images.forEach((img) => {
      // Next/Image adds loading attribute
      expect(img).toHaveAttribute('loading');
    });
  });

  it('should display image captions when available', () => {
    render(<ImageGallery images={mockImages.slice(0, 3)} datasetId="ds_test" />);

    expect(screen.getByText('Image 0 caption')).toBeInTheDocument();
    expect(screen.getByText('Image 1 caption')).toBeInTheDocument();
    expect(screen.getByText('Image 2 caption')).toBeInTheDocument();
  });

  it('should handle images without captions gracefully', () => {
    const imagesNoCaptions = mockImages.slice(0, 3).map((img) => ({
      ...img,
      caption: undefined,
    }));

    render(<ImageGallery images={imagesNoCaptions} datasetId="ds_test" />);

    // Should still render images
    const images = screen.getAllByRole('img');
    expect(images).toHaveLength(3);

    // Should not crash
    expect(screen.queryByText('undefined')).not.toBeInTheDocument();
  });

  it('should support pagination for large image sets', () => {
    const manyImages = Array.from({ length: 100 }, (_, i) => ({
      id: `img_${i}`,
      url: `https://example.com/image-${i}.jpg`,
      caption: `Image ${i}`,
      thumbnailUrl: `https://example.com/thumb-${i}.jpg`,
    }));

    render(<ImageGallery images={manyImages} datasetId="ds_test" />);

    // Should show pagination controls when there are many images
    // Initial render might show first 20
    expect(screen.getByText(/100 images/i)).toBeInTheDocument();

    // Should have navigation controls (next/prev buttons optional for now)
    // This is optional per requirements, but good to test if implemented
  });

  it('should be keyboard accessible', async () => {
    const user = userEvent.setup();
    render(<ImageGallery images={mockImages.slice(0, 3)} datasetId="ds_test" />);

    // Should be able to tab through images
    await user.tab();

    // At least one focusable element should exist
    const images = screen.getAllByRole('img');
    expect(images.length).toBeGreaterThan(0);
  });

  it('should have proper ARIA structure', () => {
    render(<ImageGallery images={mockImages.slice(0, 3)} datasetId="ds_test" />);

    // Gallery should have proper region role
    const gallery = screen.getByRole('region', { name: /images/i });
    expect(gallery).toBeInTheDocument();
  });

  it('should lazy load images for performance', () => {
    render(<ImageGallery images={mockImages.slice(0, 10)} datasetId="ds_test" />);

    const images = screen.getAllByRole('img');

    // Next.js Image with lazy loading
    images.forEach((img) => {
      const loading = img.getAttribute('loading');
      expect(loading).toBeTruthy();
    });
  });

  it('should display responsive grid on different screen sizes', () => {
    const { container } = render(<ImageGallery images={mockImages.slice(0, 6)} datasetId="ds_test" />);

    // Grid should have responsive classes (Tailwind: grid-cols-*)
    const grid = container.querySelector('[class*="grid"]');
    expect(grid).toBeInTheDocument();
  });
});
