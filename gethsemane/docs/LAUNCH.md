# Gethsemane: launch checklist

For the owner. Work through it **in order**; each step assumes the ones before it are done. Internal document,
not published on the site.

## 1. Domain and email

1. Buy the domain (for example `gethsemane-…`), with auto-renew on. Check the name is free to use as a trademark
   in your main markets (see step 6).
2. Create the shop mailbox on that domain (for example `orders@your-domain`).
3. In the domain's DNS, set up email authentication so your replies do not land in spam:
   - **SPF**: one TXT record listing your mail provider.
   - **DKIM**: the record(s) your mail provider gives you.
   - **DMARC**: start with `v=DMARC1; p=none; rua=mailto:you@your-domain`, move to `p=quarantine` once reports look right.
4. Send a test email to a Gmail and an Outlook address and check that SPF, DKIM and DMARC all say "pass".

## 2. Hosting

1. **Vercel plan**: the free Hobby plan is for non-commercial use only. A shop needs **Pro**.
2. Import the repository, Root Directory `gethsemane` (see README, Deploying).
3. Do not set `SITE_URL` yet if the domain is not connected; previews use their own Vercel URL and stay noindex.

## 3. Store settings (`src/config/store.ts`)

Fill or confirm **every value marked `// CONFIRM`**:

- [ ] `WHATSAPP_NUMBER` (test it: send yourself the order message from the site)
- [ ] `LEGAL_ENTITY_NAME`, `TAX_ID`, `ADDRESS` (+ `ADDRESS_STREET`, `ADDRESS_LOCALITY`, `ADDRESS_COUNTRY`)
- [ ] `CONTACT_EMAIL` (the mailbox from step 1; enables email links and the withdrawal email button)
- [ ] `OPENING_HOURS` (days you really answer: Sunday–Thursday is `[7, 1, 2, 3, 4]`), `TIMEZONE`, `TIMEZONE_LABEL`
- [ ] `SOCIAL` (only accounts that exist), `SISTER_STORE`
- [ ] `SHIP_FROM_TEXT`, `PROCESSING_TIME`, `DELIVERY_TIME`, `DELIVERY_BY_REGION` (ask the carrier), `LOST_PARCEL_DAYS`
- [ ] `SHIP_TO_COUNTRIES` (ISO codes of the countries you really ship to)
- [ ] `RETURN_DAYS` (14 or more), `DAMAGE_REPORT_DAYS`, `QUOTE_VALID_HOURS`
- [ ] `PAYMENT_MODE`, `PAYMENT_METHODS`
- [ ] `DATA_RETENTION_YEARS` (from your accountant), `GOVERNING_LAW` (from your lawyer)
- [ ] `MANUFACTURER_*`, `EU_RESPONSIBLE_PERSON` (only after legal advice)
- [ ] `ANNOUNCEMENT`, `POLICY_UPDATED`, `ACCESSIBILITY_REVIEWED`

## 4. Verify every claim

Read every page in English and confirm that each statement is true for how you work. In particular:

- [ ] "From pruned branches" (home, FAQ, Our story): the wood really comes from pruning.
- [ ] Packing: "protective double box, no straw" (shipping page).
- [ ] Damaged parcels: "you do not need to send it back" (shipping page, FAQ).
- [ ] Every product's `availability` (`in_stock`, `made_to_order`, `sold_out`) in `src/data/products.ts`.
- [ ] Run `npm run check:claims` after any wording change.

## 5. Prices and currencies

- [ ] Update the rates in `src/lib/currency.ts` and `RATES_AS_OF` **on launch day**, then monthly.

## 6. Products and photos

- [ ] Real names, descriptions (all 10 languages) and prices in `src/data/products.ts`; no "Placeholder" text.
- [ ] Real photos in `catalog/photos/<slug>/` (square 1600×1600 recommended) replacing every generated placeholder (see docs/CATALOG.md).
- [ ] Optional: `public/images/story/workshop.webp` (1200×900) for the home page.

## 7. Legal review

Give the lawyer the README section "Legal pages are templates" and the live pages: privacy, terms, returns,
withdrawal, shipping, accessibility. Open questions include governing law, the EU withdrawal function for orders
made in a chat, origin marking for the US and EU, EU product safety, and trademark clearance for "Gethsemane".
Apply the changes in all 10 languages (`messages/*.json`) and run `npm run verify`.

## 8. Go live on the domain

1. Vercel → Settings → Environment Variables: `SITE_URL=https://your-domain` (Production).
2. Vercel → Settings → Deployment Protection: **Vercel Authentication off** for Production.
3. Vercel → Settings → Domains: add the domain (and `www`), and set the `*.vercel.app` domain to **redirect 301**
   to it.
4. Redeploy, then run the `curl` checks in README → Deploying.
5. Google Search Console and Bing Webmaster Tools: verify the domain and submit `https://your-domain/sitemap.xml`.

## 9. Test an order end to end

From a phone and a computer, in two languages:

- [ ] Add pieces, fill the details, tick the gift note, send the order on WhatsApp; check the message arrives
      with English names and SKUs.
- [ ] Reply with a quote (docs/OPERATIONS.md), "pay", pack, record the order in the order sheet.
- [ ] Try the withdrawal page and the contact page topics.

## 10. Open the catalog (last step)

1. In `src/config/store.ts` set **`CATALOG_READY = true`**.
2. Run `SITE_URL=https://your-domain npm run check:launch`. It must pass.
3. Run `npm run verify`, deploy, and resubmit the sitemap in Search Console and Bing.
