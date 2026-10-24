# Gethsemane — Olive Wood · Holy Land

**Gethsemane** means “oil press” (Aramaic/Hebrew *gat shmanim*); it is the olive garden at the foot of the
Mount of Olives. The store is an online store for handmade olive wood gifts from Bethlehem in the
Holy Land (nativity sets, crosses, rosaries and home decor), and the sister store of
[holylandtimber.com](https://holylandtimber.com).

Built with Next.js 16 (App Router), React 19, TypeScript (strict) and next-intl.

## Brand

The approved brand files live in `brand/` at the repository root (outside this app):

| File                     | What it is                                                     |
| ------------------------ | -------------------------------------------------------------- |
| `gethsemane-logo.png`    | Full emblem with wordmark and tagline, 1024×1024               |
| `gethsemane-icon.png`    | Emblem without text, 1024×1024                                 |
| `gethsemane-logo.svg`    | Vector source of the full emblem                               |

`npm run assets` turns them into the files the site serves (all committed, so builds do not need `brand/`):

- `public/brand/gethsemane-mark.svg`: the compact mark used in the header, the footer and the home hero, built
  from the SVG by `scripts/brand-mark.mjs` (arch scene with the olive tree, olive press and cross; no outer gold
  rings, no cream background, no text). It is served as a file through `<img>`, never inlined, so its clipPath id
  cannot clash and the CSP is unchanged. The wordmark **GETHSEMANE** next to it is live text in the heading font;
  the footer adds the tagline **OLIVE WOOD · HOLY LAND**. The logo is English in every language.
- `public/brand/gethsemane-logo.png`: the full emblem, shown on the Our Story page.
- Favicons from `gethsemane-icon.png`: `app/favicon.ico` (16/32/48) and `public/icons/favicon-16|32|48.png` use a
  tight crop of the arch, tree and cross, because the full icon is unreadable at those sizes;
  `apple-touch-icon.png` (180) and the manifest icons `icon-192.png` / `icon-512.png` use the full icon.
- `public/brand/og-image.png` (1200×630, Open Graph and Twitter): the full emblem centred on cream, uncropped.

The SVG's own text depends on a system font, so it is never used as-is in production; any lockup with text
uses the PNG or live text.

**Palette** (design tokens, defined once in `:root` in `src/app/globals.css`, matched to the logo): olive
`#6B7B34` (`--olive-600`), dark olive `#4F5E27` (`--olive-700`), gold `#B8923A` (`--gold-500`, decorative only),
cream `#F6EFDF` (`--cream`), walnut `#4A3222` (`--ink`, main text). Gold text on cream uses the darker
`--gold-text`. `npm run check:contrast` checks every text/background pair against WCAG AA, and the image
generator reads the same tokens.

**Type**: EB Garamond for headings and the wordmark, Inter for body text (self-hosted by `next/font`).

## Editing products

All product data is in **one file: `src/data/products.ts`**. Each entry looks like this:

```ts
{
  id: 13,                                   // unique number, never reuse one
  slug: "olive-wood-angel",                 // URL: /en/product/olive-wood-angel (lowercase, numbers, dashes)
  category: "nativity",                     // "nativity" | "crosses" | "rosaries" | "home"
  priceUsd: 29,                             // price in US dollars
  image: "/images/products/olive-wood-angel.jpg", // file in /public
  featured: true,                           // optional: show on the home page
  text: {
    en: { name: "Olive Wood Angel", description: "…" },
    fr: { name: "…", description: "…" },
    // …all 10 languages are required: en, fr, es, it, de, el, pl, ro, uk, pt
  },
},
```

**Add a product**: copy an existing entry, give it a new `id` and `slug`, fill in the price and the name and
description in all 10 languages, and put its photo in `public/images/products/`.

**Replace a placeholder photo**: save your photo over the placeholder file with the same name (for example
`public/images/products/salad-bowl.webp`), or save it under a new name (`.webp`, `.jpg`, `.png` or `.avif`)
and change `image` in the data file. Use portrait photos with a 4:5 ratio (for example 1200×1500 px); other
ratios are cropped to fit. Next.js serves them in the right size and format automatically. The product page's
main photo (its largest paint) is served from static copies instead: `scripts/size-product-images.mjs` writes
AVIF and WebP versions at 400–1600 px wide to `public/images/products/sized/` before every `npm run build` and
`npm run dev` (they are generated, not committed). Nothing to do by hand.

**Remove a product**: delete its entry (and its photo).

Then run `npm run check:i18n`: it fails if any product is missing a language, has a duplicate id or slug, an
unknown category, an invalid price or an image file that does not exist. `npm run assets` creates a neutral
placeholder image (cream card with the logo mark and the product name) for any product whose image file is missing;
it never overwrites existing photos (use `npm run assets -- --force-placeholders` to reset them all).

The current 12 products, their names, descriptions, photos and prices are **placeholders**.

## Ordering via WhatsApp

There is **no online checkout** and no payment on the site. Visitors collect pieces in **Your order**
(`/[locale]/cart`, "Add to order" on every product), optionally add their name, country, notes and a gift note
(kept only in their browser; "Clear my saved details" removes them), and press **Send order on WhatsApp**: it
opens `https://wa.me/<number>` with a message in the visitor's language listing the items, quantities, prices in
USD (plus an approximate total in the chosen currency) and those details. For the owner, every line also carries
the English product name and SKU (`GTH-001`…), and a line names the site language. A ticked gift-note box is
always mentioned, even without text. Very long notes are shortened in the link (wa.me links over ~2000 encoded
characters fail in some apps); the visitor is told, and the full text stays in the **Copy message** fallback and
its preview. When `CONTACT_EMAIL` is set, a "send it by email" link appears too. On the product page the primary
action is **Add to order**; **Order only this piece** opens WhatsApp for that one piece. Contact-page messages
start with an English "Subject:" line so the owner sees the topic in any language. The order is then confirmed personally on WhatsApp: availability, shipping cost,
delivery estimate and how to pay (see `docs/OPERATIONS.md`).

**Change the WhatsApp number** in `src/config/store.ts`:

```ts
export const WHATSAPP_NUMBER = "970569741193"; // country code + number, digits only, no "+"
```

The message wording is in the `whatsapp` section of each `messages/<locale>.json`.

## Currencies

USD (base), EUR, GBP, CAD and AUD. **The conversion rates are fixed values in `src/lib/currency.ts`, not live
rates: update them on launch day and then monthly, together with `RATES_AS_OF`** (shown as "rates as of …"
next to converted prices). The visitor's choice is stored in a cookie, so prices render in the right currency on
the first paint.

## Languages

Exactly ten, all left-to-right, English by default: `en` English, `fr` Français, `es` Español, `it` Italiano,
`de` Deutsch, `el` Ελληνικά, `pl` Polski, `ro` Română, `uk` Українська, `pt` Português.

Every page lives under a locale prefix (`/en`, `/fr/shop`, …). A request without one is redirected to the
saved language (`NEXT_LOCALE` cookie), else the best `Accept-Language` match, else English. Pages set
`<html lang>`, a canonical URL and hreflang links for all 10 languages plus `x-default`. Interface text is in
`messages/<locale>.json`; product text is in `src/data/products.ts`. `npm run check:i18n` fails on any missing,
extra, empty or malformed message, and if Arabic text or right-to-left handling appears in the project.

**Phone navigation labels** must fit in one fifth of a 320 px screen. Two-word labels wrap onto a second line, and
below 375 px and 340 px the text steps down slightly (the tap targets stay 64×63 px). Keep `nav.home`,
`nav.shop`, `nav.wishlist` and `nav.orderShort` short (German uses "Merkliste"); the visible label must stay part
of the link's accessible name. `tests/layout.spec.ts` fails if a label is cut off or overlaps at 320, 360 or
390 px in any language.

## Store settings (`src/config/store.ts`)

Every business detail shown on the site lives in **one file, `src/config/store.ts`**: WhatsApp number, legal
name, tax ID, address, contact email, opening hours and time zone, social links, sister store, where orders ship
from (per language), processing and delivery times (overall and by region), return and damage-report windows,
payment mode, announcement bar, policy and accessibility dates, data-retention period, governing law, quote
validity, ship-to countries (structured data only), the launch gate `CATALOG_READY` and the EU product-safety
block. Opening hours are shown with `TIMEZONE_LABEL` ("Bethlehem time" in each language), never the IANA ID;
check `OPENING_HOURS.days`, since the Palestinian work week is often Sunday–Thursday.
**Every value is marked `// CONFIRM`** and must be checked before launch. Optional fields render only when
non-empty: an empty `CONTACT_EMAIL` hides the email everywhere, an empty `SOCIAL` entry renders no icon,
`ANNOUNCEMENT.enabled: false` hides the bar, an empty `GOVERNING_LAW` hides the governing-law sentence on the
terms page (the sentence that the consumer-protection law of the customer's country always applies is always
shown), and `DATA_RETENTION_YEARS = 0` makes the privacy page say that order details are kept only as long as
needed to fulfil the order and meet legal obligations such as accounting. Public pages never show a placeholder:
`tests/placeholders.spec.ts` scans every page in all 10 languages for `[`, `TODO`, `TBD`, `CONFIRM`, "lorem" and
empty paragraphs, list items or table cells.

**Delivery times have one source of truth.** `DELIVERY_TIME` (7–15 business days after dispatch) is the headline
shown everywhere as "typically 7–15 business days": home trust strip, FAQ, shipping page, product page, order
page and the Product JSON-LD (`transitTime` 7–15, Monday–Friday business days). `DELIVERY_BY_REGION` only feeds
the "Estimated delivery by region" table on the shipping and product pages, which always carries "These are
estimates, not guarantees. Customs and remote destinations can take longer." Change the numbers only in
`src/config/store.ts`; `npm run check:claims` fails if any message states a delivery range other than
`DELIVERY_TIME` or drops the placeholders or the "typically" wording.

Wording that is a factual claim and must also be confirmed by the owner (in `messages/<locale>.json`):
`home.point1Text`, `faq.a3` and `about.p1` say the wood comes from **pruned branches** (not felled trees).

**Payment**: with `PAYMENT_MODE = "instructions"` the site says only that payment instructions are sent on
WhatsApp after the order is confirmed. With `"link"` it says a payment link is sent and, if `PAYMENT_METHODS`
is non-empty, names the methods. No payment brands, logos or "secure checkout" wording appear on the site.

## Pages

Home, shop (`/[locale]/shop`), category (`/[locale]/shop/[category]`), product (`/[locale]/product/[slug]`),
Our Story (`/[locale]/about`), and the help and policy pages: how to order, FAQ, shipping, returns (with the
model withdrawal form), contact (WhatsApp with topic chips; no form), privacy, terms (with legal notice),
accessibility, care and **withdraw from a contract** (`/withdrawal`: the model form plus a prefilled WhatsApp
notice, and an email button when `CONTACT_EMAIL` is set; no backend). Your order (`/cart`) and wishlist are
`noindex`. Localized 404 (HTTP 404) and error pages, `/sitemap.xml` (hreflang alternates and `x-default`),
`/robots.txt` and `/.well-known/security.txt` (expires one year after each build).

**Launch gate.** `CATALOG_READY = false` in `src/config/store.ts` keeps the placeholder catalog out of search
engines: shop, category and product pages are `noindex`, they are left out of the sitemap (12 paths × 10
languages until then), and no Product offers are published in structured data. Visitors see the pages as usual.
**Setting `CATALOG_READY = true` is the last launch step**, followed by `npm run check:launch` (not part of
`verify`), which fails while the gate is closed, while any product text says "Placeholder" or any product image is
a generated placeholder (hashes in `scripts/placeholder-hashes.json`), or if `SITE_URL` is missing, not https, or
a `vercel.app`/localhost host. The owner's ordered checklist is in `docs/LAUNCH.md`.

There is no cookie banner because the site sets no tracking cookies: only two preference cookies, `NEXT_LOCALE`
(set on the first visit) and `currency` (set when the visitor picks one), both for one year, and localStorage for the order, wishlist and order details (see the privacy page). There is
no analytics and no order tracking on the site.

**Structured data** (JSON-LD): Organization (street, Bethlehem, `PS`; `sameAs` lists only our own social
accounts) with `MerchantReturnPolicy` (every page), WebSite (home), BreadcrumbList (inner pages, About included),
Product with `url`, SKU and, once `CATALOG_READY`, an `Offer` in USD whose availability comes from each product's
`availability` field (`in_stock`, `made_to_order` (default) or `sold_out`), FAQPage (FAQ). Shipping details and the
return policy's `applicableCountry` are published only for the ISO codes in `SHIP_TO_COUNTRIES` (empty = left out;
no "ZZ" placeholder). None of it contains ratings or reviews.

