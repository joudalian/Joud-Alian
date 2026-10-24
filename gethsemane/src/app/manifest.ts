import type { MetadataRoute } from "next";
import { defaultLocale } from "@/i18n/locales";
import { STORE_NAME } from "@/config/store";

// Colors match the design tokens --cream and --olive-900 in src/app/globals.css.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${STORE_NAME} — Olive Wood · Holy Land`,
    short_name: STORE_NAME,
    start_url: `/${defaultLocale}`,
    display: "browser",
    background_color: "#f6efdf",
    theme_color: "#2a3519",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
