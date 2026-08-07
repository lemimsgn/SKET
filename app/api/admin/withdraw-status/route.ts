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

  if (!db) {
    return NextResponse.json({ error: "Firebase Admin is not initialized." }, { status: 500 });
  }

  const firestore = db;

  try {
    const body = await request.json();
    const { id, status, rejectionReason } = body as { id?: string; status?: string; rejectionReason?: string };

    if (!id || !status || !["approved", "rejected"].includes(status)) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const ref = firestore.collection("withdrawRequests").doc(id);
    const transactionRef = firestore.collection("walletTransactions").doc();
    await firestore.runTransaction(async (transaction: any) => {
      const requestSnapshot = await transaction.get(ref);
      if (!requestSnapshot.exists) throw new Error("Withdrawal request not found.");
      const withdrawal = requestSnapshot.data() || {};
      if (withdrawal.status !== "pending") throw new Error("This withdrawal has already been processed.");

      const userRef = firestore.collection("users").doc(String(withdrawal.userId));
      const userSnapshot = await transaction.get(userRef);
      if (!userSnapshot.exists) throw new Error("Withdrawal user not found.");
      const user = userSnapshot.data() || {};
      const amount = Number(withdrawal.amount || 0);
      const balance = Number(user.walletBalance || 0);

      if (status === "approved") {
        if (amount <= 0 || amount > balance) throw new Error("User no longer has enough wallet balance.");
        const balanceAfter = balance - amount;
        await appendNotification(userRef, {
          type: "withdrawal",
          message: `Your withdrawal of ${amount} ETB was approved.`,
          createdAt: new Date(),
          read: false,
        }, 100, transaction);
        transaction.update(userRef, {
          walletBalance: balanceAfter,
          totalWithdrawn: Number(user.totalWithdrawn || 0) + amount,
          pendingWithdrawalId: null,
        });
        transaction.set(transactionRef, {
          userId: userSnapshot.id,
          type: "Withdrawal",
          amount: -amount,
          balanceAfter,
          referenceId: id,
          createdAt: new Date(),
          note: "Approved withdrawal",
        });
      } else {
        await appendNotification(userRef, {
          type: "withdrawal",
          message: `Your withdrawal of ${amount} ETB was rejected.${rejectionReason ? ` Reason: ${rejectionReason}` : ""}`,
          createdAt: new Date(),
          read: false,
        }, 100, transaction);
        transaction.update(userRef, {
          pendingWithdrawalId: null,
        });
      }

      transaction.update(ref, {
        status,
        approvedAt: status === "approved" ? new Date() : null,
        rejectionReason: status === "rejected" ? String(rejectionReason || "") : null,
        processedAt: new Date(),
      });
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("admin/withdraw-status error:", error);
    return NextResponse.json({ error: "Something went wrong, please try again." }, { status: 500 });
  }
}
