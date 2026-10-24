"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useId, useRef, type KeyboardEvent } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { LOCALE_COOKIE, localeNames, locales, type Locale } from "@/i18n/locales";
import { STORAGE_KEYS, setCookie, writeStorage } from "@/lib/storage";
import { CloseIcon, GlobeIcon } from "./Icons";

/**
 * Language item of the mobile bottom navigation: a button that opens a modal dialog listing the ten
 * languages. Uses the native <dialog> (inert background, Esc closes) plus an explicit focus trap, and
 * returns focus to the button when it closes.
 */
let pendingScroll: number | null = null;

export function LanguageDialogButton() {
  const t = useTranslations("language");
  const current = useLocale() as Locale;
  const pathname = usePathname();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dialogId = useId();
  const titleId = useId();

  const open = () => {
    const dialog = dialogRef.current;
    if (!dialog || dialog.open) return;
    dialog.showModal();
    dialog.querySelector<HTMLAnchorElement>('a[aria-current="true"]')?.focus();
  };
  const close = () => dialogRef.current?.close();

  // The navigation bar remounts in the new language, and navigating from inside the open modal dialog
  // resets the scroll position: the position is noted on click and put back once the new language renders.
  useEffect(() => {
    const y = pendingScroll;
    pendingScroll = null;
    if (y === null) return;
    window.scrollTo({ top: y, behavior: "instant" });
    buttonRef.current?.focus({ preventScroll: true });
  }, [current]);

  const trapFocus = (e: KeyboardEvent<HTMLDialogElement>) => {
    if (e.key !== "Tab") return;
    const focusable = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>("a[href], button") ?? []);
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (!first || !last) return;
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className="bottom-nav-button"
        aria-haspopup="dialog"
        aria-controls={dialogId}
        onClick={open}
        data-testid="language-dialog-button"
      >
        <span className="icon-wrap">
          <GlobeIcon />
        </span>
        <span className="label">{current.toUpperCase()}</span>
        <span className="sr-only">
          {" "}
          {t("button")}. {t("current", { language: localeNames[current] })}
        </span>
      </button>
      <dialog
        ref={dialogRef}
        id={dialogId}
        className="language-dialog"
        aria-labelledby={titleId}
        onKeyDown={trapFocus}
        onClose={() => buttonRef.current?.focus()}
        onClick={(e) => {
          // A click on the backdrop (outside the panel) closes the dialog.
          if (e.target === dialogRef.current) close();
        }}
      >
        <div className="language-dialog-panel">
          <div className="language-dialog-head">
            <h2 id={titleId}>{t("dialogTitle")}</h2>
            <button type="button" className="icon-btn" onClick={close} aria-label={t("close")}>
              <CloseIcon />
            </button>
          </div>
          <ul className="language-dialog-list">
            {locales.map((locale) => (
              <li key={locale}>
                <Link
                  href={pathname}
                  locale={locale}
                  scroll={false}
                  lang={locale}
                  hrefLang={locale}
                  aria-current={locale === current ? "true" : undefined}
                  onClick={() => {
                    setCookie(LOCALE_COOKIE, locale);
                    writeStorage(STORAGE_KEYS.language, locale);
                    if (locale === current) close();
                    else pendingScroll = window.scrollY;
                  }}
                >
                  <span>{localeNames[locale]}</span>
                  <span className="code" aria-hidden="true">
                    {locale.toUpperCase()}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </dialog>
    </>
  );
}
