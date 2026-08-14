import { NextResponse } from "next/server";
import { getCookieValue, requireAdminAuth } from "../../../../lib/adminAuth";
import { getAuth } from "firebase-admin/auth";

export async function GET(request: Request) {
  const authResponse = await requireAdminAuth(request);
  if (authResponse) {
    return authResponse;
  }

  return NextResponse.json({ authenticated: true });
}

export async function POST(request: Request) {
  // Explicitly allow session validation via POST for client-side compatibility.
  const authResponse = await requireAdminAuth(request);
  if (authResponse) {
    return authResponse;
  }

  return NextResponse.json({ authenticated: true });
}

export async function DELETE(request: Request) {
  // Try to revoke Firebase refresh tokens for this admin session cookie's user, then clear cookie.
  const cookie = request.headers.get("cookie");
  const token = cookie ? getCookieValue(cookie, "sket-admin-session") : null;

  if (token) {
    try {
      const auth = getAuth();
      const decoded = await auth.verifyIdToken(token);
      if (decoded?.uid) {
        await auth.revokeRefreshTokens(decoded.uid);
      }
    } catch (e) {
      console.warn("Failed to revoke admin refresh tokens:", e);
    }
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set("sket-admin-session", "", {
    path: "/",
    maxAge: 0,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });
  return response;
}
