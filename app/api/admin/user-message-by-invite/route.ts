import { NextResponse } from "next/server";
import { requireAdminAuth } from "../../../../lib/adminAuth";
import { db, firebaseAdminInitError as rawFirebaseAdminInitError } from "../../../../lib/firebaseAdmin";
import { appendNotification } from "../../../../lib/notifications";

const firebaseAdminInitError = rawFirebaseAdminInitError as Error | null;
const BULK_USER_LIMIT = 20;

export async function POST(request: Request) {
  const authResponse = await requireAdminAuth(request);
  if (authResponse) {
    return authResponse;
  }
  if (firebaseAdminInitError || !db) {
    return NextResponse.json({ error: firebaseAdminInitError?.message || "Firebase Admin is not initialized." }, { status: 500 });
  }

  try {
    const body = await request.json();
    const inviteCount = Number(body.inviteCount);
    const message = String(body.message || "").trim();

    if (Number.isNaN(inviteCount) || inviteCount < 0) {
      return NextResponse.json({ error: "Invalid invite count." }, { status: 400 });
    }
    if (!message) {
      return NextResponse.json({ error: "Message is required." }, { status: 400 });
    }

    const usersSnapshot = await db.collection("users").where("successfulReferrals", "==", inviteCount).limit(BULK_USER_LIMIT + 1).get();
    if (usersSnapshot.size > BULK_USER_LIMIT) {
      return NextResponse.json(
        {
          error: `This operation affects more than ${BULK_USER_LIMIT} users. Narrow the filter or use a safer per-user notification approach.`,
        },
        { status: 400 }
      );
    }

    const notification = {
      type: "message",
      message,
      createdAt: new Date(),
      read: false,
    };

    const updatePromises = usersSnapshot.docs.map((userDoc: any) => appendNotification(userDoc.ref, notification, 100));
    await Promise.all(updatePromises);

    return NextResponse.json({ success: true, message: `Notification sent to ${usersSnapshot.size} users.` });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to send notifications." }, { status: 500 });
  }
}
