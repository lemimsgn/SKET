export function validatePassword(password: string) {
  const p = String(password || "");
  const len = p.length;
  if (len < 8) return { ok: false, message: "Password must be at least 8 characters." };

  return { ok: true };
}
