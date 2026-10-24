import { getTranslations } from "next-intl/server";
import { ADDRESS, CONTACT_EMAIL, LEGAL_ENTITY_NAME, STORE_NAME, WHATSAPP_NUMBER } from "@/config/store";

/** The statutory model withdrawal form (EU Consumer Rights Directive, Annex I(B)), addressed to us. */
export async function WithdrawalForm() {
  const t = await getTranslations("returns");
  const recipient = [LEGAL_ENTITY_NAME || STORE_NAME, ADDRESS, `WhatsApp +${WHATSAPP_NUMBER}`, CONTACT_EMAIL].filter(Boolean).join(", ");
  return (
    <div className="withdrawal-form" role="group" aria-labelledby="form-title">
      <h3 id="form-title">{t("formTitle")}</h3>
      <p>{t("formIntro")}</p>
      <ul>
        <li>{t("formTo", { to: recipient })}</li>
        {[1, 2, 3, 4, 5, 6].map((n) => (
          <li key={n}>{t(`form${n}`)}</li>
        ))}
      </ul>
      <p className="note">{t("formNote")}</p>
    </div>
  );
}
