import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SISTER_STORE_URL } from "@/config/store";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/locales";
import { pageMetadata } from "@/lib/metadata";

type Props = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "about" });
  return pageMetadata({ locale, path: "/about", title: t("title"), description: t("intro") });
}

export default async function AboutPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  return (
    <div className="container page">
      <div className="story-grid">
        <div className="prose">
          <span className="eyebrow">{t("meta.tagline")}</span>
          <h1>{t("about.title")}</h1>
          <p className="lead">{t("about.intro")}</p>
          <p>{t("about.p1")}</p>
          <p>{t("about.p2")}</p>
          <p>{t("about.p3")}</p>
          <p>
            {t.rich("about.sister", {
              link: (chunks) => (
                <a href={SISTER_STORE_URL} rel="noopener noreferrer">
                  {chunks}
                </a>
              ),
            })}
          </p>
          <Link href="/shop" className="btn btn-primary">
            {t("home.heroCta")}
          </Link>
        </div>
        <Image src="/images/about/olive-tree.webp" alt={t("about.title")} width={1200} height={900} sizes="(min-width: 768px) 50vw, 100vw" />
      </div>
    </div>
  );
}
