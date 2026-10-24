import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { productImage, type Product, type ProductSlug } from "@/lib/catalog";
import { Price } from "./Price";
import { AddToCartButton, WishlistToggle } from "./ProductActions";

export async function ProductCard({ product, headingLevel = 3 }: { product: Product; headingLevel?: 2 | 3 }) {
  const t = await getTranslations("products");
  const slug = product.slug as ProductSlug;
  const name = t(`${slug}.name`);
  const Heading = headingLevel === 2 ? "h2" : "h3";
  return (
    <article className="product-card">
      <div className="media">
        <Image
          src={productImage(slug)}
          alt={name}
          width={800}
          height={1000}
          sizes="(min-width: 1280px) 280px, (min-width: 768px) 30vw, (min-width: 360px) 50vw, 100vw"
        />
        <WishlistToggle slug={slug} name={name} />
      </div>
      <div className="body">
        <Heading>
          <Link href={`/product/${slug}`}>{name}</Link>
        </Heading>
        <Price usd={product.priceUsd} />
        <div className="actions">
          <AddToCartButton slug={slug} />
        </div>
      </div>
    </article>
  );
}

export function ProductGrid({ products, headingLevel }: { products: readonly Product[]; headingLevel?: 2 | 3 }) {
  return (
    <ul className="product-grid">
      {products.map((product) => (
        <li key={product.slug}>
          <ProductCard product={product} headingLevel={headingLevel} />
        </li>
      ))}
    </ul>
  );
}
