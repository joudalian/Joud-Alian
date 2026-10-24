import { getTranslations } from "next-intl/server";

export default async function Loading() {
  const t = await getTranslations("common");
  return (
    <div className="container loading-state" role="status" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      {t("loading")}
    </div>
  );
}
