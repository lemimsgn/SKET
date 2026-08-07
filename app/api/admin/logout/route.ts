import { NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { getCookieValue } from "../../../../lib/adminAuth";

export async function POST(request: Request) {
  // Revoke refresh tokens for the user represented by the admin session cookie, then clear cookie.
  const cookie = request.headers.get("cookie");
  const token = cookie ? getCookieValue(cookie, "sket-admin-session") : null;

  if (token) {
    try {
      const auth = getAuth();
      const decoded = await auth.verifyIdToken(token);
      if (decoded?.uid) await auth.revokeRefreshTokens(decoded.uid);
    } catch (e) {
      console.warn("Failed to revoke admin refresh tokens:", e);
    }
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set("sket-admin-session", "", {
    path: "/api/admin",
    maxAge: 0,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });
  return response;
}
