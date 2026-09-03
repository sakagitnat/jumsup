import { useEffect, useState } from "react";
import { RouterProvider, createBrowserRouter, Navigate } from "react-router-dom";
import { getSupabase } from "./supabase";
import { ToastHost } from "./ui";
import { Layout } from "./pages/Layout";
import { Overview } from "./pages/Overview";
import { Dictionary } from "./pages/Dictionary";
import { Reports } from "./pages/Reports";
import { Reviews } from "./pages/Reviews";
import { GiftCodes } from "./pages/GiftCodes";
import { Refunds } from "./pages/Refunds";
import { Bots } from "./pages/Bots";
import { Users } from "./pages/Users";
import { Content } from "./pages/Content";

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: "/", element: <Overview /> },
      { path: "/dictionary", element: <Dictionary /> },
      { path: "/reports", element: <Reports /> },
      { path: "/reviews", element: <Reviews /> },
      { path: "/content", element: <Content /> },
      { path: "/gift-codes", element: <GiftCodes /> },
      { path: "/refunds", element: <Refunds /> },
      { path: "/bots", element: <Bots /> },
      { path: "/users", element: <Users /> },
      { path: "*", element: <Navigate to="/" replace /> },
    ],
  },
]);

type Phase =
  | { kind: "loading" }
  | { kind: "login"; message: string }
  | { kind: "ready" };

export function App() {
  const [phase, setPhase] = useState<Phase>({ kind: "loading" });

  async function boot() {
    setPhase({ kind: "loading" });
    try {
      const sb = await getSupabase();
      const { data } = await sb.auth.getSession();
      if (!data.session) {
        setPhase({ kind: "login", message: "เข้าสู่ระบบด้วยบัญชีผู้ดูแลเท่านั้น" });
        return;
      }
      const { data: profile } = await sb
        .from("profiles")
        .select("role")
        .eq("user_id", data.session.user.id)
        .single();
      if (profile?.role !== "admin") {
        await sb.auth.signOut();
        setPhase({ kind: "login", message: "บัญชีนี้ไม่มีสิทธิ์ผู้ดูแล" });
        return;
      }
      setPhase({ kind: "ready" });
    } catch (e) {
      const msg =
        (e as Error).message === "ADMIN_NOT_CONFIGURED"
          ? "เว็บแอดมินยังตั้งค่าไม่ครบ"
          : (e as Error).message || "โหลดไม่สำเร็จ";
      setPhase({ kind: "login", message: msg });
    }
  }

  useEffect(() => {
    void boot();
    let unsub = () => {};
    getSupabase().then((sb) => {
      const { data } = sb.auth.onAuthStateChange((event) => {
        if (event === "SIGNED_IN") void boot();
        if (event === "SIGNED_OUT")
          setPhase({ kind: "login", message: "ออกจากระบบแล้ว" });
      });
      unsub = () => data.subscription.unsubscribe();
    });
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (phase.kind === "loading") {
    return (
      <div className="grid min-h-screen place-content-center text-sm text-[var(--muted)]">
        กำลังตรวจสิทธิ์ผู้ดูแล…
      </div>
    );
  }

  if (phase.kind === "login") {
    return (
      <div className="grid min-h-screen place-items-center p-6">
        <div className="w-[min(400px,100%)] rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-10 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-[var(--primary-soft)] text-xl font-extrabold text-[var(--primary)]">
            J
          </div>
          <h1 className="mt-4 text-xl font-bold">Jumsup Admin</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">{phase.message}</p>
          <button
            type="button"
            className="mt-5 w-full rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-white"
            onClick={async () => {
              const sb = await getSupabase();
              await sb.auth.signInWithOAuth({
                provider: "google",
                options: { redirectTo: location.origin },
              });
            }}
          >
            เข้าสู่ระบบด้วย Google
          </button>
          <a
            href="https://jumsup.sakagitnat.workers.dev/"
            className="mt-3 inline-block text-sm text-[var(--muted)] hover:underline"
          >
            กลับเว็บหลัก
          </a>
        </div>
      </div>
    );
  }

  return (
    <ToastHost>
      <RouterProvider router={router} />
    </ToastHost>
  );
}
