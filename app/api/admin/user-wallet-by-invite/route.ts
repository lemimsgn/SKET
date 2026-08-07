import { NextResponse } from "next/server";
import { requireAdminAuth } from "../../../../lib/adminAuth";
import { db, firebaseAdminInitError as rawFirebaseAdminInitError } from "../../../../lib/firebaseAdmin";
import { appendNotification } from "../../../../lib/notifications";

const firebaseAdminInitError = rawFirebaseAdminInitError as Error | null;
const MAX_WALLET_AMOUNT = 5000;
const BULK_USER_LIMIT = 10;

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
    const type = String(body.type || "").trim();
    const amount = Number(body.amount);
    const reason = String(body.reason || "").trim();

    if (!Number.isInteger(inviteCount) || Number.isNaN(inviteCount) || inviteCount < 0) {
      return NextResponse.json({ error: "Invalid invite count." }, { status: 400 });
    }
    if (!["add", "deduct"].includes(type)) {
      return NextResponse.json({ error: "Invalid wallet action type." }, { status: 400 });
    }
    if (!Number.isInteger(amount) || Number.isNaN(amount) || amount <= 0 || amount > MAX_WALLET_AMOUNT) {
      return NextResponse.json({ error: `Amount must be a positive integer not greater than ${MAX_WALLET_AMOUNT}.` }, { status: 400 });
    }
    if (!reason) {
      return NextResponse.json({ error: "Reason is required." }, { status: 400 });
    }

    const firestore = db!;
    const usersSnapshot = await firestore.collection("users").where("successfulReferrals", "==", inviteCount).limit(BULK_USER_LIMIT + 1).get();
    if (usersSnapshot.size > BULK_USER_LIMIT) {
      return NextResponse.json(
        {
          error: `Too many users match this invite count. Reduce the target or use a more specific filter to stay under ${BULK_USER_LIMIT} users.`,
        },
        { status: 400 }
      );
    }
    const matchingUsers = usersSnapshot.docs;

    const promises = matchingUsers.map(async (userDoc: any) => {
      const userData = userDoc.data() || {};
      const currentBalance = Number(userData.walletBalance || 0);
      const nextBalance = type === "add" ? currentBalance + amount : currentBalance - amount;
      if (type === "deduct" && nextBalance < 0) {
        return null;
      }
      const walletTransactionsRef = firestore.collection("walletTransactions").doc();

      await firestore.runTransaction(async (transaction: any) => {
        await appendNotification(userDoc.ref, {
          type: "wallet",
          message:
            type === "add"
              ? `Your wallet was credited with ${amount} ETB. Reason: ${reason}`
              : `Your wallet was deducted by ${amount} ETB. Reason: ${reason}`,
          createdAt: new Date(),
          read: false,
        }, 100, transaction);
        transaction.update(userDoc.ref, {
          walletBalance: nextBalance,
          updatedAt: new Date(),
        });
        transaction.set(walletTransactionsRef, {
          userId: userDoc.id,
          type: type === "add" ? "Wallet Credit" : "Wallet Deduction",
          amount: type === "add" ? amount : -amount,
          reason,
          createdAt: new Date(),
        });
      });

      return userDoc.id;
    });

    const results = await Promise.all(promises);
    const updatedCount = results.filter(Boolean).length;

    return NextResponse.json({ success: true, message: `${type === "add" ? "Credited" : "Deducted"} wallet for ${updatedCount} users.` });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update wallets." }, { status: 500 });
  }
}
