import { NextResponse } from "next/server";
import { requireAdminAuth } from "../../../../lib/adminAuth";
import { db, firebaseAdminInitError as rawFirebaseAdminInitError } from "../../../../lib/firebaseAdmin";

const firebaseAdminInitError = rawFirebaseAdminInitError as Error | null;

export async function GET(request: Request) {
  const authResponse = await requireAdminAuth(request);
  if (authResponse) {
    return authResponse;
  }
  if (firebaseAdminInitError || !db) {
    return NextResponse.json({ error: firebaseAdminInitError?.message || "Firebase Admin is not initialized." }, { status: 500 });
  }

  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get("id");
    if (!userId) {
      return NextResponse.json({ error: "User ID is required." }, { status: 400 });
    }

    const userRef = db.collection("users").doc(userId);
    const userSnapshot = await userRef.get();
    if (!userSnapshot.exists) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const data = userSnapshot.data() || {};
    return NextResponse.json({
      user: {
        id: userSnapshot.id,
        fullName: data.fullName || `${data.firstName || ""} ${data.lastName || ""}`.trim(),
        firstName: data.firstName || "",
        lastName: data.lastName || "",
        phone: data.phone || userSnapshot.id,
        status: data.status || "pending",
        walletBalance: data.walletBalance ?? 0,
        referralCode: data.referralCode || "",
        referralNumber: data.referralNumber || "",
        registrationFee: data.registrationFee ?? null,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to load user profile." }, { status: 500 });
  }
}
