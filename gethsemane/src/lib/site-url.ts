// No imports: next.config.ts uses this too.

function origin(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  try {
    const url = new URL(raw.includes("://") ? raw : `https://${raw}`);
    if (url.protocol === "https:" || url.protocol === "http:") return url.origin;
  } catch {
    // not a URL
  }
  return undefined;
}

/**
 * SITE_URL when set. On Vercel without it: the project's production domain in production, the deployment URL in
 * previews. A production build with none of these fails in next.config.ts, so localhost never reaches a
 * deployed sitemap; the localhost fallback is only for `next dev` and local runs.
 */
export function resolveSiteUrl(env: Record<string, string | undefined> = process.env): string {
  return (
    origin(env.SITE_URL) ??
    (env.VERCEL_ENV === "production" ? origin(env.VERCEL_PROJECT_PRODUCTION_URL) : undefined) ??
    origin(env.VERCEL_URL) ??
    "http://localhost:3000"
  );
}

/** True when a production build has no way to know the public URL. */
export function siteUrlMissing(env: Record<string, string | undefined> = process.env): boolean {
  return !origin(env.SITE_URL) && !origin(env.VERCEL_PROJECT_PRODUCTION_URL) && !origin(env.VERCEL_URL);
}
