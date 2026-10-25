/**
 * STORE SETTINGS — the single source of truth for business details shown on the site.
 *
 * Every value marked // CONFIRM must be checked by the owner before launch. Optional text fields render
 * only when they are non-empty, so leaving a field "" simply hides it.
 * Values that appear in sentences (shipping, returns, hours) are stored as data and formatted in each
 * language by the pages; translated sentences that use them live in messages/<locale>.json.
 */
import type { Locale } from "@/i18n/locales";

export const STORE_NAME = "Gethsemane";

/** Registered business name, shown in the legal notice on /terms when set. */
export const LEGAL_ENTITY_NAME = ""; // CONFIRM

/** Tax / company registration ID for the legal notice. TODO: add once registered. */
export const TAX_ID = ""; // CONFIRM (TODO)

/** Workshop / contact address (not a returns address: returns are arranged by email or the contact form first). */
export const ADDRESS = "129 Al Mahed Street, Bethlehem, Palestinian Territory"; // CONFIRM
/** The same address in parts, for structured data (schema.org PostalAddress). */
export const ADDRESS_STREET = "129 Al Mahed Street"; // CONFIRM
export const ADDRESS_LOCALITY = "Bethlehem"; // CONFIRM
/** ISO 3166-1 alpha-2 country code. */
export const ADDRESS_COUNTRY = "PS"; // CONFIRM

/**
 * Public contact email. Confirmed by the owner (2026-10-25). A Gmail address is fine for launch; once the custom
 * domain exists, a domain mailbox with SPF, DKIM and DMARC is recommended (docs/LAUNCH.md). Empty = not shown.
 */
export const CONTACT_EMAIL = "gethsemane.t12@gmail.com";

/**
 * Opening hours: ISO weekdays (1 = Monday … 7 = Sunday) and local times, in TIMEZONE.
 * CONFIRM: the Palestinian work week is often Sunday–Thursday ([7, 1, 2, 3, 4]); set the days you really answer.
 */
export const OPENING_HOURS = { days: [1, 2, 3, 4, 5], open: "09:00", close: "17:00" } as const; // CONFIRM
/** IANA time zone of the opening hours (used for calculations only; never shown on the site). */
export const TIMEZONE = "Asia/Hebron"; // CONFIRM
/** How the time zone is shown to visitors, in every language. */
export const TIMEZONE_LABEL: Record<Locale, string> = {
  // CONFIRM
  en: "Bethlehem time",
  fr: "heure de Bethléem",
  es: "hora de Belén",
  it: "ora di Betlemme",
  de: "Ortszeit Bethlehem",
  el: "ώρα Βηθλεέμ",
  pl: "czas betlejemski",
  ro: "ora Betleemului",
  uk: "за часом Вифлеєма",
  pt: "hora de Belém",
};

/**
 * Our own social accounts, in display order. Confirmed by the owner (2026-10-25). Plain profile URLs only: never
 * paste share links with tracking parameters (utm_*, xtok, _r, _t, mibextid…); src/lib/social.ts strips them anyway.
 * An empty value hides that network everywhere.
 */
export const SOCIAL = {
  instagram: "https://www.instagram.com/gethsemane_t12",
  tiktok: "https://www.tiktok.com/@gethsemane.store",
  facebook: "https://www.facebook.com/gethsemane.t12",
} as const;

/** Handles shown next to the platform name. Confirmed by the owner (2026-10-25). */
export const SOCIAL_HANDLES: Partial<Record<keyof typeof SOCIAL, string>> = {
  instagram: "@gethsemane_t12",
  tiktok: "@gethsemane.store",
  facebook: "@gethsemane.t12",
};

/** Sister store under the same ownership. */
export const SISTER_STORE = {
  name: "holylandtimber.com",
  url: "https://holylandtimber.com",
  instagram: "https://www.instagram.com/holylandtimber",
} as const; // CONFIRM

