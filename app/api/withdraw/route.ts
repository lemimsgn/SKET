import { NextResponse } from "next/server";
import { db, firebaseAdminInitError as rawFirebaseAdminInitError, getUserDocumentByPhone } from "../../../lib/firebaseAdmin";
import { requireUserAuth } from "../../../lib/userAuth";
import { isValidPhoneId } from "../../../lib/phoneValidation";
const firebaseAdminInitError = rawFirebaseAdminInitError as Error | null;

export async function POST(request: Request) {
  if (firebaseAdminInitError || !db) {
    return NextResponse.json({ error: firebaseAdminInitError?.message || "Firebase Admin is not initialized." }, { status: 500 });
  }
  if (!db) {
    return NextResponse.json({ error: "Firebase Admin is not initialized." }, { status: 500 });
  }

  const firestore = db;

  try {
    const body = await request.json();
    const { amount, accountNumber, accountHolderName } = body as Record<string, any>;

    const auth = await requireUserAuth(request);
    if (!auth.ok) return auth.response;
    const userId = auth.phone || auth.uid;
    if (!isValidPhoneId(userId)) {
      return NextResponse.json({ error: "Authenticated phone number is invalid." }, { status: 401 });
    }
    const numericAmount = Number(amount);
    const accountNumberText = String(accountNumber || "").trim();
    const accountHolderNameText = String(accountHolderName || "").trim();

    if (!userId || !Number.isFinite(numericAmount) || numericAmount <= 0 || !accountNumberText || !accountHolderNameText) {
      return NextResponse.json({ error: "Amount, CBE account number, and account holder name are required." }, { status: 400 });
    }
    if (!/^\d{13}$/.test(accountNumberText)) {
      return NextResponse.json({ error: "Account number must be exactly 13 digits." }, { status: 400 });
    }

    const requestRef = firestore.collection("withdrawRequests").doc();
    const userResult = await getUserDocumentByPhone(userId);
    if (!userResult) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }
    const userRef = userResult.ref;

    await firestore.runTransaction(async (transaction: any) => {
      const userSnapshot = await transaction.get(userRef);
      if (!userSnapshot.exists) {
        throw new Error("User not found.");
      }

      const user = userSnapshot.data() || {};
      if (String(user.status || "").toLowerCase() === "locked") {
        throw new Error("Your account is locked. Withdrawals are disabled.");
      }
      if (user.pendingWithdrawalId) {
        throw new Error("You already have a pending withdrawal request. Wait until it is approved or rejected.");
      }

      const balance = Number(user.walletBalance || 0);
      if (user.status !== "approved") {
        throw new Error("Your account must be approved before withdrawing.");
      }
      if (numericAmount > balance) {
        throw new Error("Withdrawal amount exceeds your wallet balance.");
      }

      transaction.set(requestRef, {
        userId: userSnapshot.id,
        fullName: user.fullName || `${user.firstName || ""} ${user.lastName || ""}`.trim(),
        phone: user.phone || userSnapshot.id,
        referralCode: user.referralNumber || user.referralCode || "",
        walletBalance: balance,
        amount: numericAmount,
        bankName: "CBE",
        accountNumber: accountNumberText,
        accountHolderName: accountHolderNameText,
        status: "pending",
        requestedAt: new Date(),
        approvedAt: null,
        rejectionReason: null,
      });
      transaction.update(userRef, { pendingWithdrawalId: requestRef.id });
    });

    return NextResponse.json({ success: true, id: requestRef.id });
  } catch (error: any) {
    console.error("withdraw error:", error);
    return NextResponse.json({ error: "Something went wrong, please try again." }, { status: 500 });
  }
}
