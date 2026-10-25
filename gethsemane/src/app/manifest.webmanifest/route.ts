import manifest from "@/lib/web-manifest";

// Served by a route handler rather than the app/manifest.ts convention so the page can link it with
// crossorigin="use-credentials" (app/[locale]/layout.tsx): fetched that way, the manifest reuses the page's
// connection instead of opening a separate, credential-less one while the page is still loading.
export const dynamic = "force-static";

export function GET() {
  return new Response(JSON.stringify(manifest()), { headers: { "Content-Type": "application/manifest+json" } });
}