/** Where orders ship from, in every language (shown on shipping, FAQ and order pages). */
export const SHIP_FROM_TEXT: Record<Locale, string> = {
  // CONFIRM
  en: "Crafted in Bethlehem. Your order is dispatched from Bethlehem or from a partner stock location; we confirm which, with an estimated delivery date, before you pay.",
  fr: "Fabriqué à Bethléem. Votre commande est expédiée depuis Bethléem ou depuis un stock partenaire ; nous vous confirmons lequel, avec une date de livraison estimée, avant le paiement.",
  es: "Hecho en Belén. Tu pedido se envía desde Belén o desde un almacén asociado; antes de que pagues te confirmamos desde dónde, con una fecha de entrega estimada.",
  it: "Realizzato a Betlemme. Il tuo ordine parte da Betlemme o da un magazzino partner; prima del pagamento ti confermiamo da dove, con una data di consegna stimata.",
  de: "In Bethlehem gefertigt. Ihre Bestellung wird aus Bethlehem oder von einem Partnerlager versendet; vor der Zahlung bestätigen wir Ihnen, von wo, zusammen mit einem voraussichtlichen Liefertermin.",
  el: "Φτιαγμένο στη Βηθλεέμ. Η παραγγελία σας αποστέλλεται από τη Βηθλεέμ ή από συνεργαζόμενη αποθήκη· πριν πληρώσετε, σας επιβεβαιώνουμε από πού, μαζί με εκτιμώμενη ημερομηνία παράδοσης.",
  pl: "Wykonane w Betlejem. Zamówienie wysyłamy z Betlejem lub z magazynu partnera; zanim zapłacisz, potwierdzimy skąd, wraz z szacowaną datą dostawy.",
  ro: "Lucrat în Betleem. Comanda ta pleacă din Betleem sau dintr-un depozit partener; înainte de plată îți confirmăm de unde, împreună cu o dată estimată de livrare.",
  uk: "Виготовлено у Вифлеємі. Замовлення відправляємо з Вифлеєма або зі складу партнера; перед оплатою ми підтвердимо, звідки саме, і орієнтовну дату доставки.",
  pt: "Feito em Belém. A sua encomenda é enviada de Belém ou de um armazém parceiro; antes do pagamento confirmamos de onde, com uma data de entrega estimada.",
};

/** Processing time before dispatch, in business days. ("1-2 business days") */
export const PROCESSING_TIME = { min: 1, max: 2 } as const; // CONFIRM
/** Delivery time after dispatch, in business days. Estimates, not guarantees. ("7-15 business days") */
export const DELIVERY_TIME = { min: 7, max: 15 } as const; // CONFIRM

/** Static delivery estimates by region (business days after dispatch); shown as a table, not a calculator. */
export const DELIVERY_BY_REGION = [
  { region: "europe", min: 7, max: 12 }, // CONFIRM
  { region: "northAmerica", min: 8, max: 15 }, // CONFIRM
  { region: "oceania", min: 10, max: 18 }, // CONFIRM
  { region: "middleEast", min: 5, max: 10 }, // CONFIRM
  { region: "restOfWorld", min: 10, max: 25 }, // CONFIRM
] as const;

/** Days after delivery to request a return. Never below 14: the EU/UK statutory withdrawal period (checked below). */
export const RETURN_DAYS = 14; // CONFIRM
/** Days after delivery to report damage in transit. */
export const DAMAGE_REPORT_DAYS = 7; // CONFIRM
/** Days without tracking movement after which a carrier trace is opened. */
export const LOST_PARCEL_DAYS = 20; // CONFIRM

/** Optional announcement bar at the top of every page. Off by default. */
export const ANNOUNCEMENT: { enabled: boolean; text: Partial<Record<Locale, string>> } = {
  enabled: false, // CONFIRM
  text: {}, // e.g. { en: "…", fr: "…" }; falls back to English
};

