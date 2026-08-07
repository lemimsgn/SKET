import { db } from "./firebaseAdmin";

const COLLECTION = "securityQuestionLocks";
const ATTEMPT_THRESHOLD = 5; // lock after this many failures
const LOCK_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

export async function getSecurityQuestionLockStatus(phone: string) {
  if (!db) return { locked: false };
  const doc = await db.collection(COLLECTION).doc(phone).get();
  if (!doc.exists) return { locked: false };
  const data = doc.data() || {};
  const lockedUntil = data.lockedUntil ? new Date(data.lockedUntil.toDate ? data.lockedUntil.toDate() : data.lockedUntil) : null;
  if (lockedUntil && lockedUntil.getTime() > Date.now()) {
    return { locked: true, retryAfter: Math.ceil((lockedUntil.getTime() - Date.now()) / 1000) };
  }
  return { locked: false, attempts: Number(data.attempts || 0) };
}

export async function recordSecurityQuestionFailure(phone: string) {
  if (!db) return { locked: false };
  const ref = db.collection(COLLECTION).doc(phone);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.exists ? (snap.data() || {}) : {};
    const attempts = Number(data.attempts || 0) + 1;
    const update: any = { attempts, lastAttemptAt: new Date() };
    let locked = false;
    let retryAfter = 0;
    if (attempts >= ATTEMPT_THRESHOLD) {
      const lockedUntil = new Date(Date.now() + LOCK_DURATION_MS);
      update.lockedUntil = lockedUntil;
      locked = true;
      retryAfter = Math.ceil(LOCK_DURATION_MS / 1000);
    }
    tx.set(ref, update, { merge: true });
    return { locked, attempts, retryAfter };
  });
}

export async function resetSecurityQuestionAttempts(phone: string) {
  if (!db) return;
  const ref = db.collection(COLLECTION).doc(phone);
  await ref.delete();
}
