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

/** Public contact email (the owner is creating a new mailbox). Empty = not shown anywhere. */
export const CONTACT_EMAIL = ""; // CONFIRM

/** Opening hours: ISO weekdays (1 = Monday … 7 = Sunday) and local times, in TIMEZONE. */
export const OPENING_HOURS = { days: [1, 2, 3, 4, 5], open: "09:00", close: "17:00" } as const; // CONFIRM
export const TIMEZONE = "Asia/Hebron"; // CONFIRM

/** Our own social accounts (new). Empty = no icon rendered. Use full https:// URLs. */
export const SOCIAL = {
  instagram: "", // CONFIRM
  facebook: "", // CONFIRM
  tiktok: "", // CONFIRM
} as const;

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
  fr: "Fabriqué à Bethléem. Votre commande est expédiée depuis Bethléem ou depuis un stock partenaire ; nous vous confirmons lequel, avec une date de livraison estimée, avant le paiement.",
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

/** Days after delivery to request a return. */
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

/** Date the policy pages were last updated (YYYY-MM-DD). */
export const POLICY_UPDATED = "2026-10-24"; // CONFIRM

/** How many years order records are kept (privacy policy). 0 = not stated yet. */
export const DATA_RETENTION_YEARS = 0; // CONFIRM

/** Governing law for the terms, shown as written in every language, e.g. "Palestinian law". Empty = "to be confirmed". */
export const GOVERNING_LAW = ""; // CONFIRM (TODO)

/** Date of the accessibility statement (YYYY-MM-DD). */
export const ACCESSIBILITY_REVIEWED = "2026-10-24"; // CONFIRM

// Backwards-compatible aliases.
export const SISTER_STORE_URL = SISTER_STORE.url;
export const SISTER_STORE_NAME = SISTER_STORE.name;
