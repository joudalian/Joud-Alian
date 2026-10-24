# Gethsemane — Olive Wood · Holy Land

Storefront for hand-carved olive wood from the Holy Land, built with Next.js 16 (App Router), React 19,
TypeScript (strict) and next-intl.

## Languages

Exactly ten languages, all left-to-right, with English as the default:

| Code | Language   | Code | Language   |
| ---- | ---------- | ---- | ---------- |
| `en` | English    | `el` | Ελληνικά   |
| `fr` | Français   | `pl` | Polski     |
| `es` | Español    | `ro` | Română     |
| `it` | Italiano   | `uk` | Українська |
| `de` | Deutsch    | `pt` | Português  |

Every page lives under a locale prefix (`/en`, `/fr/shop`, `/de/product/salad-bowl`, …). A request without a
prefix is redirected (307) to the visitor's saved language (`NEXT_LOCALE` cookie), otherwise to the best match
from `Accept-Language`, otherwise to English. Each page sets `<html lang>`, a canonical URL and a full
hreflang set (10 languages + `x-default`). The logo lockup is English in every language: the olive-branch icon,
“GETHSEMANE” and the tagline “OLIVE WOOD · HOLY LAND”.

Messages are in `messages/<locale>.json`, product and category copy included. `npm run check:i18n` fails if any
language is missing a key, has an extra or empty key, uses invalid ICU syntax or different placeholders than
English, or if Arabic text or right-to-left handling appears anywhere in the project.

## Pages

| Route                        | Notes                                                            |
| ---------------------------- | ---------------------------------------------------------------- |
| `/[locale]`                  | Home: hero, categories, featured pieces, story, values           |
| `/[locale]/shop`             | All products with category filters                              |
| `/[locale]/shop/[category]`  | `nativity`, `crosses`, `rosaries`, `home`                        |
| `/[locale]/product/[slug]`   | Product template with related products                           |
| `/[locale]/cart`             | Cart with quantity steppers, subtotal and empty state (noindex)  |
| `/[locale]/wishlist`         | Wishlist with move-to-cart and empty state (noindex)             |
| `/[locale]/about`            | Story                                                            |
| anything else                | Localized 404 (HTTP 404); `error.tsx` is the localized error page |

Also `/sitemap.xml` (all public pages × 10 languages with alternates) and `/robots.txt`.

Language and currency switching keep the current page and scroll position. The currency is stored in a cookie
that the server reads, so prices are rendered in the right currency on the first paint (no flash of USD).

## Catalog, prices and images

- Products are defined in `src/lib/catalog.ts` (prices in USD). Display currencies (USD, EUR, GBP, CAD, AUD)
  use the fixed, indicative rates in `src/lib/currency.ts` — update them before launch. Checkout is not
  implemented yet; the cart says so instead of showing a fake checkout.
- All images are local files. `npm run assets` regenerates them: product, category, hero and story
  illustrations (`public/images/**`), the Open Graph image (`src/app/opengraph-image.png`) and the favicons
  (`src/app/icon.svg`, `apple-icon.png`, `favicon.ico`). They are illustrations; replace them with product
  photography when available (same file names, same aspect ratios: products 4:5, categories 4:3, hero 16:9).

## Security

- Per-request nonce-based Content-Security-Policy, set in `src/proxy.ts`:
  `default-src 'self'; script-src 'self' 'nonce-…' 'strict-dynamic'; style-src 'self' 'unsafe-inline';
  img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self';
  form-action 'self'; frame-src 'none'; frame-ancestors 'none'; upgrade-insecure-requests`.
  No `'unsafe-eval'` in production (it is added only by `next dev`, which React needs). `'unsafe-inline'` for
  styles is required by the inline `style` attributes that `next/image` writes; no external origin is allowed
  anywhere. Because nonces need per-request rendering, every page is dynamically rendered.
