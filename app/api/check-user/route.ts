import { NextRequest, NextResponse } from "next/server";
import { db, firebaseAdminInitError } from "../../../lib/firebaseAdmin";
import { requireUserAuth } from "../../../lib/userAuth";
import { isValidPhoneId } from "../../../lib/phoneValidation";

export async function GET(request: NextRequest) {
  if (firebaseAdminInitError || !db) {
    return NextResponse.json({ error: "Firebase not initialized" }, { status: 500 });
  }

  const phone = request.nextUrl.searchParams.get("phone");
  if (!phone) {
    return NextResponse.json({ error: "Phone number required" }, { status: 400 });
  }
  if (!isValidPhoneId(phone)) {
    return NextResponse.json({ error: "Phone number must start with 09 or 07 and be exactly 10 digits." }, { status: 400 });
  }

  // derive caller identity from verified auth; allow limited public check otherwise
  const auth = await requireUserAuth(request);
  const callerPhone = auth.ok ? (auth.phone || auth.uid) : null;

  try {
    const userQuery = db.collection("users").where("phone", "==", phone).limit(1);
    const snapshot = await userQuery.get();

    if (snapshot.empty) return NextResponse.json({ exists: false }, { status: 200 });

    const userDoc = snapshot.docs[0];
    const userData = userDoc.data();

    // If the caller is the same user, return full profile; otherwise only return existence.
    if (callerPhone && callerPhone === String(phone)) {
      return NextResponse.json(
        {
          exists: true,
          user: {
            id: userDoc.id,
            phone: userData.phone,
            firstName: userData.firstName || "",
            lastName: userData.lastName || "",
            fullName: `${userData.firstName || ""} ${userData.lastName || ""}`.trim(),
            walletBalance: userData.walletBalance || 0,
            status: userData.status || (userData.approved ? "approved" : "pending"),
          },
        },
        { status: 200 }
      );
    }

    return NextResponse.json({ exists: true }, { status: 200 });
  } catch (error) {
    console.error("Error checking user:", error);
    return NextResponse.json(
      { error: "Failed to check user", details: String(error) },
      { status: 500 }
    );
  }
}
