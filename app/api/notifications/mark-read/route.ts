import { NextRequest, NextResponse } from "next/server";
import { db, firebaseAdminInitError, getUserDocumentByPhone } from "../../../../lib/firebaseAdmin";
import { requireUserAuth } from "../../../../lib/userAuth";

export async function POST(request: NextRequest) {
  if (firebaseAdminInitError || !db) {
    return NextResponse.json({ error: "Firebase not initialized" }, { status: 500 });
  }

  try {
    const auth = await requireUserAuth(request as any);
    if (!auth.ok) return auth.response;

    const identity = auth.phone || auth.uid;
    if (!identity) {
      return NextResponse.json({ error: "Unable to resolve authenticated user." }, { status: 401 });
    }

    const userResult = await getUserDocumentByPhone(identity);
    if (!userResult) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userData = userResult.snap.data() || {};
    const notifications = Array.isArray(userData.notifications) ? userData.notifications : [];
    const updatedNotifications = notifications.map((notification: any) => ({
      ...notification,
      read: true,
    }));

    await userResult.ref.update({
      notifications: updatedNotifications,
      updatedAt: new Date(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to mark notifications read:", error);
    return NextResponse.json({ error: "Failed to mark notifications read", details: String(error) }, { status: 500 });
  }
}
