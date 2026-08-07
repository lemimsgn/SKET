import { db } from "./firebaseAdmin";

export interface Notification {
  type: string;
  message: string;
  createdAt?: any;
  read?: boolean;
  [key: string]: any;
}

/**
 * Append a notification to a user's `notifications` array, capping length.
 * If a `transaction` is provided, it will be used so this can be called inside
 * existing transactions. Otherwise a transaction will be created.
 */
export async function appendNotification(userRef: any, notification: Notification, max = 100, transaction?: any) {
  if (!db) throw new Error("Firestore admin is not initialized.");
  if (!userRef) throw new Error("userRef is required");

  const doUpdate = async (tx: any) => {
    const snap = await tx.get(userRef);
    if (!snap.exists) throw new Error("User not found when appending notification.");
    const data = snap.data() || {};
    const current = Array.isArray(data.notifications) ? data.notifications : [];
    const next = [...current, notification];
    const capped = next.slice(-max);
    tx.update(userRef, { notifications: capped, updatedAt: new Date() });
  };

  if (transaction) {
    await doUpdate(transaction);
    return;
  }

  await db.runTransaction(async (tx: any) => {
    await doUpdate(tx);
  });
}
