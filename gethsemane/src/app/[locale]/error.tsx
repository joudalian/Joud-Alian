"use client";

import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { Link } from "@/i18n/navigation";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("error");
  useEffect(() => {
    console.error(error.digest ?? "Unexpected error");
  }, [error]);
  return (
    <div className="container status-page" role="alert">
      <h1>{t("title")}</h1>
      <p>{t("text")}</p>
      <div className="status-actions">
        <button type="button" className="btn btn-primary" onClick={reset}>
          {t("retry")}
        </button>
        <Link href="/" className="btn btn-secondary">
          {t("home")}
        </Link>
      </div>
    </div>
  );
}
