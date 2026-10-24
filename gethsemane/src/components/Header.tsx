import { Link } from "@/i18n/navigation";
import { CurrencySelect } from "./CurrencySelect";
import { LogoLockup } from "./Logo";
import { HeaderActions, MainNav } from "./Navigation";

export function Header() {
  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link href="/" className="logo">
          <LogoLockup />
        </Link>
        <MainNav />
        <div className="header-actions">
          <CurrencySelect />
          <HeaderActions />
        </div>
      </div>
    </header>
  );
}
