import type { Metadata } from "next";
import type { ReactNode } from "react";
import { siteUrl } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = { metadataBase: new URL(siteUrl) };

// The <html> element lives in app/[locale]/layout.tsx so that its lang attribute matches the page.
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
