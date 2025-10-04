import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Inter } from "next/font/google";

import { cn } from "@/lib/utils";

import "./globals.css";
import { Providers } from "./providers";

const font = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "InfluencerAI",
  description: "Virtual Influencer Content Generation Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={cn("min-h-screen bg-background font-sans antialiased", font.className)}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