/**
 * Countries we ship to, as ISO 3166-1 alpha-2 codes (e.g. ["DE", "FR", "GB", "US"]). The checkout offers only these
 * countries (test mode offers all), and the structured data publishes them. While empty, live payments stay closed.
 */
export const SHIP_TO_COUNTRIES: readonly string[] = []; // CONFIRM

/**
 * SHIPPING PRICES charged at checkout, in USD, per region (regions: src/lib/regions.ts) and method. The amounts below
 * are UNCONFIRMED placeholders: while SHIPPING_RATES_CONFIRMED is false, real (live) payments are blocked and test
 * checkouts label them as test rates. Ask the carrier, set the prices, then set SHIPPING_RATES_CONFIRMED = true.
 * `days` are the business days after dispatch shown at checkout.
 */
export const SHIPPING_RATES_CONFIRMED = false; // CONFIRM
export const SHIPPING_RATES: Record<
  "europe" | "northAmerica" | "oceania" | "middleEast" | "restOfWorld",
  readonly { id: "standard" | "express"; usd: number; days: readonly [number, number] }[]
> = {
  europe: [
    { id: "standard", usd: 25, days: [7, 12] }, // CONFIRM
    { id: "express", usd: 45, days: [3, 6] }, // CONFIRM
  ],
  northAmerica: [
    { id: "standard", usd: 29, days: [8, 15] }, // CONFIRM
    { id: "express", usd: 55, days: [4, 7] }, // CONFIRM
  ],
  oceania: [
    { id: "standard", usd: 35, days: [10, 18] }, // CONFIRM
    { id: "express", usd: 65, days: [5, 9] }, // CONFIRM
  ],
  middleEast: [
    { id: "standard", usd: 20, days: [5, 10] }, // CONFIRM
    { id: "express", usd: 40, days: [3, 5] }, // CONFIRM
  ],
  restOfWorld: [
    { id: "standard", usd: 35, days: [10, 25] }, // CONFIRM
  ],
};

/**
 * Sales tax / VAT. Not collected at checkout for now: prices are what the customer pays to us, and import VAT or
 * duties, where they apply, are charged by the destination country on delivery. Confirm with an accountant before
 * launch (EU sales of goods under €150 may require IOSS registration); `note` is internal only.
 */
export const TAX = { collect: false, note: "Not collected; import VAT/duties may be charged on delivery." } as const; // CONFIRM

/**
 * OPTIONAL FEATURES. Each flag turns one feature on or off; the comments say what else it needs. Defaults: on for
 * features that show nothing until their data exists (or need no data), off for reviews, the newsletter and wallets
 * (they need the owner's decision and setup first). A deployment can override flags without a code change through
 * the FEATURES environment variable, e.g. `FEATURES=reviews,newsletter,-christmas` (see .env.example).
 * Flags are read on the server only (src/server/features.ts), so client code never ships unused features.
 */
export const FEATURES = {
  /** 1. Apple Pay / Google Pay on Stripe's page. Also turn them on in Stripe Dashboard → Settings → Payment methods. */
  wallets: false, // CONFIRM
  /** 2. "Add $X for free standard shipping" bar; shown only while FREE_SHIPPING_THRESHOLD_USD is set. */
  freeShippingBar: true,
  /** 3. Import-duties note at checkout; shown only for regions with text in DUTIES_NOTE_BY_REGION. */
  dutiesNote: true,
  /** 4. /bulk-orders enquiry form for churches, shops and groups (stored in the database, listed in /admin). */
  bulkOrders: true,
  /** 5. Engraving preview on the product page and the "engraving text is correct" checkbox at checkout. */
  engravingPreview: true,
  /** 6. "Complete the set" on product pages, from each product's relatedSkus (hidden when empty). */
  completeTheSet: true,
  /** 7. Verified-buyer reviews: request email after delivery, moderation in /admin; shown from 3 approved reviews. */
  reviews: false, // CONFIRM
  /** 8. Wishlist saved to the customer's account when signed in (guests keep it in the browser). */
  wishlistSync: true,
  /** 9. Newsletter sign-up with double opt-in (and the optional welcome code below). */
  newsletter: false, // CONFIRM
  /** 10. Search and filters on /shop (text, category, price, size, availability). */
  shopSearch: true,
  /** 11. /christmas collection and a home-page band, from products tagged "christmas". */
  christmas: true,
  /** 12. Printable olive-wood care card (PDF in 10 languages) linked from the care page. */
  careCard: true,
} as const;
export type FeatureName = keyof typeof FEATURES;

