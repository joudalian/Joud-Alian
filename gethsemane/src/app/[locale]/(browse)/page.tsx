import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CartIcon, ChatIcon, GlobeTruckIcon, HandIcon, ReturnIcon } from "@/components/Icons";
import { JsonLd } from "@/components/JsonLd";
import { MARK_SRC } from "@/components/Logo";
import { ProductGrid } from "@/components/ProductCard";
import { DELIVERY_TIME, RETURN_DAYS } from "@/config/store";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/locales";
import { categories, categoryText, products } from "@/lib/catalog";
import { pageMetadata } from "@/lib/metadata";
import { website } from "@/lib/structured-data";

type Props = { params: Promise<{ locale: Locale }> };

/** Set at build time (next.config.ts) when public/images/story/workshop.webp exists. */
const HAS_WORKSHOP_PHOTO = process.env.NEXT_PUBLIC_HAS_WORKSHOP_PHOTO === "1";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata({ locale, path: "" });
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const featured = products.filter((p) => p.featured);
  const trust = [
    { icon: <HandIcon size={26} />, text: t("home.trust1") },
    { icon: <GlobeTruckIcon size={26} />, text: t("home.trust2", { min: DELIVERY_TIME.min, max: DELIVERY_TIME.max }) },
    { icon: <ReturnIcon size={26} />, text: t("home.trust3", { days: RETURN_DAYS }) },
    { icon: <ChatIcon size={26} />, text: t("home.trust4") },
  ];
  // Gift ideas link to the categories that list them (src/data/categories.ts → gifts); empty ideas are hidden.
  const gifts = (["christmas", "faith", "home", "far"] as const)
    .map((id) => ({
      key: `${id[0]!.toUpperCase()}${id.slice(1)}`,
      links: categories.filter((c) => c.gifts.includes(id)).map((c) => ({ href: `/shop/${c.slug}`, label: categoryText(c, locale).name })),
    }))
    .filter((gift) => gift.links.length > 0);

  return (
    <>
      <section className="hero dark" aria-labelledby="hero-title">
        <div className="container hero-grid">
          <div className="hero-figure">
            {/* The emblem is the largest above-the-fold image on wide screens: load it first. */}
            <Image src={MARK_SRC} alt={t("home.heroAlt")} width={536} height={648} unoptimized preload fetchPriority="high" className="hero-mark" />
          </div>
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

      <section className="trust-strip" aria-label={t("home.trustLabel")}>
        <ul className="container trust-list">
          {trust.map((item) => (
            <li key={item.text}>
              {item.icon}
              <span>{item.text}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="section container" aria-labelledby="categories-title">
        <div className="section-head">
          <h2 id="categories-title">{t("home.categoriesTitle")}</h2>
        </div>
        <ul className="category-grid">
          {categories.map((category) => {
            const text = categoryText(category, locale);
            return (
              <li key={category.slug}>
                <Link href={`/shop/${category.slug}`} className="category-card">
                  {/* The heading inside the link names the category. */}
                  <Image src={category.image} alt="" width={800} height={600} sizes="(min-width: 1280px) 280px, (min-width: 768px) 45vw, 100vw" />
                  <div className="body" lang={text.lang === locale ? undefined : text.lang}>
                    <h3>{text.name}</h3>
                    <p>{text.description}</p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="section container" aria-labelledby="featured-title">
        <div className="section-head">
          <h2 id="featured-title">{t("home.featuredTitle")}</h2>
          <Link href="/shop">{t("home.viewAll")}</Link>
        </div>
        <ProductGrid products={featured} />
      </section>

      <section className="section container" aria-labelledby="gifts-title">
        <h2 id="gifts-title">{t("home.giftsTitle")}</h2>
        <ul className="gift-grid">
          {gifts.map((gift) => (
            <li key={gift.key} className="gift-card">
              <h3>{t(`home.gift${gift.key}Title`)}</h3>
              <p>{t(`home.gift${gift.key}Text`)}</p>
              <p className="gift-links">
                {gift.links.map((link) => (
                  <Link key={link.href} href={link.href} className="text-link">
                    {link.label}
                    <span aria-hidden="true"> →</span>
                  </Link>
                ))}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="section story dark" aria-labelledby="story-title">
        <div className="container story-grid">
          {HAS_WORKSHOP_PHOTO ? (
            <Image src="/images/story/workshop.webp" alt={t("home.storyImageAlt")} width={1200} height={900} sizes="(min-width: 768px) 50vw, 100vw" />
          ) : (
            <Image src="/brand/gethsemane-logo.png" alt={t("about.emblemAlt")} width={1024} height={1024} sizes="(min-width: 768px) 360px, 70vw" className="story-emblem" />
          )}
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

      <section className="section container" aria-labelledby="points-title">
        <h2 id="points-title">{t("home.pointsTitle")}</h2>
        {/* CONFIRM: point 1 ("From pruned branches") is a factual claim about where the wood comes from. */}
        <ul className="values">
          {[1, 2, 3].map((n) => (
            <li key={n}>
              <h3>{t(`home.point${n}Title`)}</h3>
              <p>{t(`home.point${n}Text`)}</p>
            </li>
          ))}
        </ul>
        <p className="center">
          <Link href="/how-to-order" className="btn btn-secondary">
            <CartIcon size={18} />
            {t("nav.howToOrder")}
          </Link>
        </p>
      </section>
      <JsonLd data={website(locale)} />
    </>
  );
}
