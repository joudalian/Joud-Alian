import { getTranslations } from "next-intl/server";
import { socialLinks, type SocialLink, type SocialNetwork } from "@/lib/social";
import { FacebookIcon, InstagramIcon, TikTokIcon } from "./Icons";

const icons: Record<SocialNetwork, typeof InstagramIcon> = { instagram: InstagramIcon, tiktok: TikTokIcon, facebook: FacebookIcon };

/**
 * Links to our own social profiles (plain links: no embeds, feeds or platform scripts). Renders nothing when no
 * account is set.
 *   icons  44 px icon buttons (footer), named "Gethsemane on Instagram (opens in a new tab)"
 *   pills  outlined buttons with icon, platform name and handle (home page, contact page)
 */
export async function SocialLinks({
  variant,
  links = socialLinks(),
  testId,
}: {
  variant: "icons" | "pills";
  links?: SocialLink[];
  testId?: string;
}) {
  if (links.length === 0) return null;
  const t = await getTranslations();
  const newTab = t("social.newTab");
  return (
    <ul className={`social-links social-${variant}`} data-testid={testId}>
      {links.map((link) => {
        const Icon = icons[link.network];
        return (
          <li key={link.network}>
            {variant === "icons" ? (
              <a
                href={link.url}
                className="icon-btn social-icon"
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${t("social.on", { network: link.name })} (${newTab})`}
                data-network={link.network}
              >
                <Icon />
              </a>
            ) : (
              <a href={link.url} className="social-pill" target="_blank" rel="noopener noreferrer" data-network={link.network}>
                <Icon size={20} />
                <span className="social-name">{link.name}</span>
                {link.handle && (
                  <span className="social-handle" lang="en" translate="no">
                    {link.handle}
                  </span>
                )}
                <span className="sr-only"> ({newTab})</span>
              </a>
            )}
          </li>
        );
      })}
    </ul>
  );
}