**Story photo**: the home page shows the Our Story emblem until a real workshop photo exists. Save it as
`public/images/story/workshop.webp`, 1200×900 px (4:3), and rebuild: the build detects the file and the home
page uses it (alt text: `home.storyImageAlt`).

## Legal pages are templates

The privacy, terms, returns, shipping and accessibility pages are **plain-language templates written for this
store, not legal advice. Have them reviewed by a lawyer** in the main markets before launch. Open questions for
that review:

- **Governing law and jurisdiction**: `GOVERNING_LAW` is empty, so the terms show only the consumer-protection
  sentence until it is set.
- **Withdrawal function**: EU Directive 2023/2673 requires a "withdraw from contract" function for contracts
  concluded online from 19 June 2026. Orders here are concluded on WhatsApp (a chat), not on the site; the
  `/withdrawal` page offers a prefilled WhatsApp notice and the model form, but **whether that satisfies the rule
  for chat-concluded contracts needs a legal opinion.**
- **Contract formation** (terms): the WhatsApp message is a request to order; the contract is formed when the
  customer accepts the confirmed total; quotes expire after `QUOTE_VALID_HOURS` (48); confirmation on a durable
  medium. Confirm this matches how orders are really handled.
- **Product safety (EU GPSR)**: selling into the EU may require a manufacturer and an EU responsible person on
  every product page. Fill `MANUFACTURER_NAME`, `MANUFACTURER_ADDRESS`, `MANUFACTURER_EMAIL` and
  `EU_RESPONSIBLE_PERSON` (a "Product safety information" block then appears) **after legal advice**.
