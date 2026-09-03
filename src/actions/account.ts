import { api } from "../lib/api.js";
import { supabase, backendEnabled } from "../lib/supabase.js";
import { uploadAvatar } from "../lib/cloud.js";
import { store } from "../store/store";
import { getCurrentUser, hydrateFromCloud } from "../app/cloudSync";
import { toast } from "../ui/toast";

export async function checkUsername(name: string): Promise<boolean> {
  if (!backendEnabled) return false;
  const { data } = await supabase.rpc("username_available", { p_name: name });
  return Boolean(data);
}

export async function changeUsername(name: string): Promise<{ ok: boolean; error?: string }> {
  const user = getCurrentUser();
  if (!user || !backendEnabled) return { ok: false, error: "กรุณาเข้าสู่ระบบก่อน" };
  try {
    const { data, error } = await supabase.rpc("set_username", { p_name: name });
    if (error) throw error;
    store.set({ profile: { ...store.get().profile, username: data } });
    return { ok: true };
  } catch (e) {
    const raw = (e as Error).message || "";
    const map: Record<string, string> = {
      USERNAME_TAKEN: "ชื่อนี้ถูกใช้แล้ว",
      USERNAME_INVALID: "ใช้ a–z, 0–9, _ หรือ . ยาว 3–20 ตัว",
      UNAUTHORIZED: "กรุณาเข้าสู่ระบบใหม่",
    };
    return { ok: false, error: map[raw] || raw || "เปลี่ยนชื่อไม่สำเร็จ" };
  }
}

export async function setLeaderboardAnon(value: boolean) {
  const user = getCurrentUser();
  const prev = store.get().profile;
  store.set({ profile: { ...prev, leaderboard_anon: value } });
  if (!user || !backendEnabled) return;
  const { error } = await supabase
    .from("profiles")
    .update({ leaderboard_anon: value })
    .eq("user_id", user.id);
  if (error) {
    store.set({ profile: { ...store.get().profile, leaderboard_anon: !value } });
    toast(error.message || "บันทึกไม่สำเร็จ");
  }
}

export async function redeemGift(code: string) {
  const user = getCurrentUser();
  try {
    await api("/api/gift/redeem", { method: "POST", body: JSON.stringify({ code }) });
    if (user) await hydrateFromCloud(user);
    toast("แลก Gift Code สำเร็จ");
  } catch (e) {
    toast((e as Error).message || "แลกโค้ดไม่สำเร็จ");
  }
}

export async function claimReferral(code: string) {
  const user = getCurrentUser();
  try {
    await api("/api/referral/claim", { method: "POST", body: JSON.stringify({ code }) });
    if (user) await hydrateFromCloud(user);
    toast("ใช้ Referral สำเร็จ");
  } catch (e) {
    toast((e as Error).message || "ใช้โค้ดไม่สำเร็จ");
  }
}

export async function exportAccountData() {
  try {
    const data = await api("/api/account/export");
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "jumsup-data.json";
    a.click();
    URL.revokeObjectURL(url);
  } catch (e) {
    toast((e as Error).message || "ดาวน์โหลดข้อมูลไม่สำเร็จ");
  }
}

export async function requestAccountDelete() {
  try {
    const d = await api<{ execute_after: string }>("/api/account/request-delete", {
      method: "POST",
      body: "{}",
    });
    toast(
      `ส่งคำขอลบบัญชีแล้ว กำหนดดำเนินการหลัง ${new Date(d.execute_after).toLocaleDateString()}`,
    );
  } catch (e) {
    toast((e as Error).message || "ส่งคำขอไม่สำเร็จ");
  }
}

export async function submitRefundRequest(reason: string, cancelSubscription: boolean) {
  const user = getCurrentUser();
  try {
    await api("/api/refund/request", {
      method: "POST",
      body: JSON.stringify({ reason, cancel_subscription: cancelSubscription }),
    });
    if (user) await hydrateFromCloud(user);
    toast("ส่งคำขอคืนเงินแล้ว ผู้ดูแลจะตรวจสอบก่อนดำเนินการ");
  } catch (e) {
    toast((e as Error).message || "ส่งคำขอคืนเงินไม่สำเร็จ");
  }
}

export async function changeAvatar(file: File) {
  const user = getCurrentUser();
  if (!file || !user || !backendEnabled) return;
  try {
    const url = await uploadAvatar(user, file);
    store.set({ profile: { ...store.get().profile, avatar_url: url } });
  } catch (e) {
    toast((e as Error).message || "อัปโหลดรูปไม่สำเร็จ");
  }
}
