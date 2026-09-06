import { useState } from "react";
import { Outlet, ScrollRestoration } from "react-router-dom";
import { useStore } from "../store/useStore";
import { Sidebar } from "./Sidebar";
import { MobileTopBar } from "./MobileTopBar";
import { MobileDrawer } from "./MobileDrawer";
import { BottomNav } from "./BottomNav";

export function AppLayout() {
  const syncing = useStore((s) => s.syncing);
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-bg">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileTopBar onMenuClick={() => setDrawerOpen(true)} />
        <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
        {syncing && (
          <div className="sticky top-0 z-20 bg-primary-soft px-4 py-1.5 text-center text-xs font-semibold text-primary">
            กำลังซิงก์…
          </div>
        )}
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-24 pt-6 sm:px-6 lg:pb-10">
          <Outlet />
        </main>
        <BottomNav />
      </div>
      <ScrollRestoration />
    </div>
  );
}
