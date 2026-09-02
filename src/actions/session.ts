import { supabase, backendEnabled } from "../lib/supabase.js";
import { todayKey } from "../lib/utils.js";
import { store } from "../store/store";
import { getCurrentUser } from "../app/cloudSync";
import { toast } from "../ui/toast";

export async function dailyCheckin() {
  const s = store.get();
  if (s.lastCheckin === todayKey()) return;
  try {
    if (getCurrentUser() && backendEnabled) {
      const { data, error } = await supabase.rpc("do_daily_checkin");
      if (error) throw error;
      store.set({ lastCheckin: todayKey(), streak: data.streak, xp: data.xp });
    } else {
      store.set({ lastCheckin: todayKey(), streak: s.streak + 1, xp: s.xp + 20 });
    }
  } catch (e) {
    toast((e as Error).message || "เช็คอินไม่สำเร็จ");
  }
}
