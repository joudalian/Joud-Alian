import { SOCIAL, SOCIAL_HANDLES } from "@/config/store";

export type SocialNetwork = "instagram" | "tiktok" | "facebook";
export type SocialLink = { network: SocialNetwork; name: string; url: string; handle?: string };

/** Platform names are brand words: the same in every language. */
export const SOCIAL_NAMES: Record<SocialNetwork, string> = { instagram: "Instagram", tiktok: "TikTok", facebook: "Facebook" };

/** Query parameters that only track who shared a link (never kept in our links). */
const TRACKING = /^(utm_[a-z]+|xtok|_r|_t|mibextid|fbclid|igsh|igshid|si|ref|share_app_id)$/i;

/** The URL without tracking parameters or fragments. */
export function cleanUrl(raw: string): string {
  const url = new URL(raw);
  for (const key of [...url.searchParams.keys()]) if (TRACKING.test(key)) url.searchParams.delete(key);
  url.hash = "";
  return url.toString();
}

/**
 * Our social accounts that are set, in display order, with clean URLs and handles. The arguments exist so tests
 * can check that empty entries render nothing.
 */
export function socialLinks(
  social: Partial<Record<SocialNetwork, string>> = SOCIAL,
  handles: Partial<Record<SocialNetwork, string>> = SOCIAL_HANDLES,
): SocialLink[] {
  return (Object.keys(social) as SocialNetwork[])
    .filter((network) => social[network]?.trim())
    .map((network) => ({ network, name: SOCIAL_NAMES[network], url: cleanUrl(social[network]!.trim()), handle: handles[network] || undefined }));
}
