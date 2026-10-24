import { getTranslations } from "next-intl/server";

/** The four ordering steps, used on /how-to-order and on the order page. */
export async function OrderSteps({ headingLevel = 2 }: { headingLevel?: 2 | 3 }) {
  const t = await getTranslations("howToOrder");
  const Heading = headingLevel === 2 ? "h2" : "h3";
  return (
    <ol className="order-steps">
      {[1, 2, 3, 4].map((n) => (
        <li key={n}>
          <span className="step-number" aria-hidden="true">
            {n}
          </span>
          <div>
            <Heading>{t(`step${n}Title`)}</Heading>
            <p>{t(`step${n}Text`)}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
