import { getTranslations } from "next-intl/server";
import { CONTACT_EMAIL } from "@/config/store";
import { Link } from "@/i18n/navigation";

/** Shown instead of account, tracking and checkout forms while the shop backend (database) is not set up. */
export async function BackendNotice() {
  const t = await getTranslations("auth");
  return (
    <div className="notice-card" role="status" data-testid="backend-notice">
      <h2>{t("unavailableTitle")}</h2>
      <p>{t("unavailableText")}</p>
      <p>
        {CONTACT_EMAIL && (
          <>
            <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
            {" · "}
          </>
        )}
        <Link href="/contact">{t("contactPage")}</Link>
      </p>
    </div>
  );
}
