import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { staticSecurityHeaders } from "./src/lib/security-headers";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  productionBrowserSourceMaps: false,
  experimental: {
    // Inline the (small) stylesheet into the HTML so it does not block rendering.
    inlineCss: true,
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
    return [{ source: "/:path*", headers: staticSecurityHeaders }];
  },
};

export default withNextIntl(nextConfig);
