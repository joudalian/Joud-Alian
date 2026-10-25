"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { LOCALE_COOKIE, localeNames, locales, type Locale } from "@/i18n/locales";
import { STORAGE_KEYS, parseLanguage, readStorage, setCookie, writeStorage } from "@/lib/storage";
import { GlobeIcon } from "./Icons";

function rememberLanguage(locale: Locale) {
  setCookie(LOCALE_COOKIE, locale);
  writeStorage(STORAGE_KEYS.language, locale);
}

/** Floating language button. Each option is a real link to the same page in another language. */
export function LanguageSwitcher() {
  const t = useTranslations("language");
  const current = useLocale() as Locale;
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [tucked, setTucked] = useState(false);
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Keep the stored preference in sync with the page the visitor is actually reading.
  useEffect(() => {
    if (parseLanguage(readStorage(STORAGE_KEYS.language)) !== current) rememberLanguage(current);
  }, [current]);

  // The button floats over the page; it steps aside whenever it would cover a button or form control.
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const fab = buttonRef.current?.getBoundingClientRect();
      if (!fab) return;
      const pad = 6;
      const controls = document.querySelectorAll<HTMLElement>("main button, main a.btn, main select, main input, main .chips a, .social-links a, .footer-email");
      let covered = false;
      for (const el of controls) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        if (r.left < fab.right + pad && r.right > fab.left - pad && r.top < fab.bottom + pad && r.bottom > fab.top - pad) {
          covered = true;
          break;
        }
      }
      setTucked(covered);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    const observer = new MutationObserver(schedule);
    const main = document.getElementById("main");
    if (main) observer.observe(main, { childList: true, subtree: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      observer.disconnect();
    };
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const links = listRef.current?.querySelectorAll<HTMLAnchorElement>("a");
    const active = listRef.current?.querySelector<HTMLAnchorElement>('a[aria-current="true"]');
    (active ?? links?.[0])?.focus();
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [open]);

  const close = (returnFocus: boolean) => {
    setOpen(false);
    if (returnFocus) buttonRef.current?.focus();
  };

  const onMenuKeyDown = (e: KeyboardEvent<HTMLUListElement>) => {
    const links = Array.from(listRef.current?.querySelectorAll<HTMLAnchorElement>("a") ?? []);
    const index = links.indexOf(document.activeElement as HTMLAnchorElement);
    let next: HTMLAnchorElement | undefined;
    if (e.key === "ArrowDown") next = links[(index + 1) % links.length];
    else if (e.key === "ArrowUp") next = links[(index - 1 + links.length) % links.length];
    else if (e.key === "Home") next = links[0];
    else if (e.key === "End") next = links[links.length - 1];
    else if (e.key === "Escape") {
      e.preventDefault();
      close(true);
      return;
    }
    if (next) {
      e.preventDefault();
      next.focus();
    }
  };

  return (
    <div
      className="lang-fab"
      ref={rootRef}
      data-tucked={tucked && !open ? "true" : undefined}
      onBlur={(e) => {
        if (open && !rootRef.current?.contains(e.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      {open && (
        <ul id={menuId} className="lang-menu" ref={listRef} aria-label={t("list")} onKeyDown={onMenuKeyDown}>
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
                  rememberLanguage(locale);
                  setOpen(false);
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
      )}
      <button
        ref={buttonRef}
        type="button"
        className="lang-fab-button"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === "Escape" && open) close(true);
          if (e.key === "ArrowUp" && !open) {
            e.preventDefault();
            setOpen(true);
          }
        }}
      >
        <GlobeIcon size={20} />
        <span>{current.toUpperCase()}</span>
        <span className="sr-only">
          {" "}
          {t("button")}. {t("current", { language: localeNames[current] })}
        </span>
      </button>
    </div>
  );
}
