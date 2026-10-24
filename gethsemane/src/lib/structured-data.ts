import {
  ADDRESS,
  CONTACT_EMAIL,
  DELIVERY_TIME,
  PROCESSING_TIME,
  RETURN_DAYS,
  SISTER_STORE,
  SOCIAL,
  STORE_NAME,
  WHATSAPP_NUMBER,
} from "@/config/store";
import type { Locale } from "@/i18n/locales";
import type { Product } from "./catalog";
import { productText } from "./catalog";
import { localizedUrl, siteUrl } from "./site";

const orgId = () => `${siteUrl}/#organization`;

/** Return policy as schema.org MerchantReturnPolicy (worldwide, mail returns, customer pays postage). */
export function returnPolicy(locale: Locale) {
  return {
    "@type": "MerchantReturnPolicy",
    applicableCountry: "ZZ",
    returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
    merchantReturnDays: RETURN_DAYS,
    returnMethod: "https://schema.org/ReturnByMail",
    returnFees: "https://schema.org/ReturnShippingFees",
    merchantReturnLink: localizedUrl(locale, "/returns"),
  };
}

export function organization(locale: Locale) {
  const sameAs = [...Object.values(SOCIAL).filter(Boolean), SISTER_STORE.url];
  const contactPoint: Record<string, unknown>[] = [
    { "@type": "ContactPoint", contactType: "customer service", telephone: `+${WHATSAPP_NUMBER}`, url: localizedUrl(locale, "/contact") },
  ];
  if (CONTACT_EMAIL) contactPoint.push({ "@type": "ContactPoint", contactType: "customer service", email: CONTACT_EMAIL });
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": orgId(),
    name: STORE_NAME,
    url: siteUrl,
    logo: `${siteUrl}/brand/gethsemane-logo.png`,
    ...(ADDRESS ? { address: { "@type": "PostalAddress", streetAddress: ADDRESS } } : {}),
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

/** Product in USD only (the other currencies on the site are approximate conversions). */
export function productLd(product: Product, locale: Locale) {
  const { name, description } = productText(product, locale);
  const url = localizedUrl(locale, `/product/${product.slug}`);
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name,
    description,
    image: [`${siteUrl}${product.image}`],
    sku: `GTH-${product.id}`,
    material: "Olive wood",
    brand: { "@type": "Brand", name: STORE_NAME },
    offers: {
      "@type": "Offer",
      url,
      priceCurrency: "USD",
      price: product.priceUsd.toFixed(2),
      availability: "https://schema.org/InStock",
      itemCondition: "https://schema.org/NewCondition",
      seller: { "@id": orgId() },
      shippingDetails: {
        "@type": "OfferShippingDetails",
        shippingDestination: { "@type": "DefinedRegion", addressCountry: "ZZ" },
        deliveryTime: {
          "@type": "ShippingDeliveryTime",
          handlingTime: { "@type": "QuantitativeValue", minValue: PROCESSING_TIME.min, maxValue: PROCESSING_TIME.max, unitCode: "DAY" },
          transitTime: { "@type": "QuantitativeValue", minValue: DELIVERY_TIME.min, maxValue: DELIVERY_TIME.max, unitCode: "DAY" },
        },
      },
      hasMerchantReturnPolicy: returnPolicy(locale),
    },
  };
}

export function faqPage(items: { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({ "@type": "Question", name: item.q, acceptedAnswer: { "@type": "Answer", text: item.a } })),
  };
}