- **Privacy**: names Vercel (USA) as host, the transfer of data to and from Bethlehem, the two preference cookies
  and the legal bases; check them against the final setup.
- **Origin marking** for the US and EU (e.g. "Made in Bethlehem" / "Product of the West Bank") on packaging,
  invoices and customs forms.
- **Trademark clearance** for the name "Gethsemane" in the target markets.
- Legal entity name, tax ID and address for the legal notice (`LEGAL_ENTITY_NAME`, `TAX_ID`, `ADDRESS`).
- Data-retention period for order records (`DATA_RETENTION_YEARS`), and whether a contact email is required.
- The ODR platform link is intentionally absent (the EU ODR platform closed on 20 July 2025).
- `RETURN_DAYS` can never be set below 14 (the build fails), so the change-of-mind window never undercuts the
  statutory withdrawal period.

## Honesty check

`npm run check:claims` (part of `verify`) scans every message file, the product data and the store settings, in
all 10 languages, for claims the store must not make: online checkout or card payments, SSL/256-bit, payment
brands, "secure checkout", "data never stored", "insured", "24/7", "fair trade", "Christian artisans", "since
1999", "family-owned", "passed down through generations", "blessed", "100% untreated", "air-dried for months",
"never cut", "never felled", "free shipping", star ratings or reviews. The patterns are in `scripts/forbidden-claims.mjs`; the
link-crawl test also checks the rendered pages. The same command checks that delivery times match
`DELIVERY_TIME` (see Store settings).

