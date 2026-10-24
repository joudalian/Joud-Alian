import type { MetadataRoute } from "next";
import { CATALOG_READY } from "@/config/store";
import { locales } from "@/i18n/locales";
import { categorySlugs, productSlugs } from "@/lib/catalog";
import { alternates } from "@/lib/site";

export const dynamic = "force-dynamic";

// Cart and wishlist are personal pages (noindex), so they are not listed. Until the catalog is ready
// (CATALOG_READY in src/config/store.ts), category and product pages are noindex and left out too.
export const infoPaths = ["/how-to-order", "/faq", "/shipping", "/returns", "/withdrawal", "/contact", "/privacy", "/terms", "/accessibility", "/care"];
const catalogPaths = CATALOG_READY ? [...categorySlugs.map((c) => `/shop/${c}`), ...productSlugs.map((p) => `/product/${p}`)] : [];
const paths = ["", ...(CATALOG_READY ? ["/shop"] : []), "/about", ...infoPaths, ...catalogPaths];

export default function sitemap(): MetadataRoute.Sitemap {
  return paths.flatMap((path) =>
    locales.map((locale) => {
      const { canonical, languages } = alternates(locale, path);
      return {
        url: canonical,
        changeFrequency: "weekly" as const,
        priority: path === "" ? 1 : path.startsWith("/product") ? 0.7 : 0.8,
        alternates: { languages },
      };
    }),
  );
}
