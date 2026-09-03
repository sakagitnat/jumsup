import { NavLink, Outlet } from "react-router-dom";
import { getSupabase } from "../supabase";
import { cx } from "../ui";

const nav: Array<[string, string]> = [
  ["/", "ภาพรวม"],
  ["/users", "ผู้ใช้"],
  ["/reviews", "รีวิว"],
  ["/content", "เนื้อหาสาธารณะ"],
  ["/reports", "รายงานเนื้อหา"],
  ["/dictionary", "คำแปลชุมชน"],
  ["/gift-codes", "Gift Code"],
  ["/refunds", "คืนเงิน"],
  ["/bots", "บอทลีดเดอร์บอร์ด"],
  ["/seasons", "ฤดูกาลลีดเดอร์บอร์ด"],
  ["/xp-integrity", "ตรวจ XP"],
];

export function Layout() {
  return (
    <div className="min-h-screen md:flex">
      <aside className="border-b border-[var(--line)] bg-[var(--surface)] p-4 md:w-56 md:shrink-0 md:border-b-0 md:border-r">
        <div className="mb-4 flex items-center gap-2 px-2">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-[var(--primary-soft)] font-extrabold text-[var(--primary)]">
            J
          </span>
          <div>
            <b className="block text-sm">Jumsup</b>
            <small className="text-xs text-[var(--subtle)]">Admin Console</small>
          </div>
        </div>
        <nav className="flex flex-wrap gap-1 md:flex-col">
          {nav.map(([to, label]) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                cx(
                  "rounded-lg px-3 py-2 text-sm font-medium",
                  isActive
                    ? "bg-[var(--primary-soft)] text-[var(--primary)]"
                    : "text-[var(--muted)] hover:bg-[var(--surface-2)]",
                )
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
        <button
          type="button"
          className="mt-4 w-full rounded-lg border border-[var(--line)] px-3 py-2 text-sm text-[var(--muted)] hover:bg-[var(--surface-2)]"
          onClick={async () => {
            const sb = await getSupabase();
            await sb.auth.signOut();
          }}
        >
          ออกจากระบบ
        </button>
      </aside>

      <main className="min-w-0 flex-1 p-5 md:p-8">
        <Outlet />
      </main>
    </div>
  );
}
