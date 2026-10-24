import { getTranslations } from "next-intl/server";
import { DELIVERY_BY_REGION } from "@/config/store";

/** Static delivery estimates by region, from config (not a calculator). */
export async function DeliveryTable({ caption }: { caption: string }) {
  const t = await getTranslations();
  return (
    <div className="table-wrap">
      <table className="delivery-table">
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">{t("shipping.regionCol")}</th>
            <th scope="col">{t("shipping.timeCol")}</th>
          </tr>
        </thead>
        <tbody>
          {DELIVERY_BY_REGION.map((r) => (
            <tr key={r.region}>
              <th scope="row">{t(`regions.${r.region}`)}</th>
              <td>
                {r.min}–{r.max}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
