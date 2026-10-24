import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export default async function NotFound() {
  const t = await getTranslations("notFound");
  return (
    <div className="container status-page">
      <p className="code" aria-hidden="true">
        404
      </p>
      <h1>{t("title")}</h1>
      <p>{t("text")}</p>
      <div className="status-actions">
        <Link href="/" className="btn btn-primary">
          {t("home")}
        </Link>
      </div>
    </div>
  );
}
