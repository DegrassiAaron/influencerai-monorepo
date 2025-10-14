import localFont from "next/font/local";

import { interFontSources } from "./font-paths";

export const interFont = localFont({
  src: [
    {
      path: interFontSources.normal,
      style: "normal",
      weight: "100 900",
    },
    {
      path: interFontSources.italic,
      style: "italic",
      weight: "100 900",
    },
  ],
  display: "swap",
  variable: "--font-inter",
});

export const bodyFontClassName = interFont.className;
