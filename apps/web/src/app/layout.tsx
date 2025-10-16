import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import { Providers } from './providers';
import { cn } from '@/lib/utils';
import { bodyFontClassName } from '@/lib/fonts';

export const metadata: Metadata = {
  title: 'InfluencerAI',
  description: 'Virtual Influencer Content Generation Platform',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn('min-h-screen bg-background font-sans antialiased', bodyFontClassName)}>
        <ThemeProvider>
          <Providers>{children}</Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
