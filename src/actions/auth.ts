import { signInGoogle as _signIn, signOut as _signOut } from "../lib/auth.js";
import { toast } from "../ui/toast";

export async function loginGoogle() {
  try {
    await _signIn();
  } catch (e) {
    toast((e as Error).message || "เข้าสู่ระบบไม่สำเร็จ");
  }
}

export async function logout() {
  try {
    await _signOut();
  } catch (e) {
    toast((e as Error).message || "ออกจากระบบไม่สำเร็จ");
  }
}
