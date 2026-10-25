import { expect, test } from "@playwright/test";
import { findClaims } from "../scripts/forbidden-claims.mjs";
import { categories, products } from "./catalog";
import { locales, publicPageUrls } from "./helpers";

const allowedExternal = ["https://holylandtimber.com", "https://www.instagram.com", "https://www.tiktok.com", "https://www.facebook.com"];

// Crawls every page listed in the sitemap (all languages) plus cart, wishlist and 404,
// and checks that every link, image (including srcset candidates), stylesheet, script and icon resolves.
test("no broken links or images on any page", async ({ request, baseURL, isMobile }) => {
  test.skip(isMobile, "run once");
  test.setTimeout(240_000);
  const origin = baseURL!;
  const pageUrls = new Set(await publicPageUrls(request, origin));
  for (const l of ["en", "fr", "es", "it", "de", "el", "pl", "ro", "uk", "pt"]) {
    pageUrls.add(`${origin}/${l}/cart`);
    pageUrls.add(`${origin}/${l}/wishlist`);
  }
  // Sitemap paths + shop, every category and every product (noindex until CATALOG_READY) + cart and wishlist.
  // (The same whether or not CATALOG_READY moves the catalog into the sitemap.)
  expect(pageUrls.size).toBe(locales.length * (13 + 1 + categories.length + products.length + 2));

  const checked = new Map<string, number>();
  const problems: string[] = [];
  const check = async (url: string, from: string) => {
    if (checked.has(url)) {
      if (checked.get(url)! >= 400) problems.push(`${checked.get(url)} ${url} (on ${from})`);
      return;
    }
    const res = await request.get(url, { maxRedirects: 5 });
    checked.set(url, res.status());
    if (res.status() >= 400) problems.push(`${res.status()} ${url} (on ${from})`);
  };

  for (const pageUrl of pageUrls) {
    const res = await request.get(pageUrl);
    if (res.status() !== 200) {
      problems.push(`${res.status()} page ${pageUrl}`);
      continue;
    }
    const html = await res.text();
    // No forbidden claim in the visible text of any page, in any language.
    const visible = html
      .replace(/<script[\s\S]*?<\/script>/g, " ")
      .replace(/<style[\s\S]*?<\/style>/g, " ")
      .replace(/<[^>]+>/g, " ");
    for (const claim of findClaims(visible)) problems.push(`forbidden claim "${claim}" on ${pageUrl}`);
    for (const m of html.matchAll(/<a\b[^>]*href="https?:\/\/[^"]*"[^>]*>/g)) {
      if (!/rel="noopener noreferrer"/.test(m[0])) problems.push(`external link without rel="noopener noreferrer": ${m[0].slice(0, 80)} (on ${pageUrl})`);
    }
    for (const m of html.matchAll(/<(?:img|script|link|source|iframe)\b[^>]*(?:src|href)="https?:\/\/(?!localhost)[^"]*"/g)) {
      problems.push(`external resource ${m[0].slice(0, 100)} (on ${pageUrl})`);
    }
    const refs = new Set<string>();
    for (const m of html.matchAll(/<(?:a|link)\b[^>]*\shref="([^"]+)"/g)) refs.add(m[1]!);
    for (const m of html.matchAll(/<(?:img|script|source)\b[^>]*\ssrc="([^"]+)"/g)) refs.add(m[1]!);
    for (const m of html.matchAll(/\s(?:srcSet|srcset|imageSrcSet)="([^"]+)"/g)) {
      // Inline data: URIs (e.g. the art-direction placeholder) are not fetched and may contain commas.
      if (m[1]!.startsWith("data:")) continue;
      for (const candidate of m[1]!.split(",")) refs.add(candidate.trim().split(/\s+/)[0]!);
    }
    for (const m of html.matchAll(/<meta\b[^>]*property="og:image"[^>]*content="([^"]+)"/g)) refs.add(m[1]!);
    for (const raw of refs) {
      const ref = raw.replace(/&amp;/g, "&");
      if (ref.startsWith("#") || ref.startsWith("mailto:") || ref.startsWith("tel:") || ref.startsWith("data:")) continue;
      const url = new URL(ref, pageUrl);
      if (url.origin !== origin) {
        // Only the sister store and our social accounts may be linked; nothing external is ever loaded.
        if (!allowedExternal.includes(url.origin)) problems.push(`external reference ${url.href} (on ${pageUrl})`);
        continue;
      }
      url.hash = "";
      await check(url.href, pageUrl);
    }
  }
  console.log(`Checked ${pageUrls.size} pages and ${checked.size} unique URLs.`);
  expect(problems).toEqual([]);
});
