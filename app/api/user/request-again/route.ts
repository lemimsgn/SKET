import { NextResponse } from "next/server";
import { db, firebaseAdminInitError as rawFirebaseAdminInitError, getUserDocumentByPhone } from "../../../../lib/firebaseAdmin";
import { isValidPhoneId } from "../../../../lib/phoneValidation";
import { appendNotification } from "../../../../lib/notifications";

const firebaseAdminInitError = rawFirebaseAdminInitError as Error | null;

export async function POST(request: Request) {
  if (firebaseAdminInitError || !db) {
    return NextResponse.json({ error: firebaseAdminInitError?.message || "Firebase Admin is not initialized." }, { status: 500 });
  }

  try {
    const body = await request.json();
    const phone = String(body.phone || "").trim();

    if (!phone) {
      return NextResponse.json({ error: "Phone number is required." }, { status: 400 });
    }
    if (!isValidPhoneId(phone)) {
      return NextResponse.json({ error: "Phone number must start with 09 or 07 and be exactly 10 digits." }, { status: 400 });
    }

    const userResult = await getUserDocumentByPhone(phone);
    if (!userResult) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const userRef = userResult.ref;
    const userData = userResult.snap.data() || {};
    const rejectionCount = Number(userData.rejectionCount || 0);
    const remainingAttempts = Math.max(0, 3 - rejectionCount);
    const warning = rejectionCount >= 2
      ? "This is your final chance. If your account is rejected again, it will be deleted automatically."
      : `You have ${remainingAttempts} attempt${remainingAttempts === 1 ? "" : "s"} left before your account may be deleted automatically.`;

    await db!.runTransaction(async (transaction: any) => {
      await appendNotification(userRef, {
        type: "registration",
        message: "Your registration request has been resent for admin review.",
        createdAt: new Date(),
        read: false,
      }, 100, transaction);
      transaction.update(userRef, {
        status: "pending",
        createdAt: new Date(),
        updatedAt: new Date(),
        rejectionReason: null,
        requestedAgainAt: new Date(),
      });
    });

    return NextResponse.json({
      success: true,
      remainingAttempts,
      warning,
      message: warning,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to resend registration request." }, { status: 500 });
  }
}
