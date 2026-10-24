import { expect, test } from "@playwright/test";
import { locales, waitForHydration } from "./helpers";

// Public pages must never show unfinished content: bracketed placeholders, TODO/TBD/CONFIRM notes,
// lorem ipsum, or empty paragraphs, list items and table cells left behind by an empty config value.
// TODO/TBD/CONFIRM are matched in capitals only: the lowercase words are ordinary text in some languages
// (Spanish and Portuguese "todo", English "confirm").
const placeholder = /\[|\bTODO\b|\bTBD\b|\bCONFIRM\b|\b[Ll]orem\b/;

function visibleText(html: string) {
  const attrs = [...html.matchAll(/\s(?:alt|aria-label|title|placeholder|content)="([^"]*)"/g)].map((m) => m[1]);
  const title = html.match(/<title>([^<]*)<\/title>/)?.[1] ?? "";
  const body = html
    .replace(/<script[\s\S]*?<\/script>/g, " ")
    .replace(/<style[\s\S]*?<\/style>/g, " ")
    .replace(/<head>[\s\S]*?<\/head>/, " ")
    .replace(/<[^>]+>/g, " ");
  return [title, ...attrs, body].join("\n");
}

function findProblems(text: string, html: string, where: string) {
  const problems: string[] = [];
  for (const line of text.split("\n")) {
    const m = line.match(placeholder);
    if (m) problems.push(`"${m[0]}" in "${line.trim().slice(0, 80)}" (${where})`);
  }
  const main = html.match(/<main[\s\S]*<\/main>/)?.[0] ?? "";
  for (const m of main.matchAll(/<(p|li|dd|td|h[1-6])\b[^>]*>\s*<\/\1>/g)) problems.push(`empty <${m[1]}> (${where})`);
  return problems;
}

test("no placeholders or empty gaps on any public page, in any language (server HTML)", async ({ request, isMobile }) => {
  test.skip(isMobile, "run once");
  test.setTimeout(240_000);
  const xml = await (await request.get("/sitemap.xml")).text();
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]!);
  for (const l of locales) urls.push(`/${l}/cart`, `/${l}/wishlist`, `/${l}/does-not-exist`);
  const problems: string[] = [];
  for (const url of urls) {
    const html = await (await request.get(url)).text();
    problems.push(...findProblems(visibleText(html), html, url));
  }
  expect(problems).toEqual([]);
});

test("no placeholders in the rendered order and wishlist pages", async ({ page, isMobile }) => {
  test.skip(isMobile, "run once");
  test.setTimeout(120_000);
  await page.goto("/en");
  await page.evaluate(() => {
    localStorage.setItem("gethsemane.cart.v1", JSON.stringify([{ slug: "nativity-set-classic", qty: 1 }]));
    localStorage.setItem("gethsemane.wishlist.v1", JSON.stringify(["serving-board"]));
  });
  const problems: string[] = [];
  for (const l of locales) {
    for (const path of ["/cart", "/wishlist"]) {
      await page.goto(`/${l}${path}`);
      await waitForHydration(page);
      const text = await page.locator("body").innerText();
      for (const line of text.split("\n")) {
        const m = line.match(placeholder);
        if (m) problems.push(`"${m[0]}" in "${line.trim().slice(0, 80)}" (/${l}${path})`);
      }
    }
  }
  expect(problems).toEqual([]);
});
