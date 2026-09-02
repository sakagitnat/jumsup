import { supabase, backendEnabled } from "../lib/supabase.js";
import { saveExamTargets } from "../lib/cloud.js";
import { store } from "../store/store";
import { getCurrentUser } from "../app/cloudSync";
import { toast } from "../ui/toast";

export interface OnboardingInput {
  minutes: number;
  skills: string[];
  examTargets: Array<{ name: string; date: string | null }>;
}

/** Returns true when the plan was saved and the caller should navigate home. */
export async function saveOnboarding(input: OnboardingInput): Promise<boolean> {
  const user = getCurrentUser();
  if (!user || !backendEnabled) {
    toast("กรุณาเข้าสู่ระบบก่อนสร้างแผน");
    return false;
  }
  const pastDate = input.examTargets.find(
    (t) => t.date && t.date < new Date().toLocaleDateString("en-CA"),
  );
  if (pastDate) {
    toast(`วันสอบของ "${pastDate.name}" เป็นวันที่ผ่านมาแล้ว`);
    return false;
  }
  try {
    // exam_goal / exam_date on the profile are unused now — dates live in
    // exam_targets. Pass RPC-valid constants so minutes + skills still persist.
    const { data, error } = await supabase.rpc("save_learning_profile", {
      p_exam_goal: "general",
      p_exam_date: null,
      p_daily_minutes: input.minutes,
      p_weak_skills: input.skills,
    });
    if (error) throw error;
    const examTargets = await saveExamTargets(user, input.examTargets);
    store.set({
      profile: { ...store.get().profile, ...data },
      examTargets,
    });
    return true;
  } catch (e) {
    const raw = (e as Error).message || "";
    const messages: Record<string, string> = {
      INVALID_EXAM_DATE: "วันสอบต้องเป็นวันนี้หรือหลังจากนี้",
      INVALID_DAILY_MINUTES: "เวลาต่อวันต้องเป็น 5, 10 หรือ 20 นาที",
      UNAUTHORIZED: "กรุณาเข้าสู่ระบบใหม่",
    };
    toast(messages[raw] || raw || "บันทึกแผนไม่สำเร็จ");
    return false;
  }
}
