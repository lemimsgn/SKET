import { NextResponse } from "next/server";
import { db, firebaseAdminInitError as rawFirebaseAdminInitError, getUserDocumentByPhone } from "../../../../lib/firebaseAdmin";
import { assertValidPhoneId } from "../../../../lib/phoneValidation";

const firebaseAdminInitError = rawFirebaseAdminInitError as Error | null;

export async function GET(request: Request) {
  if (firebaseAdminInitError || !db) {
    return NextResponse.json({ error: "Firestore admin is not initialized." }, { status: 500, headers: { "Cache-Control": "public, max-age=5" } });
  }

  try {
    const { searchParams } = new URL(request.url);
    const rawPhone = String(searchParams.get("phone") || "").trim();
    if (!rawPhone) return NextResponse.json({ error: "Phone is required." }, { status: 400 });

    let phone: string;
    try {
      phone = assertValidPhoneId(rawPhone);
    } catch (err: any) {
      return NextResponse.json({ error: err?.message || "Invalid phone number." }, { status: 400 });
    }

    const userResult = await getUserDocumentByPhone(phone);
    if (!userResult) return NextResponse.json({ error: "User not found." }, { status: 404 });

    const data = userResult.snap.data() || {};
    const questions = Array.isArray(data.securityQuestions) ? data.securityQuestions.map((q: any) => ({ question: String(q.question || "") })) : [];

    return NextResponse.json({ user: { phone: data.phone || userResult.snap.id, firstName: data.firstName || "", lastName: data.lastName || "", securityQuestions: questions } }, { headers: { "Cache-Control": "public, max-age=30" } });
  } catch (error: any) {
    console.error("public user lookup error:", error);
    return NextResponse.json({ error: "Could not lookup user." }, { status: 500, headers: { "Cache-Control": "public, max-age=5" } });
  }
}
