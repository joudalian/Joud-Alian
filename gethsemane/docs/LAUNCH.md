# Gethsemane: launch checklist

For the owner. Work through it **in order**; each step assumes the ones before it are done. Internal document,
not published on the site.

## 1. Domain and email

1. Buy the domain (for example `gethsemane-…`), with auto-renew on. Check the name is free to use as a trademark
   in your main markets (see step 6).
2. **Done for launch:** the site uses `gethsemane.t12@gmail.com`. A Gmail address is fine to start; once the custom
   domain exists, create a domain mailbox (for example `orders@your-domain`), set it up as below and change
   `CONTACT_EMAIL` in `src/config/store.ts`.
3. In the domain's DNS, set up email authentication so your replies do not land in spam:
   - **SPF**: one TXT record listing your mail provider.
   - **DKIM**: the record(s) your mail provider gives you.
   - **DMARC**: start with `v=DMARC1; p=none; rua=mailto:you@your-domain`, move to `p=quarantine` once reports look right.
4. Send a test email to a Gmail and an Outlook address and check that SPF, DKIM and DMARC all say "pass".

## 2. Hosting

1. **Vercel plan**: the free Hobby plan is for non-commercial use only. A shop needs **Pro**.
2. Import the repository, Root Directory `gethsemane` (see README, Deploying).
3. Do not set `SITE_URL` yet if the domain is not connected; previews use their own Vercel URL and stay noindex.

## 3. Database, accounts and email (Vercel → Settings → Environment Variables)

Set each variable for **Production** and **Preview** unless noted. Never paste the values into a chat, an issue or
the repository; `.env.example` lists every name.

1. **Database**: Vercel → Storage (Marketplace) → **Neon** → create a Postgres database and connect it to the
   project. Copy its **pooled** connection string into `DATABASE_URL` (Neon adds it automatically when connected).
   The build applies the migrations in `drizzle/` before every deploy. Use a separate Neon branch for Preview if
   you want test orders kept apart from real ones.
2. `BETTER_AUTH_SECRET`: a random value of at least 32 characters (`openssl rand -base64 32`). Different for
   Preview and Production. Changing it signs everyone out.
3. `ADMIN_EMAILS`: your email address(es), comma-separated. Create an account on the site with that address and
   verify it; `/admin` then opens for you (everyone else gets a 404).
4. **Email (Resend)**: create an account at resend.com, add and verify your domain (it gives you the SPF/DKIM
   records for step 1.3), create an API key, and set `RESEND_API_KEY` and `EMAIL_FROM` (e.g.
   `Gethsemane <orders@your-domain>`). Until the domain is verified Resend only sends to your own address. Without
   these two variables the site still works but sends no emails (no verification, no order confirmations).
5. Redeploy, sign up with your admin address, confirm the verification email arrives, open `/admin`.

## 4. Payments (Stripe)

Test mode first; real payments only at the very end (section 11).

1. Create a Stripe account for the business. Dashboard → **Developers → API keys**: copy the **test** secret key
   (`sk_test_…`) into `STRIPE_SECRET_KEY` (Preview and Production).
2. Dashboard → **Developers → Webhooks → Add endpoint** (in test mode):
   - URL: `https://your-domain/api/stripe/webhook` (or the preview URL while testing).
   - Events: `checkout.session.completed`, `checkout.session.async_payment_succeeded`,
     `checkout.session.async_payment_failed`, `checkout.session.expired`, `payment_intent.payment_failed`,
     `charge.refunded`.
   - Copy the endpoint's **signing secret** (`whsec_…`) into `STRIPE_WEBHOOK_SECRET`.
3. Dashboard → Settings → **Payment methods**: cards are what the site asks for. Branding: add the logo and colours
   so the hosted payment page looks like the shop.
4. Redeploy and place a test order with card `4242 4242 4242 4242` (any future date, any CVC). Check: the
   confirmation page says "Paid", the confirmation email arrives, the order is in `/admin` marked TEST.
5. Refund that test payment in the Stripe Dashboard; the order must turn "Refunded" in `/admin`.

## 5. Store settings (`src/config/store.ts`)

Fill or confirm **every value marked `// CONFIRM`**:

- [ ] `LEGAL_ENTITY_NAME`, `TAX_ID`, `ADDRESS` (+ `ADDRESS_STREET`, `ADDRESS_LOCALITY`, `ADDRESS_COUNTRY`)
- [x] `CONTACT_EMAIL` = gethsemane.t12@gmail.com (done 2026-10-25; switch to the domain mailbox from step 1 later).
      Contact-form messages are sent to this address.
