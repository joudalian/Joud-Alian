import { EB_Garamond, Inter } from "next/font/google";

// next/font downloads these at build time and serves them from this site; no request goes to Google at runtime.
export const garamond = EB_Garamond({
  subsets: ["latin"], // preloaded; latin-ext, Greek and Cyrillic faces are still served and load on demand via unicode-range
  weight: ["500", "600"],
  display: "swap",
  variable: "--font-garamond",
});

export const inter = Inter({
  subsets: ["latin"], // preloaded; latin-ext, Greek and Cyrillic faces are still served and load on demand via unicode-range
  display: "swap",
  variable: "--font-inter",
});
