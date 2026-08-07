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
    const type = String(body.type || "").trim();
    const amount = Number(body.amount);
    const reason = String(body.reason || "").trim();

    if (!userId || !type || !amount || amount <= 0 || !reason) {
      return NextResponse.json({ error: "userId, type, amount, and reason are required." }, { status: 400 });
    }
    if (!["add", "deduct"].includes(type)) {
      return NextResponse.json({ error: "Invalid wallet action type." }, { status: 400 });
    }

    const userRef = db.collection("users").doc(userId);
    const userSnapshot = await userRef.get();
    if (!userSnapshot.exists) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const userData = userSnapshot.data() || {};
    const currentBalance = Number(userData.walletBalance || 0);
    const nextBalance = type === "add" ? currentBalance + amount : currentBalance - amount;
    if (type === "deduct" && nextBalance < 0) {
      return NextResponse.json({ error: "Insufficient wallet balance for deduction." }, { status: 400 });
    }

    const walletTransactionsRef = db.collection("walletTransactions").doc();

    await db.runTransaction(async (transaction: any) => {
      await appendNotification(userRef, {
        type: "wallet",
        message:
          type === "add"
            ? `Your wallet was credited with ${amount} ETB. Reason: ${reason}`
            : `Your wallet was deducted by ${amount} ETB. Reason: ${reason}`,
        createdAt: new Date(),
        read: false,
      }, 100, transaction);
      transaction.update(userRef, {
        walletBalance: nextBalance,
        updatedAt: new Date(),
      });
      transaction.set(walletTransactionsRef, {
        userId,
        type: type === "add" ? "Wallet Credit" : "Wallet Deduction",
        amount: type === "add" ? amount : -amount,
        reason,
        createdAt: new Date(),
      });
    });

    return NextResponse.json({ success: true, message: `Wallet ${type === "add" ? "credited" : "deducted"} successfully.` });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update wallet." }, { status: 500 });
  }
}
