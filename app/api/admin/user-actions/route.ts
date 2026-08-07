import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { requireAdminAuth } from "../../../../lib/adminAuth";
import { db, firebaseAdminInitError as rawFirebaseAdminInitError, setAdminCustomClaims, clearAdminCustomClaims } from "../../../../lib/firebaseAdmin";
import { appendNotification } from "../../../../lib/notifications";

const firebaseAdminInitError = rawFirebaseAdminInitError as Error | null;

async function removeUserData(userId: string) {
  if (!db) throw new Error("Firebase Admin is not initialized.");
  const userRef = db.collection("users").doc(userId);
  await db.runTransaction(async (transaction: any) => {
    const userSnapshot = await transaction.get(userRef);
    if (!userSnapshot.exists) {
      throw new Error("User not found.");
    }
    transaction.delete(userRef);
  });
}

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
    const userId = String(body.id || "").trim();
    const action = String(body.action || "").trim();
    const newPassword = String(body.newPassword || "").trim();

    if (!userId || !action) {
      return NextResponse.json({ error: "User ID and action are required." }, { status: 400 });
    }

    const userRef = db.collection("users").doc(userId);
    const userSnapshot = await userRef.get();
    if (!userSnapshot.exists) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    switch (action) {
      case "lock": {
        await db.runTransaction(async (transaction: any) => {
          await appendNotification(userRef, {
            type: "account",
            message: "Your account has been locked by an administrator. Transfers and withdrawals are disabled.",
            createdAt: new Date(),
            read: false,
          }, 100, transaction);
          transaction.update(userRef, {
            status: "locked",
            updatedAt: new Date(),
          });
        });
        return NextResponse.json({ success: true, message: "User account locked." });
      }
      case "unlock": {
        await db.runTransaction(async (transaction: any) => {
          await appendNotification(userRef, {
            type: "account",
            message: "Your account has been unlocked by an administrator. Transfers and withdrawals are available again.",
            createdAt: new Date(),
            read: false,
          }, 100, transaction);
          transaction.update(userRef, {
            status: "approved",
            updatedAt: new Date(),
          });
        });
        return NextResponse.json({ success: true, message: "User account unlocked." });
      }
      case "changePassword":
        if (!newPassword) {
          return NextResponse.json({ error: "New password is required." }, { status: 400 });
        }
        await userRef.update({ password: await bcrypt.hash(newPassword, 10), updatedAt: new Date() });
        return NextResponse.json({ success: true, message: "Password updated." });
      case "delete":
        await removeUserData(userId);
        return NextResponse.json({ success: true, message: "User deleted." });
      case "ban":
        await db.collection("bannedUsers").doc(userId).set({ phone: userSnapshot.data()?.phone || userId, bannedAt: new Date() });
        await removeUserData(userId);
        return NextResponse.json({ success: true, message: "User banned and removed." });
      case "promoteAdmin": {
        await setAdminCustomClaims(userId);
        await userRef.update({ role: "admin", updatedAt: new Date() });
        return NextResponse.json({ success: true, message: "User promoted to admin." });
      }
      case "demoteAdmin": {
        await clearAdminCustomClaims(userId);
        await userRef.update({ role: "user", updatedAt: new Date() });
        return NextResponse.json({ success: true, message: "User demoted from admin." });
      }
      default:
        return NextResponse.json({ error: "Unknown admin action." }, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to process admin action." }, { status: 500 });
  }
}
