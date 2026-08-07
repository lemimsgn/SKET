import { NextRequest, NextResponse } from "next/server";
import { db, firebaseAdminInitError } from "../../../lib/firebaseAdmin";
import { requireUserAuth } from "../../../lib/userAuth";

const getDateValue = (value: any) => {
  if (!value) return new Date(0);
  if (typeof value.toDate === "function") return value.toDate();
  if (value instanceof Date) return value;
  return new Date(value);
};

const isInviteTransaction = (type: any, note: any) => {
  const normalizedType = String(type || "").toLowerCase();
  const normalizedNote = String(note || "").toLowerCase();
  return (
    normalizedType === "referral reward" ||
    normalizedType === "referral" ||
    normalizedNote.includes("referral reward") ||
    normalizedNote.includes("referral bonus") ||
    normalizedNote.includes("reward for inviting")
  );
};

const normalizeTransfer = (doc: any, raw: any, phone: string) => {
  const data = raw || {};
  const createdAt = getDateValue(data.timestamp || data.createdAt || data.requestedAt || data.approvedAt || data.updatedAt);
  const direction = data.senderPhone === phone ? "sent" : data.recipientPhone === phone ? "received" : "neutral";

  return {
    id: doc.id,
    type: data.type || "transfer",
    category: direction === "sent" ? "send" : direction === "received" ? "receive" : "neutral",
    label: data.type === "transfer" ? (direction === "sent" ? "Sent money" : "Received money") : String(data.type || "Transaction"),
    subtitle:
      data.type === "transfer"
        ? direction === "sent"
          ? `To ${data.recipientName || data.recipientPhone || "Unknown"}`
          : `From ${data.senderName || data.senderPhone || "Unknown"}`
        : data.note || data.referenceId || "",
    amount: Number(data.amount || 0),
    status: String(data.status || "completed"),
    direction,
    createdAt,
    details: data,
    note: String(data.note || data.description || ""),
  };
};

const normalizeWithdrawal = (doc: any, raw: any, phone: string) => {
  const data = raw || {};
  const createdAt = getDateValue(data.requestedAt || data.approvedAt || data.timestamp || data.createdAt || data.updatedAt);

  return {
    id: doc.id,
    type: "Withdrawal",
    category: "withdraw",
    label: "Withdrawal",
    subtitle: `${String(data.status || "pending").toUpperCase()} withdrawal`,
    amount: Number(data.amount || 0),
    status: String(data.status || "pending"),
    direction: "withdrawal",
    createdAt,
    details: data,
    note: String(data.note || data.referenceId || ""),
  };
};

const normalizeWalletTransaction = (doc: any, raw: any, phone: string) => {
  const data = raw || {};
  const createdAt = getDateValue(data.createdAt || data.updatedAt || data.timestamp);
  const amount = Number(data.amount || 0);
  const note = String(data.note || data.description || "");
  const isInvite = isInviteTransaction(data.type, note);
  const direction = amount >= 0 ? "received" : "neutral";
  const category = isInvite ? "invite" : amount >= 0 ? "receive" : "neutral";
  const defaultLabel = amount >= 0 ? "Credit" : "Debit";

  return {
    id: doc.id,
    type: data.type || "wallet",
    category,
    label: isInvite ? "Referral reward" : data.type || defaultLabel,
    subtitle: isInvite ? note || "Referral bonus from invite" : note || String(data.referenceId || ""),
    amount,
    status: String(data.status || "completed"),
    direction,
    createdAt,
    details: data,
    note,
  };
};

export async function GET(request: NextRequest) {
  if (firebaseAdminInitError || !db) {
    return NextResponse.json(
      { error: firebaseAdminInitError?.message || "Firebase Admin not initialized." },
      { status: 500 }
    );
  }

  // derive the phone from verified auth — do not trust client-supplied phone
  const auth = await requireUserAuth(request as any);
  if (!auth.ok) return auth.response;
  const phone = (auth.phone || auth.uid) as string;

  try {
    const transactionsRef = db.collection("transactions");
    const sendsQuery = transactionsRef.where("senderPhone", "==", phone);
    const receivesQuery = transactionsRef.where("recipientPhone", "==", phone);
    const [sendsSnap, receivesSnap] = await Promise.all([sendsQuery.get(), receivesQuery.get()]);

    const transferRecords = [...sendsSnap.docs, ...receivesSnap.docs].map((doc) => normalizeTransfer(doc, doc.data(), phone));
    const transferMap = new Map(transferRecords.map((tx) => [tx.id, tx]));

    const withdrawalRef = db.collection("withdrawRequests");
    const withdrawByPhoneSnap = await withdrawalRef.where("phone", "==", phone).get();
    const withdrawByUserSnap = await withdrawalRef.where("userId", "==", phone).get();
    const withdrawalRecords = [...withdrawByPhoneSnap.docs, ...withdrawByUserSnap.docs]
      .map((doc) => normalizeWithdrawal(doc, { ...doc.data(), requestedAt: doc.data()?.requestedAt || doc.data()?.createdAt, amount: doc.data()?.amount }, phone))
      .filter((tx) => !transferMap.has(tx.id));

    const walletTransactionsRef = db.collection("walletTransactions");
    const walletTxSnap = await walletTransactionsRef.where("userId", "==", phone).get();
    const walletRecords = walletTxSnap.docs
      .map((doc) => normalizeWalletTransaction(doc, doc.data(), phone))
      .filter(
        (tx) =>
          !transferMap.has(tx.id) &&
          !withdrawalRecords.some((w) => w.id === tx.id) &&
          (tx.category === "receive" || tx.category === "invite")
      );

    const allTransactions = [...transferRecords, ...withdrawalRecords, ...walletRecords];
    allTransactions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return NextResponse.json({ transactions: allTransactions });
  } catch (error: any) {
    console.error("Failed to load transactions:", error);
    return NextResponse.json({ error: "Something went wrong, please try again." }, { status: 500 });
  }
}
