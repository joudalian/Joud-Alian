"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { useCart, useWishlist } from "@/lib/client-store";
import { CartIcon, HeartIcon, HomeIcon, ShopIcon } from "./Icons";
import { LanguageDialogButton } from "./LanguageDialog";

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Desktop navigation links in the header. */
export function MainNav() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const items = [
    { href: "/", label: t("home") },
    { href: "/shop", label: t("shop") },
    { href: "/about", label: t("about") },
  ];
  return (
    <nav className="main-nav" aria-label={t("main")}>
      <ul>
        {items.map((item) => (
          <li key={item.href}>
            <Link href={item.href} aria-current={isActive(pathname, item.href) ? "page" : undefined}>
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function Count({ value }: { value: number }) {
  if (value === 0) return null;
  return (
    <span className="badge" aria-hidden="true">
      {value > 99 ? "99+" : value}
    </span>
  );
}

/** Wishlist and cart icon links shown in the header from tablet width up. */
export function HeaderActions() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const { count } = useCart();
  const { count: saved } = useWishlist();
  return (
    <>
      <Link
        href="/wishlist"
        className="icon-btn header-desktop-only"
        aria-label={t("wishlistWithCount", { count: saved })}
        aria-current={isActive(pathname, "/wishlist") ? "page" : undefined}
      >
        <HeartIcon />
        <Count value={saved} />
      </Link>
      <Link
        href="/cart"
        className="icon-btn header-desktop-only"
        aria-label={t("cartWithCount", { count })}
        aria-current={isActive(pathname, "/cart") ? "page" : undefined}
      >
        <CartIcon />
        <Count value={count} />
      </Link>
    </>
  );
}

/** Fixed bottom navigation on phones. */
export function BottomNav() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const { count } = useCart();
  const { count: saved } = useWishlist();
  const links = [
    { href: "/", label: t("home"), icon: <HomeIcon />, aria: undefined },
    { href: "/shop", label: t("shop"), icon: <ShopIcon />, aria: undefined },
    {
      href: "/wishlist",
      label: t("wishlist"),
      icon: <HeartIcon />,
      aria: t("wishlistWithCount", { count: saved }),
      count: saved,
    },
    { href: "/cart", label: t("orderShort"), icon: <CartIcon />, aria: t("cartWithCount", { count }), count },
  ];
  return (
    <nav className="bottom-nav" aria-label={t("mobile")}>
      <ul>
        {links.map((link) => (
          <li key={link.href}>
            <Link href={link.href} aria-label={link.aria} aria-current={isActive(pathname, link.href) ? "page" : undefined}>
              <span className="icon-wrap">
                {link.icon}
                {link.count !== undefined && <Count value={link.count} />}
              </span>
              <span className="label">{link.label}</span>
            </Link>
          </li>
        ))}
        <li>
          <LanguageDialogButton />
        </li>
      </ul>
    </nav>
  );
}
