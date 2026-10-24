import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Breadcrumb } from "@/components/Breadcrumb";
import { SISTER_STORE } from "@/config/store";
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
      <Breadcrumb currentPath="/about" items={[{ href: "/", label: t("nav.home") }, { label: t("about.title") }]} />
      <div className="story-grid about-grid">
        <Image
          src="/brand/gethsemane-logo.png"
          alt={t("about.emblemAlt")}
          width={1024}
          height={1024}
          sizes="(min-width: 1024px) 440px, (min-width: 768px) 40vw, min(80vw, 400px)"
          preload
          className="about-emblem"
        />
        <div className="prose">
          <span className="eyebrow">{t("meta.tagline")}</span>
          <h1>{t("about.title")}</h1>
          <p className="lead">{t("about.intro")}</p>
          {/* CONFIRM: the wood comes from branches trimmed when the trees are pruned. */}
          <p>{t("about.p1")}</p>
          <p>{t("about.p2")}</p>
          <h2>{t("about.nameTitle")}</h2>
          <p>{t("about.name")}</p>
          <p>{t("about.p3")}</p>
          <p>
            {t.rich("about.sister", {
              link: (chunks) => (
                <a href={SISTER_STORE.url} rel="noopener noreferrer">
                  {chunks}
                </a>
              ),
            })}
          </p>
          <Link href="/shop" className="btn btn-primary">
            {t("home.heroCta")}
          </Link>
        </div>
      </div>
    </div>
  );
}
