import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/locales";
import { countryName } from "@/lib/countries";
import { formatPrice } from "@/lib/currency";
import type { OrderView } from "@/server/orders";

const money = (cents: number, locale: Locale) => formatPrice(cents / 100, "USD", locale);
const when = (date: Date, locale: Locale) => new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(date);

/** Status, items, totals, address, tracking and history of one order (account, guest tracking, confirmation, admin). */
export async function OrderDetails({ order, locale }: { order: OrderView; locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "order" });
  const address = [order.shipName, order.shipLine1, order.shipLine2, [order.shipPostalCode, order.shipCity].filter(Boolean).join(" "), order.shipRegion, countryName(order.shipCountry, locale)].filter(Boolean);
  return (
    <div className="order-details" data-testid="order-details">
      <dl className="order-meta">
        <div>
          <dt>{t("number")}</dt>
          <dd data-testid="order-number">{order.number}</dd>
        </div>
        <div>
          <dt>{t("date")}</dt>
          <dd>{when(order.createdAt, locale)}</dd>
        </div>
        <div>
          <dt>{t("statusLabel")}</dt>
          <dd>
            <span className={`status status-${order.status}`} data-testid="order-status">
              {t(`status.${order.status}`)}
            </span>
          </dd>
        </div>
        <div>
          <dt>{t("total")}</dt>
          <dd>{money(order.totalCents, locale)}</dd>
        </div>
      </dl>
      {order.testMode && <p className="note warning-note">{t("testOrder")}</p>}

      {(order.trackingNumber || order.carrier) && (
        <section className="order-tracking" aria-labelledby="tracking-title" data-testid="order-tracking">
          <h2 id="tracking-title">{t("trackingTitle")}</h2>
          <p>
            {order.carrier && <>{t("carrier", { carrier: order.carrier })} </>}
            {order.trackingNumber && <span>{t("trackingNumber", { number: order.trackingNumber })}</span>}
          </p>
        </section>
      )}

      <section aria-labelledby="items-title">
        <h2 id="items-title">{t("itemsTitle")}</h2>
        <table className="order-table">
          <thead>
            <tr>
              <th scope="col">{t("item")}</th>
              <th scope="col">{t("qty")}</th>
              <th scope="col">{t("lineTotal")}</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={item.id}>
                <td>
                  <span className="item-name">{item.nameLocalized}</span>
                  {item.variantLabel && <span className="item-detail">{item.variantLabel}</span>}
                  {item.engraving && <span className="item-detail">{t("engraving", { text: item.engraving })}</span>}
                  <span className="item-detail">{t("sku", { sku: item.sku })}</span>
                </td>
                <td>{item.quantity}</td>
                <td>{money(item.lineTotalCents, locale)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row" colSpan={2}>
                {t("subtotal")}
              </th>
              <td>{money(order.subtotalCents, locale)}</td>
            </tr>
            {order.discountCents > 0 && (
              <tr>
                <th scope="row" colSpan={2}>
                  {t("discount", { code: order.couponCode ?? "" })}
                </th>
                <td>−{money(order.discountCents, locale)}</td>
              </tr>
            )}
            <tr>
              <th scope="row" colSpan={2}>
                {t("shipping")}
              </th>
              <td>{money(order.shippingCents, locale)}</td>
            </tr>
            <tr className="order-total">
              <th scope="row" colSpan={2}>
                {t("totalUsd")}
              </th>
              <td>{money(order.totalCents, locale)}</td>
            </tr>
          </tfoot>
        </table>
      </section>

      <div className="order-columns">
        <section aria-labelledby="ship-title">
          <h2 id="ship-title">{t("shipTo")}</h2>
          <address>
            {address.map((line, i) => (
              <span key={i}>
                {line}
                <br />
              </span>
            ))}
          </address>
          {order.giftNote && <p className="note">{t("giftNote", { note: order.giftNote })}</p>}
        </section>
        <section aria-labelledby="history-title">
          <h2 id="history-title">{t("historyTitle")}</h2>
          <ol className="order-history">
            {order.events
              .filter((e) => !e.internal)
              .map((e) => (
                <li key={e.id}>
                  <time dateTime={e.createdAt.toISOString()}>{when(e.createdAt, locale)}</time> —{" "}
                  {t.has(`event.${e.type}`) ? t(`event.${e.type}`) : e.type}
                </li>
              ))}
          </ol>
        </section>
      </div>
    </div>
  );
}
