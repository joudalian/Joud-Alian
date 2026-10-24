import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export async function Breadcrumb({ items }: { items: { href?: string; label: string }[] }) {
  const t = await getTranslations("nav");
  return (
    <nav className="breadcrumb" aria-label={t("breadcrumb")}>
      <ol>
        {items.map((item, i) =>
          item.href && i < items.length - 1 ? (
            <li key={item.label}>
              <Link href={item.href}>{item.label}</Link>
            </li>
          ) : (
            <li key={item.label}>
              <span aria-current="page">{item.label}</span>
            </li>
          ),
        )}
      </ol>
    </nav>
  );
}
