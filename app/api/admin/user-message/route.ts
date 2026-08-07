import { NextResponse } from "next/server";
import { requireAdminAuth } from "../../../../lib/adminAuth";
import { db, firebaseAdminInitError as rawFirebaseAdminInitError } from "../../../../lib/firebaseAdmin";
import { appendNotification } from "../../../../lib/notifications";

const firebaseAdminInitError = rawFirebaseAdminInitError as Error | null;

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
    const userId = String(body.userId || "").trim();
    const message = String(body.message || "").trim();

    if (!userId || !message) {
      return NextResponse.json({ error: "User ID and message are required." }, { status: 400 });
    }

    const userRef = db.collection("users").doc(userId);
    const userSnapshot = await userRef.get();
    if (!userSnapshot.exists) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const notif = {
      type: "message",
      message,
      createdAt: new Date(),
      read: false,
    };
    await appendNotification(userRef, notif, 100);

    return NextResponse.json({ success: true, message: "Notification sent." });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to send message." }, { status: 500 });
  }
}