## Security

- Per-request nonce Content-Security-Policy (`src/proxy.ts`): `default-src 'self'`, scripts only with the
  nonce (`'strict-dynamic'`, no `'unsafe-eval'`), images from self/data/blob, fonts from self,
  `object-src 'none'`, `frame-ancestors 'none'`, `upgrade-insecure-requests`. Styles allow `'unsafe-inline'`
  (required by `next/image` inline styles). Every page is rendered per request because of the nonce.
- Static headers on every response (`src/lib/security-headers.ts`): HSTS (`max-age=63072000`, without
  `includeSubDomains` and `preload`: add them only once every subdomain of the domain serves HTTPS for good, since
  preload is hard to undo), `X-Content-Type-Options: nosniff`,
  `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`
  (camera, microphone, geolocation, payment and more disabled), COOP/CORP `same-origin`. No `X-Powered-By`,
  no production source maps.
- No third-party scripts, trackers, CDNs or iframes; fonts are self-hosted; all images are local. The only
  external links are WhatsApp, the sister store and its Instagram (plus our own social accounts once set), with `rel="noopener noreferrer"`.
- Everything read from localStorage or cookies is size-limited, parsed safely, validated with zod and capped
  (`src/lib/storage.ts`).
- No secrets in the repository; `.env.example` lists the only variable, `SITE_URL`.

## Scripts

| Command                  | What it does                                                                      |
| ------------------------ | --------------------------------------------------------------------------------- |
| `npm run dev`            | Development server                                                                |
| `npm run build` / `start`| Production build / server                                                         |
| `npm run typecheck`      | TypeScript, strict                                                                |
| `npm run lint`           | ESLint, zero warnings allowed                                                     |
| `npm run check:i18n`     | Translations (same numbers in every language), product data, no Arabic / RTL     |
| `npm run check:contrast` | WCAG AA contrast of the design tokens                                             |
| `npm run check:claims`   | Fails on forbidden claims or a delivery range that differs from the config, in all languages |
| `npm run check:links`    | Crawls all 310 pages for broken links and images                                  |
| `npm test`               | Playwright tests on the production build (desktop + mobile)                       |
| `npm run audit`          | `npm audit --audit-level=high`                                                    |
| `npm run verify`         | typecheck → lint → i18n → claims → contrast → build → audit → all tests           |
| `npm run check:launch`   | Launch gate (not in verify): catalog open, real product texts and photos, real `SITE_URL` |
| `npm run assets`         | Rebuilds brand files, favicons and images from `../brand/`; creates missing product placeholders |