/** Items total (USD, after discounts) from which standard shipping is free. null = no free shipping, no bar. */
export const FREE_SHIPPING_THRESHOLD_USD: number | null = null; // CONFIRM

/**
 * Import duties note shown at checkout under the shipping price, per shipping region and language (English is the
 * fallback). Leave a region out until the wording is confirmed; never promise "no extra fees" (check:claims).
 * Example: { europe: { en: "Parcels to the EU may be charged import VAT and a handling fee on delivery." } }
 */
export const DUTIES_NOTE_BY_REGION: Partial<Record<keyof typeof SHIPPING_RATES, Partial<Record<Locale, string>>>> = {}; // CONFIRM

/** Last day to order for delivery before Christmas (YYYY-MM-DD), shown on /christmas and the home band. "" = none. */
export const CHRISTMAS_ORDER_BY_DATE = ""; // CONFIRM

/**
 * Optional thank-you code for confirmed newsletter subscribers: a single-use code for their email address, valid on
 * the first order. percent = 0 sends no code.
 */
export const NEWSLETTER_WELCOME_COUPON = { percent: 0, validDays: 60 } as const; // CONFIRM

/**
 * LAUNCH GATE. While false, shop, category and product pages are noindex, product and category pages are left
 * out of the sitemap and no Product offers are published in structured data (placeholder products must never
 * reach search engines). Set to true as the very last launch step, then run `npm run check:launch`.
 */
export const CATALOG_READY = false; // CONFIRM

/**
 * Product safety information (EU General Product Safety Regulation). Needs legal advice before selling into
 * the EU. When MANUFACTURER_NAME is set, a "Product safety information" block appears on every product page.
 */
export const MANUFACTURER_NAME = ""; // CONFIRM
export const MANUFACTURER_ADDRESS = ""; // CONFIRM
export const MANUFACTURER_EMAIL = ""; // CONFIRM
/** Name and address of the economic operator responsible in the EU, if one is required. */
export const EU_RESPONSIBLE_PERSON = ""; // CONFIRM

/** Date the policy pages were last updated (YYYY-MM-DD). */
export const POLICY_UPDATED = "2026-10-25"; // CONFIRM

/**
 * Set to true once the refund wording on /returns (timings, original payment method, outbound shipping refund) has
 * been checked against how refunds are really made in the Stripe Dashboard. `npm run check:launch` fails while live
 * payments are on and this is false.
 */
export const REFUNDS_CONFIRMED = false; // CONFIRM

/** How many years order records are kept (privacy policy). 0 = not stated yet. */
export const DATA_RETENTION_YEARS = 0; // CONFIRM

/** Governing law for the terms, shown as written in every language, e.g. "Palestinian law". Empty = the sentence is not shown (the consumer-protection sentence always is). */
export const GOVERNING_LAW = ""; // CONFIRM (TODO)

/** Date of the accessibility statement (YYYY-MM-DD). */
export const ACCESSIBILITY_REVIEWED = "2026-10-24"; // CONFIRM

// Backwards-compatible aliases.
export const SISTER_STORE_URL = SISTER_STORE.url;
export const SISTER_STORE_NAME = SISTER_STORE.name;

// Build-time guards: a wrong value here must fail the build, not reach customers.
if (RETURN_DAYS < 14) throw new Error("RETURN_DAYS must be at least 14 (EU/UK statutory withdrawal period).");
