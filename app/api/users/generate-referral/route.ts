import { NextResponse } from "next/server";
import { db, firebaseAdminInitError as rawFirebaseAdminInitError } from "../../../../lib/firebaseAdmin";
import { isValidPhoneId } from "../../../../lib/phoneValidation";
import { appendNotification } from "../../../../lib/notifications";

const firebaseAdminInitError = rawFirebaseAdminInitError as Error | null;

export async function POST(request: Request) {
  if (firebaseAdminInitError || !db) {
    return NextResponse.json({ error: firebaseAdminInitError?.message || "Firebase Admin is not initialized." }, { status: 500 });
  }

  if (!db) {
    return NextResponse.json({ error: "Firebase Admin is not initialized." }, { status: 500 });
  }

  try {
    const body = await request.json();
    const phone = String(body.phone || "").trim();

    if (!phone) {
      return NextResponse.json({ error: "Phone is required." }, { status: 400 });
    }

    if (!isValidPhoneId(phone)) {
      return NextResponse.json({ error: "Phone number must start with 09 or 07 and be exactly 10 digits." }, { status: 400 });
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

    // If user already has referralNumber, return it
    if (userData.referralNumber) {
      return NextResponse.json({ referralNumber: userData.referralNumber });
    }

    // Generate unique referral code (2 letters + 4 digits)
    const generateReferralCode = () => {
      const letters = Array.from({ length: 2 }, () => String.fromCharCode(65 + Math.floor(Math.random() * 26))).join("");
      const digits = String(Math.floor(1000 + Math.random() * 9000));
      return `${letters}${digits}`;
    };

    let newReferralCode = generateReferralCode();
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const existing = await db.collection("users").where("referralCode", "==", newReferralCode).limit(1).get();
      if (existing.empty) break;
      newReferralCode = generateReferralCode();
    }

    // Update user with new referralCode
    await userRef.update({
      referralCode: newReferralCode,
    });

    // notify user about new referral code (capped)
    try {
      await appendNotification(userRef, {
        type: "referral",
        message: `A referral code ${newReferralCode} was generated for your account.`,
        createdAt: new Date(),
        read: false,
      }, 100);
    } catch (e) {
      // non-fatal
      console.warn("Failed to append referral notification:", e);
    }

    return NextResponse.json({ referralNumber: newReferralCode, isNewlyGenerated: true });
  } catch (error: any) {
    console.error("users/generate-referral error:", error);
    return NextResponse.json({ error: "Something went wrong, please try again." }, { status: 500 });
  }
}
