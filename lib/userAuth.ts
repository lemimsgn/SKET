import { NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import crypto from "crypto";

const SESSION_COOKIE_NAME = "sket-session";
const SESSION_SECRET = process.env.SESSION_SECRET || "";

function base64Url(input: string) {
  return Buffer.from(input, "utf8").toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function signPayload(payload: any) {
  if (!SESSION_SECRET) {
    const error = new Error("SESSION_SECRET is not set");
    console.error(error);
    throw error;
  }
  const json = JSON.stringify(payload);
  const b = base64Url(json);
  const sig = crypto.createHmac("sha256", SESSION_SECRET).update(b).digest("hex");
  return `${b}.${sig}`;
}

function verifySessionToken(token: string) {
  if (!SESSION_SECRET) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [b, sig] = parts;
  const expected = crypto.createHmac("sha256", SESSION_SECRET).update(b).digest("hex");
  if (!crypto.timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(sig, "hex"))) return null;
  try {
    const json = Buffer.from(b, "base64").toString("utf8");
    const payload = JSON.parse(json);
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch (e) {
    return null;
  }
}

export function createSessionTokenForPhone(phone: string, maxAgeSeconds = 60 * 60 * 24) {
  const now = Date.now();
  const payload = { phone, iat: now, exp: now + maxAgeSeconds * 1000 };
  return signPayload(payload);
}

export async function requireUserAuth(request: Request): Promise<{ ok: true; uid?: string; phone?: string } | { ok: false; response: NextResponse }> {
  // First try Authorization: Bearer <Firebase ID token>
  const authHeader = request.headers.get("authorization") || request.headers.get("Authorization");
    if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
    const idToken = authHeader.slice(7).trim();
    if (!idToken) return { ok: false, response: NextResponse.json({ error: "Unauthorized." }, { status: 401 }) };
    try {
      const auth = getAuth();
      const decoded = await auth.verifyIdToken(idToken);
        return { ok: true, uid: decoded.uid, phone: (decoded as any).phone || (decoded as any).phone_number || undefined };
    } catch (err) {
      console.warn("Failed to verify Firebase ID token:", err);
        return { ok: false, response: NextResponse.json({ error: "Unauthorized." }, { status: 401 }) };
    }
  }

  // Fallback: check server-signed session cookie `sket-session`
  const cookie = request.headers.get("cookie");
  const match = cookie ? cookie.match(new RegExp(`(?:^|; )${SESSION_COOKIE_NAME}=([^;]*)`)) : null;
  const token = match ? decodeURIComponent(match[1]) : null;
  if (!token) return { ok: false, response: NextResponse.json({ error: "Unauthorized." }, { status: 401 }) };
  const payload = verifySessionToken(token);
  if (!payload) return { ok: false, response: NextResponse.json({ error: "Unauthorized." }, { status: 401 }) };
  return { ok: true, phone: payload.phone };
}
