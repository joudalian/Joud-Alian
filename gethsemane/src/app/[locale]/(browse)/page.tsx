import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ContentImage } from "@/components/ContentImage";
import { IllustrativeFigure, STORY_IMAGE_SIZES } from "@/components/IllustrativeFigure";
import { CartIcon, ChatIcon, GlobeTruckIcon, HandIcon, ReturnIcon } from "@/components/Icons";
import { JsonLd } from "@/components/JsonLd";
import { SocialLinks } from "@/components/SocialLinks";
import { ProductGrid } from "@/components/ProductCard";
import { DELIVERY_TIME, RETURN_DAYS } from "@/config/store";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/locales";
import { categories, categoryText, products } from "@/lib/catalog";
import { christmasProducts } from "@/lib/christmas";
import { formatDate } from "@/lib/format";
import { pageMetadata } from "@/lib/metadata";
import { socialLinks } from "@/lib/social";
import { website } from "@/lib/structured-data";
import { feature } from "@/server/features";
import { christmasOrderByDate } from "@/server/settings";

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
  const christmas = feature("christmas") && christmasProducts().length > 0;
  const orderBy = christmas ? christmasOrderByDate() : "";

  return (
    <>
      <section className="hero dark" aria-labelledby="hero-title">
        {/* Illustrative, AI-generated background (src/lib/content-image-sizes.ts): the largest paint, loaded first. */}
        <ContentImage name="hero-olive-grove" alt={t("imagery.heroAlt")} sizes="100vw" priority className="hero-bg" />
        <div className="container hero-grid">
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

      {christmas && (
        <section className="section container christmas-band" aria-labelledby="christmas-title" data-testid="christmas-band">
          <h2 id="christmas-title">{t("christmas.bandTitle")}</h2>
          <p>{t("christmas.bandText")}</p>
          {orderBy && <p className="note">{t("christmas.orderBy", { date: formatDate(orderBy, locale) })}</p>}
          <Link href="/christmas" className="btn btn-primary">
            {t("christmas.bandCta")}
          </Link>
        </section>
      )}

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
            <IllustrativeFigure name="craft-workshop" alt={t("imagery.craftAlt")} sizes={STORY_IMAGE_SIZES} className="craft-figure" />
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

      {socialLinks().length > 0 && (
        <section className="section container follow-along" aria-labelledby="follow-title" data-testid="follow-along">
          <h2 id="follow-title">{t("social.followTitle")}</h2>
          <p>{t("social.followText")}</p>
          <SocialLinks variant="pills" />
        </section>
      )}
      <JsonLd data={website(locale)} />
    </>
  );
}
