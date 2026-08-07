import { NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { getUserDocumentById } from "./firebaseAdmin";

export function getCookieValue(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) {
    return null;
  }

  const match = cookieHeader.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export function getRequestAdminToken(request: Request): string | null {
  return getCookieValue(request.headers.get("cookie"), "sket-admin-session");
}

export async function requireAdminAuth(request: Request): Promise<NextResponse | null> {
  const token = getRequestAdminToken(request);
  if (!token) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const result = await verifyFirebaseAdminToken(token);
  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: result.status });
  }

  return null;
}

export async function verifyFirebaseAdminToken(token: string): Promise<{ ok: true; uid: string } | { ok: false; status: number; message: string }> {
  try {
    const auth = getAuth();
    const decodedToken = await auth.verifyIdToken(token as string);
    if (!decodedToken.admin && decodedToken.role !== "admin") {
      return { ok: false, status: 403, message: "Forbidden." };
    }

    if (!decodedToken.uid) {
      return { ok: false, status: 403, message: "Forbidden." };
    }

    const userRecord = await getUserDocumentById(decodedToken.uid);
    if (!userRecord) {
      return { ok: false, status: 403, message: "Forbidden." };
    }

    const userData = userRecord.snap.data() || {};
    if (userData.role !== "admin") {
      return { ok: false, status: 403, message: "Forbidden." };
    }

    return { ok: true, uid: decodedToken.uid };
  } catch (error) {
    console.error("Admin auth token verification failed:", error);
    return { ok: false, status: 401, message: "Unauthorized." };
  }
}
