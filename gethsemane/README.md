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
ratios are cropped to fit. Next.js serves them in the right size and format automatically.

**Remove a product**: delete its entry (and its photo).

Then run `npm run check:i18n`: it fails if any product is missing a language, has a duplicate id or slug, an
unknown category, an invalid price or an image file that does not exist. `npm run assets` creates a neutral
placeholder image (cream card with the logo mark and the product name) for any product whose image file is missing;
it never overwrites existing photos (use `npm run assets -- --force-placeholders` to reset them all).

The current 12 products, their names, descriptions, photos and prices are **placeholders**.

## Ordering via WhatsApp

There is no checkout or payment gateway. The cart and every product page have an **Order via WhatsApp**
button that opens `https://wa.me/<number>` with a message in the visitor's language listing the items,
quantities, selected currency, total and the store name.

**Change the WhatsApp number** in `src/config/store.ts`:

```ts
export const WHATSAPP_NUMBER = "970569741193"; // country code + number, digits only, no "+"
```

The message wording is in the `whatsapp` section of each `messages/<locale>.json`.

## Currencies

USD (base), EUR, GBP, CAD and AUD. **The conversion rates are fixed values in `src/lib/currency.ts`, not live
rates: update them before launch and review them regularly.** The visitor's choice is stored in a cookie, so
prices render in the right currency on the first paint.

## Languages

Exactly ten, all left-to-right, English by default: `en` English, `fr` Français, `es` Español, `it` Italiano,
`de` Deutsch, `el` Ελληνικά, `pl` Polski, `ro` Română, `uk` Українська, `pt` Português.

Every page lives under a locale prefix (`/en`, `/fr/shop`, …). A request without one is redirected to the
saved language (`NEXT_LOCALE` cookie), else the best `Accept-Language` match, else English. Pages set
`<html lang>`, a canonical URL and hreflang links for all 10 languages plus `x-default`. Interface text is in
`messages/<locale>.json`; product text is in `src/data/products.ts`. `npm run check:i18n` fails on any missing,
extra, empty or malformed message, and if Arabic text or right-to-left handling appears in the project.

## Pages

Home, shop (`/[locale]/shop`), category (`/[locale]/shop/[category]`), product (`/[locale]/product/[slug]`),
cart and wishlist (noindex), Our Story (`/[locale]/about`), localized 404 (HTTP 404) and error pages,
`/sitemap.xml` and `/robots.txt`.

## Security

- Per-request nonce Content-Security-Policy (`src/proxy.ts`): `default-src 'self'`, scripts only with the
  nonce (`'strict-dynamic'`, no `'unsafe-eval'`), images from self/data/blob, fonts from self,
  `object-src 'none'`, `frame-ancestors 'none'`, `upgrade-insecure-requests`. Styles allow `'unsafe-inline'`
  (required by `next/image` inline styles). Every page is rendered per request because of the nonce.
- Static headers on every response (`src/lib/security-headers.ts`): HSTS, `X-Content-Type-Options: nosniff`,
  `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`
  (camera, microphone, geolocation, payment and more disabled), COOP/CORP `same-origin`. No `X-Powered-By`,
  no production source maps.
- No third-party scripts, trackers, CDNs or iframes; fonts are self-hosted; all images are local. The only
  external links are WhatsApp and the sister store, with `rel="noopener noreferrer"`.
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
| `npm run check:i18n`     | Translations, product data file, no Arabic / RTL                                  |
| `npm run check:contrast` | WCAG AA contrast of the design tokens                                             |
| `npm run check:links`    | Crawls all 210 pages for broken links and images                                  |
| `npm test`               | Playwright tests on the production build (desktop + mobile)                       |
| `npm run audit`          | `npm audit --audit-level=high`                                                    |
| `npm run verify`         | typecheck → lint → i18n → contrast → build → audit → all tests                    |
| `npm run assets`         | Rebuilds brand files, favicons and images from `../brand/`; creates missing product placeholders |

Requires Node.js 22.18 or newer (the check scripts read `src/data/products.ts` directly). On a fresh machine,
install the test browser once with `npx playwright install chromium`.

## Deploying

The site needs a Node.js server (it is not a static export, because each page gets a fresh CSP nonce).

**Vercel** (simplest): import the repository, set the project's *Root Directory* to `gethsemane`, and add the
environment variable `SITE_URL=https://your-domain`. Vercel runs `npm run build` and serves the security
headers from the app.

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
cache HTML pages (they are sent with `Cache-Control: private, no-store`). Static files under `/_next/static`
and `/images` can be cached.

## Status

- `npm audit`: 0 vulnerabilities; dependency versions are pinned and `package-lock.json` is committed.
- Known limitations: mobile Lighthouse Performance is close to 90 under simulated slow 4G; pages are not
  CDN-cacheable or eligible for the back/forward cache (per-request CSP nonce); the last-resort
  `global-error.tsx` page is English-only; product photos, descriptions, prices and currency rates are
  placeholders.
