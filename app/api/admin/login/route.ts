import { NextResponse } from "next/server";
import { auth, firebaseAdminInitError as rawFirebaseAdminInitError } from "../../../../lib/firebaseAdmin";
import { verifyFirebaseAdminToken } from "../../../../lib/adminAuth";
import { checkLimit, getRequestIp, recordFailure, recordSuccess } from "../../../../lib/rateLimit";

const firebaseAdminInitError = rawFirebaseAdminInitError as Error | null;

export async function POST(request: Request) {
  if (firebaseAdminInitError) {
    return NextResponse.json({ error: "Firebase Admin is not initialized." }, { status: 500 });
  }

  if (!auth) {
    return NextResponse.json({ error: "Firebase Admin auth is not initialized." }, { status: 500 });
  }

  const body = await request.json();
  const idToken = String(body.idToken || "").trim();
  const ip = getRequestIp(request);

  try {
    const allowed = await checkLimit("admin:login", ip);
    if (!allowed.allowed) {
      return NextResponse.json({ error: "Too many attempts. Try later." }, { status: 429, headers: { "Retry-After": String(allowed.retryAfter) } });
    }

    if (!idToken) {
      return NextResponse.json({ error: "ID token is required." }, { status: 400 });
    }

    const verified = await verifyFirebaseAdminToken(idToken);
    if (!verified.ok) {
      await recordFailure("admin:login", ip);
      return NextResponse.json({ error: verified.message }, { status: verified.status });
    }

    const decodedToken = await auth.verifyIdToken(idToken);
    const response = NextResponse.json({
      success: true,
      admin: {
        uid: decodedToken.uid,
        email: decodedToken.email || undefined,
        name: decodedToken.name || decodedToken.email || "Admin",
      },
    });

    response.cookies.set("sket-admin-session", idToken, {
      path: "/api/admin",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60,
    });

    await recordSuccess("admin:login", ip);
    return response;
  } catch (error: any) {
    console.error("Admin login error:", error);
    await recordFailure("admin:login", ip);
    const errorMessage =
      process.env.NODE_ENV === "development"
        ? error?.message || "Failed to verify admin credentials."
        : "Failed to verify admin credentials.";
    return NextResponse.json({ error: errorMessage }, { status: 401 });
  }
}
