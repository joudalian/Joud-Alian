import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { features } from "@/server/features";

function sections() {
  const flags = features();
  return [
    { href: "/admin", label: "Orders" },
    { href: "/admin/coupons", label: "Coupons" },
    ...(flags.bulkOrders ? [{ href: "/admin/enquiries", label: "Bulk enquiries" }] : []),
    ...(flags.reviews ? [{ href: "/admin/reviews", label: "Reviews" }] : []),
    ...(flags.newsletter ? [{ href: "/admin/newsletter", label: "Newsletter" }] : []),
  ];
}

/** Never indexed, never followed, no alternates: the admin area is not a public page. */
export const adminMetadata = (title: string): Metadata => ({ title: `${title} · Admin`, robots: { index: false, follow: false } });

/** Owner area layout (English only). */
export function AdminShell({ current, title, children }: { current: string; title: string; children: ReactNode }) {
  return (
    <div className="container page account-page admin-page" lang="en">
      <p className="note">Admin</p>
      <h1>{title}</h1>
      <div className="account-layout">
        <nav className="account-nav" aria-label="Admin">
          <ul>
            {sections().map((s) => (
              <li key={s.href}>
                <Link href={s.href} aria-current={current === s.href ? "page" : undefined}>
                  {s.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="account-content">{children}</div>
      </div>
    </div>
  );
}
