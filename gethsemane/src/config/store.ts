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

/** WhatsApp number that receives orders: country code + number, digits only, no "+" or spaces. */
export const WHATSAPP_NUMBER = "970569741193"; // CONFIRM

/** Registered business name, shown in the legal notice on /terms when set. */
export const LEGAL_ENTITY_NAME = ""; // CONFIRM

/** Tax / company registration ID for the legal notice. TODO: add once registered. */
export const TAX_ID = ""; // CONFIRM (TODO)

/** Workshop / contact address (not a returns address: returns are arranged on WhatsApp first). */
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

/**
 * How customers pay once the order is confirmed on WhatsApp:
 *   "instructions" — we send payment instructions (default; no payment brands are named on the site)
 *   "link"         — we send a payment link; PAYMENT_METHODS lists what that link accepts
 */
export const PAYMENT_MODE: "instructions" | "link" = "instructions"; // CONFIRM
/** Only used when PAYMENT_MODE is "link" and the list is non-empty (names of the methods the link accepts). */
export const PAYMENT_METHODS: readonly string[] = []; // CONFIRM

/** Optional announcement bar at the top of every page. Off by default. */
export const ANNOUNCEMENT: { enabled: boolean; text: Partial<Record<Locale, string>> } = {
  enabled: false, // CONFIRM
  text: {}, // e.g. { en: "…", fr: "…" }; falls back to English
};

/** Hours a quote sent on WhatsApp stays valid (prices, shipping and stock held). */
export const QUOTE_VALID_HOURS = 48; // CONFIRM

/**
 * Countries we ship to, as ISO 3166-1 alpha-2 codes (e.g. ["DE", "FR", "GB", "US"]). Used only in the structured
 * data for search engines; while empty, no shipping details or return-policy countries are published there.
 */
export const SHIP_TO_COUNTRIES: readonly string[] = []; // CONFIRM

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
export const POLICY_UPDATED = "2026-10-24"; // CONFIRM

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