- [ ] `OPENING_HOURS` (days you really answer: Sunday–Thursday is `[7, 1, 2, 3, 4]`), `TIMEZONE`, `TIMEZONE_LABEL`
- [x] `SOCIAL` + `SOCIAL_HANDLES`: Instagram @gethsemane_t12, TikTok @gethsemane.store, Facebook @gethsemane.t12 (done 2026-10-25)
- [ ] Put the shop link (`https://your-domain`) in the bio of each profile once the domain is live
- [ ] `SISTER_STORE`
- [ ] `SHIP_FROM_TEXT`, `PROCESSING_TIME`, `DELIVERY_TIME`, `DELIVERY_BY_REGION` (ask the carrier), `LOST_PARCEL_DAYS`
- [ ] `SHIP_TO_COUNTRIES` (ISO codes of the countries you really ship to; checkout offers only these)
- [ ] `SHIPPING_RATES` (price per region and method, from the carrier), then `SHIPPING_RATES_CONFIRMED = true`
- [ ] `TAX` (whether you must collect VAT or sales tax anywhere: ask your accountant)
- [ ] `RETURN_DAYS` (14 or more), `DAMAGE_REPORT_DAYS`
- [ ] `REFUNDS_CONFIRMED` (the refund wording on /returns matches how you refund in Stripe)
- [ ] `DATA_RETENTION_YEARS` (from your accountant), `GOVERNING_LAW` (from your lawyer)
- [ ] `MANUFACTURER_*`, `EU_RESPONSIBLE_PERSON` (only after legal advice)
- [ ] `ANNOUNCEMENT`, `POLICY_UPDATED`, `ACCESSIBILITY_REVIEWED`

## 5b. Optional features (`FEATURES` in `src/config/store.ts`)

Decide each one; the defaults are listed in README → Optional features.

- [ ] **Wallets** (off): to offer Apple Pay / Google Pay, enable them in Stripe Dashboard → Settings → Payment methods
      (Apple Pay also needs your domain verified there), then set `wallets: true`.
- [ ] **Free shipping** (bar on, no threshold): set `FREE_SHIPPING_THRESHOLD_USD` only if you really want free standard
      shipping from that items total; the checkout then charges no standard shipping.
- [ ] **Duties note** (on, no text): add a sentence per region to `DUTIES_NOTE_BY_REGION` only once it is confirmed (ask
      the carrier); never promise that nothing more is due.
- [ ] **Bulk orders** (on): enquiries arrive by email and in `/admin/enquiries`; reply with a quote by email.
- [ ] **Engraving preview** (on): check that the preview's wording ("illustrative") and the supported scripts (Latin,
      Greek, Cyrillic) match what the workshop can engrave.
- [ ] **Complete the set** (on, empty): add `relatedSkus` to products you want to suggest together (docs/CATALOG.md).
- [ ] **Reviews** (off): decide; if on, check the privacy text "Reviews", moderate every review in `/admin/reviews`.
- [ ] **Wishlist in the account** (on): nothing to confirm.
- [ ] **Newsletter** (off): decide; if on, choose the welcome code (`NEWSLETTER_WELCOME_COUPON.percent`, 0 = none) and
      the tool you will send with (export from `/admin/newsletter`); check the privacy text "Newsletter".