Requires Node.js 22 (22.18 or newer; the check scripts read `src/data/products.ts` directly). On a fresh machine,
install the test browser once with `npx playwright install chromium`. `npm run verify` builds with
`SITE_URL=http://localhost:3100` (the test server) unless you set one. CI (`.github/workflows/verify.yml`) runs
`npm run verify` on every push and pull request; Dependabot (`.github/dependabot.yml`) proposes dependency updates
weekly.

## Deploying

The site needs a Node.js server (it is not a static export, because each page gets a fresh CSP nonce).

**Vercel** (simplest):

1. Import the repository and set the project's *Root Directory* to `gethsemane`.
2. Add the environment variable `SITE_URL=https://your-domain` (no trailing slash) for Production. It drives
   canonical URLs, hreflang links, the sitemap, `robots.txt`, JSON-LD and Open Graph URLs. Without it, Vercel
   production builds use `VERCEL_PROJECT_PRODUCTION_URL` and previews their `VERCEL_URL`; **a production build
   with none of these fails** rather than publishing localhost URLs. Note that Vercel's Hobby plan is for
   non-commercial use; a shop needs a Pro plan.
3. **Settings → Deployment Protection: turn Vercel Authentication off** for Production, otherwise visitors and
   search engines get a Vercel login page.
4. **Settings → Domains**: add the custom domain (and `www`), and set the `*.vercel.app` domain to **redirect
   (301) to the custom domain**. Even without that redirect, `*.vercel.app` hosts are served with
   `X-Robots-Tag: noindex` and a `robots.txt` that disallows everything, so they never compete with the real
   domain.
5. Check the live domain (replace `example.com`):

   ```bash
   curl -sI https://example.com/en | grep -i x-robots-tag          # must print nothing
   curl -s https://example.com/robots.txt                           # "Allow: /" and "Sitemap: https://example.com/sitemap.xml"
   curl -s https://example.com/sitemap.xml | grep -o '<loc>[^<]*' | grep -v '<loc>https://example.com/'   # must print nothing
   curl -sI https://example-git-main-you.vercel.app/en | grep -i x-robots-tag   # "noindex, nofollow" on previews
   ```

6. After the first deployment: verify the domain in **Google Search Console** and **Bing Webmaster Tools**
   and submit `https://your-domain/sitemap.xml` in both (after `CATALOG_READY = true`, resubmit it).

Vercel runs `npm run build` and serves the security headers from the app.

**Optional, cookieless analytics**: the site ships with no analytics. If you want visit counts, Vercel Web
Analytics works without cookies: enable it in the Vercel project, `npm i @vercel/analytics`, render
`<Analytics />` from `@vercel/analytics/next` in `src/app/[locale]/layout.tsx`, and **update the privacy page**
(`privacy` messages in all 10 languages) to say so. Its script is served from your own domain, so the CSP needs
no change; run `npm run verify` afterwards.

**Any Node.js host / VPS**:

```bash
cd gethsemane
cp .env.example .env.local      # set SITE_URL=https://your-domain
npm ci
npm run verify                  # optional but recommended
npm run build
PORT=3000 npm start             # put it behind HTTPS (e.g. Nginx or Caddy)
```

If you put a CDN or reverse proxy in front, it must pass the security headers through unchanged and must not
cache HTML pages (they are sent with `Cache-Control: private, no-store`). Static files under `/_next/static` are
immutable; `/images` and `/brand` are sent with a one-day cache.

## Status

- `npm audit`: 0 vulnerabilities; dependency versions are pinned and `package-lock.json` is committed.
- Known limitations: pages are not CDN-cacheable or eligible for the back/forward cache (per-request CSP
  nonce; a hash-based CSP for static pages is not possible because Next.js inlines different scripts on every
  page); the last-resort `global-error.tsx` page is English-only; product photos, descriptions, prices,
  currency rates and every `// CONFIRM` value in `src/config/store.ts` are placeholders until confirmed.
- Lighthouse (mobile, simulated slow 4G, fresh server start before every run): product page performance 96–98,
  accessibility, best practices and SEO 100.
- Owner launch checklist: `docs/LAUNCH.md`. Day-to-day order handling (numbering, quotes, WhatsApp templates, packing, customs, records):
  `docs/OPERATIONS.md`.
