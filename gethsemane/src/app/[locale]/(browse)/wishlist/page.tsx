import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { WishlistView } from "@/components/WishlistView";
import type { Locale } from "@/i18n/locales";
import { pageMetadata } from "@/lib/metadata";
import { orderLookup } from "@/lib/order-lookup";

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
      <p className="note">{t("storedNote")}</p>
      <WishlistView lookup={orderLookup(locale)} />
    </div>
  );
}
