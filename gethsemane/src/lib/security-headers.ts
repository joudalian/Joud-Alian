export const staticSecurityHeaders = [
  // No includeSubDomains/preload until every subdomain serves HTTPS for good (see README, Security).
  { key: "Strict-Transport-Security", value: "max-age=63072000" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value:
      "camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=(), browsing-topics=(), interest-cohort=()",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
];

/**
 * Where a form may send the browser: this site, and Stripe's hosted payment page (the checkout form's answer is a
 * redirect there). STRIPE_CHECKOUT_ORIGIN replaces Stripe's origin for the local payment stand-in in the tests.
 */
export function formActionSources(): string {
  const stripe = process.env.STRIPE_CHECKOUT_ORIGIN ?? "https://checkout.stripe.com";
  return `'self' ${stripe}`;
}

export function buildCsp(nonce: string, isDev: boolean): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    // Inline style *attributes* (used by next/image) need 'unsafe-inline'; no external styles are allowed.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    `connect-src 'self'${isDev ? " ws:" : ""}`,
    "media-src 'self'",
    "manifest-src 'self'",
    "worker-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    `form-action ${formActionSources()}`,
    "frame-src 'none'",
    "frame-ancestors 'none'",
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}
