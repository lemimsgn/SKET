import { db } from "./firebaseClient";
import { assertValidPhoneId, normalizePhoneId } from "./phoneValidation";
import {
  doc,
  setDoc,
  getDoc,
  collection,
  addDoc,
  query,
  where,
  getDocs,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

const ensureFirestore = () => {
  if (!db) {
    throw new Error(
      "Firestore is not initialized. Set NEXT_PUBLIC_FIREBASE_API_KEY, NEXT_PUBLIC_FIREBASE_PROJECT_ID, and NEXT_PUBLIC_FIREBASE_APP_ID in your environment."
    );
  }
  return db;
};

export async function createUserFirestore(user: any) {
  const firestore = ensureFirestore();
  const phone = assertValidPhoneId(user?.phone);
  const ref = doc(firestore, "users", phone);
  const payload: Record<string, any> = {
    uid: user.uid || phone,
    firstName: user.firstName || "",
    lastName: user.lastName || "",
    fullName: `${user.firstName || ""} ${user.lastName || ""}`.trim(),
    phone: user.phone,
    selectedPlan: user.selectedPlan || "",
    referralCode: user.referralCode || "",
    referredBy: user.referredBy || null,
    status: user.approved ? "approved" : "pending",
    role: user.role || "user",
    registrationFee: user.registrationFee || 3000,
    walletBalance: user.walletBalance ?? 0,
    totalEarned: user.totalEarned ?? 0,
    totalWithdrawn: user.totalWithdrawn ?? 0,
    successfulReferrals: user.successfulReferrals ?? 0,
    profileImage: user.profileImage || "",
    notifications: user.notifications || [],
    createdAt: serverTimestamp(),
    approvedAt: user.approved ? serverTimestamp() : null,
    lastLogin: null,
  };

  const storedPassword = String(user.password || "");
  if (/^\$2[aby]\$/.test(storedPassword)) {
    payload.password = storedPassword;
  }
  await setDoc(ref, payload, { merge: true });
  return payload;
}

export async function getUserByPhone(phone: string): Promise<Record<string, any> | null> {
  const firestore = ensureFirestore();
  if (!phone) return null;
  const normalizedPhone = normalizePhoneId(phone);
  if (normalizedPhone) {
    try {
      const ref = doc(firestore, "users", normalizedPhone);
      const snap = await getDoc(ref);
      if (snap.exists()) return { id: snap.id, ...snap.data() };
    } catch (e) {
      // ignore and fall back to query
    }
  }

  // Fall back to querying by `phone` field
  const col = collection(firestore, "users");
  const q = query(col, where("phone", "==", phone));
  const snapshot = await getDocs(q);
  if (!snapshot || snapshot.docs.length === 0) return null;
  const docSnap = snapshot.docs[0];
  return { id: docSnap.id, ...docSnap.data() };
}

export async function getAdminByPhone(phone: string): Promise<Record<string, any> | null> {
  const firestore = ensureFirestore();
  if (!phone) return null;
  const ref = doc(firestore, "admins", phone);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

export async function getUsersByStatus(status: string) {
  const firestore = ensureFirestore();
  const col = collection(firestore, "users");
  const q = query(col, where("status", "==", status));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
}

export async function getAllUsers() {
  const firestore = ensureFirestore();
  const col = collection(firestore, "users");
  const snapshot = await getDocs(col);
  return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
}

export async function getWithdrawRequestsByStatus(status: string) {
  const firestore = ensureFirestore();
  const col = collection(firestore, "withdrawRequests");
  const q = query(col, where("status", "==", status));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
}

export async function updateUserStatus(phone: string, status: string) {
  const firestore = ensureFirestore();
  if (!phone) return null;
  const normalizedPhone = assertValidPhoneId(phone);
  const ref = doc(firestore, "users", normalizedPhone);
  const payload: Record<string, any> = {
    status,
  };
  if (status === "approved") {
    payload.approvedAt = serverTimestamp();
  } else {
    payload.approvedAt = null;
  }
  await updateDoc(ref, payload);
  return payload;
}

export async function updateWithdrawRequestStatus(requestId: string, status: string) {
  const firestore = ensureFirestore();
  if (!requestId) return null;
  const ref = doc(firestore, "withdrawRequests", requestId);
  const payload: Record<string, any> = {
    status,
  };
  if (status === "approved") {
    payload.approvedAt = serverTimestamp();
  } else {
    payload.approvedAt = null;
  }
  await updateDoc(ref, payload);
  return payload;
}

export async function createWithdrawRequest(userId: string, request: any) {
  const firestore = ensureFirestore();
  if (!userId) return null;
  const col = collection(firestore, "withdrawRequests");
  const payload = {
    userId,
    fullName: request.fullName || "",
    phone: request.phone || "",
    amount: request.amount || 0,
    bankName: request.bankName || "",
    accountNumber: request.accountNumber || "",
    walletBalance: request.walletBalance ?? 0,
    status: "pending",
    requestedAt: serverTimestamp(),
    approvedAt: null,
    note: request.note || "",
  };
  const docRef = await addDoc(col, payload);
  return { id: docRef.id, ...payload };
}

export async function addWalletTransaction(userId: string, tx: any) {
  if (!db) throw new Error("Firestore is not initialized. Configure NEXT_PUBLIC_FIREBASE_API_KEY, NEXT_PUBLIC_FIREBASE_PROJECT_ID, and NEXT_PUBLIC_FIREBASE_APP_ID.");
  if (!userId) return null;
  const col = collection(db, "walletTransactions");
  const payload = {
    userId,
    type: tx.type || "Transaction",
    amount: tx.amount || 0,
    balanceAfter: tx.balanceAfter ?? null,
    referenceId: tx.referenceId || null,
    createdAt: serverTimestamp(),
    note: tx.note || "",
  };
  const docRef = await addDoc(col, payload);
  return { id: docRef.id, ...payload };
}
