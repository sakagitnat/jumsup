import { api } from "../lib/api.js";
import { store } from "../store/store";
import { toast } from "../ui/toast";

function currency(): "thb" | "usd" {
  return store.get().lang === "th" ? "thb" : "usd";
}

export async function startCheckout(plan: "monthly" | "yearly") {
  try {
    const { url } = await api<{ url: string }>("/api/stripe/create-checkout", {
      method: "POST",
      body: JSON.stringify({ plan, currency: currency() }),
    });
    window.location.href = url;
  } catch (e) {
    toast((e as Error).message || "เปิดหน้าชำระเงินไม่สำเร็จ");
  }
}

export async function openBillingPortal() {
  try {
    const { url } = await api<{ url: string }>("/api/stripe/create-portal", {
      method: "POST",
      body: "{}",
    });
    window.location.href = url;
  } catch (e) {
    toast((e as Error).message || "เปิดหน้าจัดการสมาชิกไม่สำเร็จ");
  }
}
