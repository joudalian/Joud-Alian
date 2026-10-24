import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { HeroImage } from "@/components/HeroImage";
import { LogoMark } from "@/components/Logo";
import { HandIcon, LeafIcon, ShieldIcon } from "@/components/Icons";
import { ProductGrid } from "@/components/ProductCard";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/locales";
import { categoryImage, categorySlugs, products } from "@/lib/catalog";
import { pageMetadata } from "@/lib/metadata";

type Props = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata({ locale, path: "" });
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const featured = products.filter((p) => "featured" in p && p.featured);
  const values = [
    { icon: <HandIcon size={28} />, title: t("home.value1Title"), text: t("home.value1Text") },
    { icon: <LeafIcon size={28} />, title: t("home.value2Title"), text: t("home.value2Text") },
    { icon: <ShieldIcon size={28} />, title: t("home.value3Title"), text: t("home.value3Text") },
  ];

  return (
    <>
      <section className="hero dark" aria-labelledby="hero-title">
        <HeroImage src="/images/hero/home.webp" alt={t("home.heroAlt")} />
        <div className="hero-ornament" aria-hidden="true">
          <LogoMark width={300} className="logo-mark hero-mark" />
        </div>
        <div className="container">
          <div className="hero-content">
            <span className="eyebrow">{t("meta.tagline")}</span>
            <h1 id="hero-title">{t("home.heroTitle")}</h1>
            <p>{t("home.heroText")}</p>
            <div className="hero-actions">
              <Link href="/shop" className="btn btn-light">
                {t("home.heroCta")}
              </Link>
              <Link href="/about" className="btn btn-ghost-light">
                {t("home.heroSecondary")}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="section container" aria-labelledby="categories-title">
        <div className="section-head">
          <h2 id="categories-title">{t("home.categoriesTitle")}</h2>
        </div>
        <ul className="category-grid">
          {categorySlugs.map((slug) => (
            <li key={slug}>
              <Link href={`/shop/${slug}`} className="category-card">
                <Image src={categoryImage(slug)} alt={t(`categories.${slug}.name`)} width={800} height={600} sizes="(min-width: 1280px) 280px, (min-width: 768px) 45vw, 100vw" />
                <div className="body">
                  <h3>{t(`categories.${slug}.name`)}</h3>
                  <p>{t(`categories.${slug}.description`)}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="section container" aria-labelledby="featured-title">
        <div className="section-head">
          <h2 id="featured-title">{t("home.featuredTitle")}</h2>
          <Link href="/shop">{t("home.viewAll")}</Link>
        </div>
        <ProductGrid products={featured} />
      </section>

      <section className="section story dark" aria-labelledby="story-title">
        <div className="container story-grid">
          <Image src="/images/about/olive-tree.webp" alt={t("about.title")} width={1200} height={900} sizes="(min-width: 768px) 50vw, 100vw" />
          <div>
            <span className="eyebrow">{t("meta.tagline")}</span>
            <h2 id="story-title">{t("home.storyTitle")}</h2>
            <p>{t("home.storyText")}</p>
            <Link href="/about" className="btn btn-ghost-light">
              {t("home.storyCta")}
            </Link>
          </div>
        </div>
      </section>

      <section className="section container" aria-labelledby="values-title">
        <h2 id="values-title">{t("home.valuesTitle")}</h2>
        <ul className="values">
          {values.map((v) => (
            <li key={v.title}>
              {v.icon}
              <h3>{v.title}</h3>
              <p>{v.text}</p>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
