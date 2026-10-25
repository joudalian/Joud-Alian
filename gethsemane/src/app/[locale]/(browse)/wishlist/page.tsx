import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { WishlistView } from "@/components/WishlistView";
import type { Locale } from "@/i18n/locales";
import { pageMetadata } from "@/lib/metadata";
import { orderLookup } from "@/lib/order-lookup";
import { hasSessionCookie } from "@/lib/session-cookie";
import { feature } from "@/server/features";
import { Link } from "@/i18n/navigation";
import { cookies } from "next/headers";

type Props = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "wishlist" });
  return pageMetadata({ locale, path: "/wishlist", title: t("title"), noindex: true });
}

export default async function WishlistPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("wishlist");
  return (
    <div className="container page">
      <h1>{t("title")}</h1>
      {!feature("wishlistSync") ? (
        <p className="note">{t("storedNote")}</p>
      ) : hasSessionCookie(await cookies()) ? (
        <p className="note" data-testid="wishlist-synced">
          {t("syncedNote")}
        </p>
      ) : (
        <p className="note" data-testid="wishlist-sign-in">
          {t.rich("signInNote", { link: (chunks) => <Link href={`/login?next=${encodeURIComponent(`/${locale}/wishlist`)}`}>{chunks}</Link> })}
        </p>
      )}
      <WishlistView lookup={orderLookup(locale)} />
    </div>
  );
}
