import { Link } from "@/i18n/navigation";
import { AccountLink } from "./AccountLink";
import { CurrencySelect } from "./CurrencySelect";
import { HeaderLogo } from "./Logo";
import { HeaderActions, MainNav } from "./Navigation";

export function Header() {
  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link href="/" className="logo">
          <HeaderLogo />
        </Link>
        <MainNav />
        <div className="header-actions">
          <CurrencySelect />
          <HeaderActions />
          <AccountLink />
        </div>
      </div>
    </header>
  );
}
