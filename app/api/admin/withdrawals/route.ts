import { NextResponse } from "next/server";
import { requireAdminAuth } from "../../../../lib/adminAuth";
import { db, firebaseAdminInitError as rawFirebaseAdminInitError } from "../../../../lib/firebaseAdmin";

const firebaseAdminInitError = rawFirebaseAdminInitError as Error | null;

export async function GET(request: Request) {
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

  try {
    const snapshot = await db.collection("withdrawRequests").orderBy("requestedAt", "desc").get();
    const withdrawals = snapshot.docs.map((doc) => {
      const d = doc.data();
      return {
        id: doc.id,
        fullName: d.fullName || "",
        userId: d.userId || null,
        phone: d.phone || null,
        amount: d.amount || 0,
        bankName: d.bankName || "",
        accountNumber: d.accountNumber || "",
        accountHolderName: d.accountHolderName || "",
        referralCode: d.referralCode || "",
        walletBalance: d.walletBalance || 0,
        requestedAt: d.requestedAt ? (typeof d.requestedAt.toDate === "function" ? d.requestedAt.toDate().toISOString() : new Date(d.requestedAt).toISOString()) : null,
        rejectionReason: d.rejectionReason || null,
        status: d.status || "pending",
      };
    });

    // ensure pending requests appear first
    withdrawals.sort((a, b) => {
      if (a.status === b.status) return 0;
      if (a.status === "pending") return -1;
      if (b.status === "pending") return 1;
      return 0;
    });

    return NextResponse.json({ withdrawals });
  } catch (error: any) {
    console.error("admin/withdrawals error:", error);
    return NextResponse.json({ error: "Something went wrong, please try again." }, { status: 500 });
  }
}
