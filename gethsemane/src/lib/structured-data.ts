import {
  ADDRESS_COUNTRY,
  ADDRESS_LOCALITY,
  ADDRESS_STREET,
  CATALOG_READY,
  CONTACT_EMAIL,
  DELIVERY_TIME,
  PROCESSING_TIME,
  RETURN_DAYS,
  SHIP_TO_COUNTRIES,
  SOCIAL,
  STORE_NAME,
  WHATSAPP_NUMBER,
} from "@/config/store";
import type { Locale } from "@/i18n/locales";
import type { Product } from "./catalog";
import { productSku, productText } from "./catalog";
import { productImageSrc } from "./product-image";
import { localizedUrl, siteUrl } from "./site";

const orgId = () => `${siteUrl}/#organization`;

const availability = {
  in_stock: "https://schema.org/InStock",
  made_to_order: "https://schema.org/MadeToOrder",
  sold_out: "https://schema.org/SoldOut",
} as const;

/**
 * Return policy as schema.org MerchantReturnPolicy (mail returns, customer pays postage). The countries it
 * applies to come from SHIP_TO_COUNTRIES and are left out while that list is empty.
 */
export function returnPolicy(locale: Locale) {
  return {
    "@type": "MerchantReturnPolicy",
    ...(SHIP_TO_COUNTRIES.length ? { applicableCountry: [...SHIP_TO_COUNTRIES] } : {}),
    returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
    merchantReturnDays: RETURN_DAYS,
    returnMethod: "https://schema.org/ReturnByMail",
    returnFees: "https://schema.org/ReturnShippingFees",
    merchantReturnLink: localizedUrl(locale, "/returns"),
  };
}

export function organization(locale: Locale) {
  // Only our own accounts; the sister store is a separate business, not another profile of this one.
  const sameAs = Object.values(SOCIAL).filter(Boolean);
  const contactPoint: Record<string, unknown>[] = [
    { "@type": "ContactPoint", contactType: "customer service", telephone: `+${WHATSAPP_NUMBER}`, url: localizedUrl(locale, "/contact") },
  ];
  if (CONTACT_EMAIL) contactPoint.push({ "@type": "ContactPoint", contactType: "customer service", email: CONTACT_EMAIL });
  const address = ADDRESS_STREET
    ? { "@type": "PostalAddress", streetAddress: ADDRESS_STREET, addressLocality: ADDRESS_LOCALITY, addressCountry: ADDRESS_COUNTRY }
    : undefined;
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": orgId(),
    name: STORE_NAME,
    url: siteUrl,
    logo: `${siteUrl}/brand/gethsemane-logo.png`,
    ...(address ? { address } : {}),
    ...(sameAs.length ? { sameAs } : {}),
    contactPoint,
    hasMerchantReturnPolicy: returnPolicy(locale),
  };
}

export function website(locale: Locale) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: STORE_NAME,
    url: localizedUrl(locale, ""),
    inLanguage: locale,
    publisher: { "@id": orgId() },
  };
}

export function breadcrumbList(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({ "@type": "ListItem", position: i + 1, name: item.name, item: item.url })),
  };
}

/** Shipping details for SHIP_TO_COUNTRIES; none while that list is empty. Transit time is the headline range. */
function shippingDetails() {
  if (!SHIP_TO_COUNTRIES.length) return undefined;
  return {
    "@type": "OfferShippingDetails",
    shippingDestination: SHIP_TO_COUNTRIES.map((country) => ({ "@type": "DefinedRegion", addressCountry: country })),
    deliveryTime: {
      "@type": "ShippingDeliveryTime",
      businessDays: {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].map((d) => `https://schema.org/${d}`),
      },
      handlingTime: { "@type": "QuantitativeValue", minValue: PROCESSING_TIME.min, maxValue: PROCESSING_TIME.max, unitCode: "DAY" },
      transitTime: { "@type": "QuantitativeValue", minValue: DELIVERY_TIME.min, maxValue: DELIVERY_TIME.max, unitCode: "DAY" },
    },
  };
}

/**
 * Product in USD only (the other currencies on the site are approximate conversions). Offers are published only
 * once CATALOG_READY is true, so placeholder prices never reach search results.
 */
export function productLd(product: Product, locale: Locale) {
  const { name, description } = productText(product, locale);
  const url = localizedUrl(locale, `/product/${product.slug}`);
  const shipping = shippingDetails();
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name,
    description,
    url,
    image: product.images.map((img) => `${siteUrl}${productImageSrc(img.file, 1080)}`),
    sku: productSku(product),
    material: "Olive wood",
    brand: { "@type": "Brand", name: STORE_NAME },
    ...(CATALOG_READY
      ? {
          // One offer per variant (each with its own SKU and price), or one for the piece.
          offers: (product.variants.length ? product.variants : [undefined]).map((variant) => ({
            "@type": "Offer",
            url,
            sku: variant?.sku ?? product.sku,
            ...(variant ? { name: variant.label[locale] ?? variant.label.en } : {}),
            priceCurrency: "USD",
            price: (variant?.priceUsd ?? product.priceUsd).toFixed(2),
            availability: availability[product.availability],
            itemCondition: "https://schema.org/NewCondition",
            seller: { "@id": orgId() },
            ...(shipping ? { shippingDetails: shipping } : {}),
            hasMerchantReturnPolicy: returnPolicy(locale),
          })),
        }
      : {}),
  };
}

export function faqPage(items: { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({ "@type": "Question", name: item.q, acceptedAnswer: { "@type": "Answer", text: item.a } })),
  };
}
