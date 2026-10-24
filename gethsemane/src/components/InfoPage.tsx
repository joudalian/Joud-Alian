import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/locales";
import { formatDate } from "@/lib/format";
import { Breadcrumb } from "./Breadcrumb";

/** Shared layout of the help and policy pages: breadcrumb, title, intro, optional "last updated". */
export async function InfoPage({
  locale,
  path,
  title,
  intro,
  updated,
  children,
}: {
  locale: Locale;
  path: string;
  title: string;
  intro?: ReactNode;
  updated?: string;
  children: ReactNode;
}) {
  const t = await getTranslations({ locale });
  return (
    <div className="container page info-page">
      <Breadcrumb currentPath={path} items={[{ href: "/", label: t("nav.home") }, { label: title }]} />
      <h1>{title}</h1>
      {intro && <p className="lead">{intro}</p>}
      {updated && <p className="note updated">{t("policy.lastUpdated", { date: formatDate(updated, locale) })}</p>}
      <div className="prose info-body">{children}</div>
    </div>
  );
}

export function Section({ id, title, children }: { id?: string; title: string; children: ReactNode }) {
  return (
    <section className="info-section" aria-labelledby={id ? `${id}-title` : undefined}>
      <h2 id={id ? `${id}-title` : undefined}>{title}</h2>
      {children}
    </section>
  );
}