- Static headers on every response (`next.config.ts` → `src/lib/security-headers.ts`): HSTS (2 years,
  includeSubDomains, preload), `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`,
  `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (camera, microphone, geolocation,
  payment, USB, sensors and topics disabled), `Cross-Origin-Opener-Policy` and `Cross-Origin-Resource-Policy:
  same-origin`. `X-Powered-By` is off and production browser source maps are disabled.
- Hosting: these headers come from Next.js itself, so they apply on any host that runs `next start` or on
  Vercel. If you put a CDN or reverse proxy in front, make sure it does not strip them and does not cache HTML
  (each page carries its own nonce; responses are `Cache-Control: private, no-store`).
- Fonts (EB Garamond, Inter) are downloaded at build time by `next/font` and served from this site. There are
  no third-party scripts, trackers, CDNs or iframes; `next/image` has no remote patterns.
- No `dangerouslySetInnerHTML`, `eval` or inline event handlers (enforced by ESLint). Everything read from
  localStorage or cookies (cart, wishlist, currency, language) goes through `src/lib/storage.ts`: size limit,
  `JSON.parse` in `try/catch`, zod schema, unknown products dropped, duplicates merged, quantities capped (1–20),
  lists capped (50 cart lines, 100 wishlist items), safe defaults on anything invalid.
- No secrets in the repository. `.env.example` lists the only variable, `SITE_URL` (public origin used for
  canonical URLs, hreflang, sitemap and Open Graph; read at runtime).

## Scripts

| Command                  | What it does                                                                      |
| ------------------------ | --------------------------------------------------------------------------------- |
| `npm run dev`            | Development server                                                                |
| `npm run build` / `start`| Production build / server                                                         |
| `npm run typecheck`      | `tsc --noEmit` (strict, `noUncheckedIndexedAccess`)                               |
| `npm run lint`           | ESLint (Next core-web-vitals + TypeScript + security rules), zero warnings       |
| `npm run check:i18n`     | Translation completeness and no-Arabic/RTL check                                  |
| `npm run check:contrast` | WCAG AA contrast for every text/background pair of the design tokens              |
| `npm run check:links`    | Crawls all 210 pages and checks every link, image, srcset, script and stylesheet  |
| `npm test`               | Playwright tests on the production build (desktop + mobile)                       |
| `npm run audit`          | `npm audit --audit-level=high`                                                    |
| `npm run verify`         | typecheck → lint → i18n → contrast → build → audit → all tests                    |
| `npm run assets`         | Regenerates every image                                                           |

Tests use the Chromium that Playwright 1.63 expects (`npx playwright install chromium` on a fresh machine).
They cover: every page type (no console errors, CSP violations, failed requests or broken images), localized
404s with real 404 status, hreflang/canonical/lang for all 10 languages, locale redirects, language switching
(page and scroll kept, keyboard-operable menu), currency switching (server-rendered after reload), cart and
wishlist flows, tampered storage, security headers and nonces, no horizontal scroll / clipped text / tap
targets under 44 px at 320, 390, 768, 1024 and 1280 px in English, German and Greek, sticky header, bottom
nav and floating language button never hiding content, skip link and focus styles, reduced motion, and a
broken-link/broken-image crawl of every page.

## Configuration

```bash
cp .env.example .env.local   # set SITE_URL=https://your-domain
npm ci
npm run verify
npm start
```

Requires Node.js 20.9 or newer.

## Audit (first version, 2026-10-24)

- `npm audit`: 0 vulnerabilities (all dependency versions pinned exactly, `package-lock.json` committed).
- `npm run verify`: passes (typecheck, lint with 0 warnings, i18n, contrast, build, audit, 99 Playwright tests;
  also stable over a `--repeat-each=2` run).
- Lighthouse 13.5 on `/en`, local production server, mobile preset, 5 runs: Performance 90–96,
  Accessibility 100, Best Practices 100, SEO 100. Desktop preset: Performance 99, others 100.
  To reproduce: `npm run build && SITE_URL=http://localhost:3100 npm start -- -p 3100`, then
  `npx lighthouse@13.5.0 http://localhost:3100/en`.

Known limitations:

- Mobile Performance sits close to 90 (LCP ≈ 2.5–3.3 s under Lighthouse's simulated slow 4G); a real CDN and
  HTTP/2 will help. Pages are rendered per request because the CSP uses nonces, so HTML is not CDN-cached and
  pages are not eligible for the back/forward cache.
- `style-src` allows `'unsafe-inline'` (needed by `next/image` inline styles). Scripts are nonce-only.
- Prices in other currencies use fixed indicative rates; checkout and payments are not implemented.
- The floating language button hides itself while it would cover a button or form control; the footer always
  lists all ten languages as well.
- The global error boundary (`app/global-error.tsx`, used only if the root layout itself fails) is English-only,
  because translations cannot be loaded at that point. All other error and 404 pages are translated.
