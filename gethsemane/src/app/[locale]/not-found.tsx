import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { MARK_SRC } from "@/components/Logo";
import { Link } from "@/i18n/navigation";

export default async function NotFound() {
  const t = await getTranslations("notFound");
  return (
    <div className="container status-page">
      <Image src={MARK_SRC} alt="" aria-hidden="true" width={93} height={112} unoptimized className="status-mark" />
      <h1>{t("title")}</h1>
      <p>{t("text")}</p>
      <div className="status-actions">
        <Link href="/shop" className="btn btn-primary">
          {t("shop")}
        </Link>
        <Link href="/" className="btn btn-secondary">
          {t("home")}
        </Link>
      </div>
    </div>
  );
}