- [ ] **Shop search** (on): nothing to confirm.
- [ ] **Christmas** (on): set `CHRISTMAS_ORDER_BY_DATE` each season (last order date for Christmas delivery, from the
      carrier's estimates), clear it after Christmas, and tag the right pieces `christmas`.
- [ ] **Care card** (on): read the PDF in each language (`public/care-card/`); run `npm run care-cards` after any change
      to the care texts.

## 6. Verify every claim

Read every page in English and confirm that each statement is true for how you work. In particular:

- [ ] "From pruned branches" (home, FAQ, Our story): the wood really comes from pruning.
- [ ] Packing: "protective double box, no straw" (shipping page).
- [ ] Damaged parcels: "you do not need to send it back" (shipping page, FAQ).
- [ ] Every product's `availability` (`in_stock`, `made_to_order`, `sold_out`) in `src/data/products.ts`.
- [ ] Run `npm run check:claims` after any wording change.

## 7. Prices and currencies

- [ ] Update the rates in `src/lib/currency.ts` and `RATES_AS_OF` **on launch day**, then monthly.

## 8. Products and photos

- [ ] Real names, descriptions (all 10 languages) and prices in `src/data/products.ts`; no "Placeholder" text.
- [ ] Real photos in `catalog/photos/<slug>/` (square 1600×1600 recommended) replacing every generated placeholder (see docs/CATALOG.md).
- [ ] Optional: `public/images/story/workshop.webp` (1200×900), a real workshop photo for the home page (until then
      it shows an illustrative picture, labelled as such; see README, Atmosphere images).

## 9. Legal review

Give the lawyer the README section "Legal pages are templates" and the live pages: privacy, terms, returns,
withdrawal, shipping, accessibility, and the checkout page. Open questions include governing law, the order
button wording in each language, the EU withdrawal function, VAT/IOSS for EU orders, origin marking for the US and
EU, EU product safety, and trademark clearance for "Gethsemane". The privacy page names Vercel (hosting), Resend
(email) and, once live payments are on, Stripe; **CONFIRM** the database provider's name and region if the lawyer
wants it named.
Apply the changes in all 10 languages (`messages/*.json`) and run `npm run verify`.

## 10. Go live on the domain

1. Vercel → Settings → Environment Variables: `SITE_URL=https://your-domain` (Production).
2. Vercel → Settings → Deployment Protection: **Vercel Authentication off** for Production.
3. Vercel → Settings → Domains: add the domain (and `www`), and set the `*.vercel.app` domain to **redirect 301**
   to it.
4. Update the Stripe webhook endpoint URL to `https://your-domain/api/stripe/webhook`.
5. Redeploy, then run the `curl` checks in README → Deploying.
6. Google Search Console and Bing Webmaster Tools: verify the domain and submit `https://your-domain/sitemap.xml`.

Test an order end to end, from a phone and a computer, in two languages (still in Stripe test mode):

- [ ] As a guest: add pieces (one with a variant and engraving), check out, pay with `4242 4242 4242 4242`;
      the confirmation page and the email arrive in the language you used.
- [ ] With an account: sign up, verify the email, order, see the order under My account → Orders.
- [ ] Track the guest order on `/track-order` with its number and email.
- [ ] In `/admin`: set it to "Being prepared", then mark it shipped with a carrier and tracking number; the
      "on its way" email arrives and the tracking shows on the order page.
- [ ] Refund it in the Stripe Dashboard; the order shows "Refunded".
- [ ] Send a message with the contact form; it arrives at `CONTACT_EMAIL` and "Reply" goes to the sender.
- [ ] Try the withdrawal page, account data export and account deletion (with a test account).

## 11. Switch to real payments (go-live checklist)

Only when everything above is done:

- [ ] `SHIPPING_RATES_CONFIRMED = true`, `SHIP_TO_COUNTRIES` filled, `REFUNDS_CONFIRMED = true`.
- [ ] `LEGAL_ENTITY_NAME` and `GOVERNING_LAW` set after the legal review.
- [ ] `CATALOG_READY = true` (section 12): live checkout stays closed while the catalog is not launch-ready, so do
      sections 11 and 12 together.
- [ ] Stripe account activated (business details, bank account for payouts, statement descriptor).
- [ ] In Stripe **live** mode: create the same webhook endpoint (URL and events as in section 4) and copy its
      new signing secret.
- [ ] Vercel (Production only): `STRIPE_SECRET_KEY=sk_live_…`, `STRIPE_WEBHOOK_SECRET=<live whsec_…>`. Keep the
      test keys on Preview.
- [ ] `RESEND_API_KEY` and `EMAIL_FROM` set, domain verified in Resend.
- [ ] Run `STRIPE_SECRET_KEY=sk_live_… STRIPE_WEBHOOK_SECRET=… RESEND_API_KEY=… EMAIL_FROM=… SITE_URL=https://your-domain npm run check:launch`
      locally (from a terminal, not in a chat): it must pass.
- [ ] Redeploy. The checkout loses its test banner; the privacy page and checkout now name Stripe.
- [ ] Place one real small order with your own card, check it end to end, then refund it in Stripe.

## 12. Open the catalog (last step)

1. In `src/config/store.ts` set **`CATALOG_READY = true`**.
2. Run `SITE_URL=https://your-domain npm run check:launch`. It must pass.
3. Run `npm run verify`, deploy, and resubmit the sitemap in Search Console and Bing.
