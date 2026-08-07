import { NextResponse } from "next/server";
import { db, firebaseAdminInitError as rawFirebaseAdminInitError } from "../../../../lib/firebaseAdmin";
import { requireAdminAuth } from "../../../../lib/adminAuth";
import { isValidPhoneId } from "../../../../lib/phoneValidation";

const firebaseAdminInitError = rawFirebaseAdminInitError as Error | null;

export async function GET(request: Request) {
  // Never expose debug endpoints in production
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  if (firebaseAdminInitError || !db) {
    return NextResponse.json({ error: firebaseAdminInitError?.message || "Firebase Admin is not initialized." }, { status: 500 });
  }

  if (!db) {
    return NextResponse.json({ error: "Firebase Admin is not initialized." }, { status: 500 });
  }

  const adminCheck = await requireAdminAuth(request as any);
  if (adminCheck) return adminCheck as NextResponse;

  try {
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get("phone");

    if (!phone) {
      return NextResponse.json({ error: "phone is required." }, { status: 400 });
    }

    if (!isValidPhoneId(phone)) {
      return NextResponse.json({ error: "Phone number must start with 09 or 07 and be exactly 10 digits." }, { status: 400 });
    }

    const userRef = db.collection("users").doc(phone);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const userData = userSnap.data() || {};

    return NextResponse.json({
      phone,
      userData,
      keys: Object.keys(userData),
      referralNumber: userData.referralNumber,
      referralCode: userData.referralCode,
      referredBy: userData.referredBy,
    });
  } catch (error: any) {
    console.error("users/debug error:", error);
    return NextResponse.json({ error: "Something went wrong, please try again." }, { status: 500 });
  }
}
