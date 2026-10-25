import { existsSync } from "node:fs";
import type { NextConfig } from "next";
import { PHASE_PRODUCTION_BUILD } from "next/constants";
import createNextIntlPlugin from "next-intl/plugin";
import { staticSecurityHeaders } from "./src/lib/security-headers";
import { siteUrlMissing } from "./src/lib/site-url";

const withNextIntl = createNextIntlPlugin({
  requestConfig: "./src/i18n/request.ts",
  // Messages are compiled at build time, so the browser gets no ICU message parser (about 50 KB of JavaScript).
  experimental: { messages: { path: "./messages", format: "json", locales: "infer", precompile: true } },
});

const nextConfig: NextConfig = {
  env: {
    // The home story section shows this photo when it exists (see README "Story photo"), otherwise the emblem.
    NEXT_PUBLIC_HAS_WORKSHOP_PHOTO: existsSync("./public/images/story/workshop.webp") ? "1" : "",
    // security.txt expires one year after the build.
    BUILD_TIME: new Date().toISOString(),
  },
  poweredByHeader: false,
  reactStrictMode: true,
  productionBrowserSourceMaps: false,
  experimental: {
    // Not inlined: Next.js would put the stylesheet into every page three times (a <style> tag plus two copies in
    // the RSC payload), about 20 KB of gzip per page. Over HTTP/2 (production) the separate, cached stylesheet loads
    // on the same connection and the smaller HTML paints sooner (measured with Lighthouse mobile).
    inlineCss: false,
  },
  images: {
    // All images are local files in /public. No remote hosts are allowed.
    remotePatterns: [],
    dangerouslyAllowSVG: false,
    formats: ["image/avif", "image/webp"],
    deviceSizes: [320, 390, 640, 768, 1024, 1280, 1600],
    imageSizes: [96, 160, 256, 384],
  },
  async headers() {
    // The Content-Security-Policy (with a per-request nonce) is set in src/proxy.ts.
    // These headers apply to every response, including static files.
    return [
      { source: "/:path*", headers: staticSecurityHeaders },
      // Photos and brand files change rarely; a day of caching keeps updates visible quickly.
      { source: "/images/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=86400" }] },
      { source: "/brand/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=86400" }] },
      // Preview deployments on *.vercel.app must never be indexed; only the custom domain (SITE_URL) is.
      {
        source: "/:path*",
        has: [{ type: "host", value: "(?<host>.*)\\.vercel\\.app" }],
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
};

export default function config(phase: string): NextConfig {
  // Canonical URLs, hreflang, the sitemap and robots.txt are built from the site URL: never ship localhost.
  if (phase === PHASE_PRODUCTION_BUILD && siteUrlMissing()) {
    throw new Error("SITE_URL is not set. Set SITE_URL=https://your-domain for production builds (see README, Deploying).");
  }
  return withNextIntl(nextConfig);
}
