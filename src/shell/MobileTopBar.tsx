import { Link } from "react-router-dom";
import { icons } from "./nav";
import { ThemeToggle } from "./ThemeToggle";

export function MobileTopBar() {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-surface px-4 py-3 lg:hidden">
      <Link to="/home" className="flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-sm font-bold text-on-primary">
          J
        </span>
        <span className="text-sm font-semibold">Jumsup</span>
      </Link>
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <Link
          to="/account"
          aria-label="บัญชี"
          className="grid h-9 w-9 place-items-center rounded-lg border border-line text-muted"
        >
          {icons.account}
        </Link>
      </div>
    </header>
  );
}
