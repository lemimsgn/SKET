export const PHONE_ID_REGEX = /^(09|07)\d{8}$/;

export function normalizePhoneId(phone: unknown): string {
  const normalized = String(phone || "").trim();
  return PHONE_ID_REGEX.test(normalized) ? normalized : "";
}

export function isValidPhoneId(phone: unknown): phone is string {
  return PHONE_ID_REGEX.test(String(phone || "").trim());
}

export function assertValidPhoneId(phone: unknown, field = "Phone number"): string {
  const normalized = String(phone || "").trim();
  if (!PHONE_ID_REGEX.test(normalized)) {
    throw new Error(`${field} must start with 09 or 07 and be exactly 10 digits.`);
  }
  return normalized;
}
