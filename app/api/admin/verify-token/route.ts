import { NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { firebaseAdminInitError } from "../../../../lib/firebaseAdmin";

export async function POST(request: Request) {
  try {
    if (firebaseAdminInitError) {
      return NextResponse.json({ error: "Firebase not initialized" }, { status: 500 });
    }

    const { idToken } = await request.json();
    if (!idToken) {
      return NextResponse.json({ error: "Missing ID token" }, { status: 400 });
    }

    const auth = getAuth();
    const decodedToken = await auth.verifyIdToken(idToken);

    // Check if this user is the admin
    const adminUid = "1O4AvTFu3YMKeJo8AI0GTEK2epI2";
    if (decodedToken.uid !== adminUid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Set custom claims if not already set
    await auth.setCustomUserClaims(decodedToken.uid, { role: "admin" });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("Admin token verification error:", error);
    return NextResponse.json({ error: error.message || "Unauthorized" }, { status: 401 });
  }
}
