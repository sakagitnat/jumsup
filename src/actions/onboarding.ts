import { supabase, backendEnabled } from "../lib/supabase.js";
import { store } from "../store/store";
import { getCurrentUser } from "../app/cloudSync";
import { toast } from "../ui/toast";

export interface OnboardingInput {
  goal: string;
  minutes: number;
  skills: string[];
  examDate: string | null;
}

/** Returns true when the plan was saved and the caller should navigate home. */
export async function saveOnboarding(input: OnboardingInput): Promise<boolean> {
  if (!getCurrentUser() || !backendEnabled) {
    toast("กรุณาเข้าสู่ระบบก่อนสร้างแผน");
    return false;
  }
  try {
    const { data, error } = await supabase.rpc("save_learning_profile", {
      p_exam_goal: input.goal,
      p_exam_date: input.examDate,
      p_daily_minutes: input.minutes,
      p_weak_skills: input.skills,
    });
    if (error) throw error;
    store.set({ profile: { ...store.get().profile, ...data } });
    return true;
  } catch (e) {
    const raw = (e as Error).message || "";
    const messages: Record<string, string> = {
      INVALID_EXAM_DATE: "วันที่สอบต้องเป็นวันนี้หรือหลังจากนี้",
      INVALID_EXAM_GOAL: "เป้าหมายการสอบไม่ถูกต้อง",
      INVALID_DAILY_MINUTES: "เวลาต่อวันต้องเป็น 5, 10 หรือ 20 นาที",
      UNAUTHORIZED: "กรุณาเข้าสู่ระบบใหม่",
    };
    toast(messages[raw] || raw || "บันทึกแผนไม่สำเร็จ");
    return false;
  }
}
