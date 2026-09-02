const KEY = "jumsup.entered";

export function hasEntered(): boolean {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function markEntered(): void {
  try {
    localStorage.setItem(KEY, "1");
  } catch {
    /* private mode — landing will just show again next visit */
  }
}
