import crypto from "crypto";
import { db as firestore } from "./firebaseAdmin";

export async function createPasswordResetToken(phone: string, ttlSeconds = 15 * 60) {
  if (!firestore) throw new Error("Firestore not initialized");
  const token = crypto.randomBytes(32).toString("hex");
  const hash = crypto.createHash("sha256").update(token).digest("hex");
  const now = new Date();
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
  const docRef = firestore.collection("passwordResetTokens").doc(hash);
  await docRef.set({ phone, createdAt: now, expiresAt, used: false });
  return token;
}

export async function verifyAndConsumePasswordResetToken(token: string) {
  if (!firestore) throw new Error("Firestore not initialized");
  const hash = crypto.createHash("sha256").update(token).digest("hex");
  const docRef = firestore.collection("passwordResetTokens").doc(hash);
  return firestore.runTransaction(async (tx) => {
    const snap = await tx.get(docRef);
    if (!snap.exists) return null;
    const data: any = snap.data() || {};
    if (data.used) return null;
    const expiresAt = data.expiresAt ? new Date(data.expiresAt.seconds ? data.expiresAt.seconds * 1000 : data.expiresAt) : null;
    if (!expiresAt || Date.now() > expiresAt.getTime()) return null;
    tx.update(docRef, { used: true });
    return data.phone as string;
  });
}
