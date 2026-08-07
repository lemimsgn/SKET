import { existsSync, readFileSync } from "fs";
import { initializeApp, applicationDefault, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { normalizePhoneId } from "./phoneValidation";

// Exported mutable state so callers can observe re-initialization results.
export let firebaseAdminInitError: Error | null = null;
export let db: ReturnType<typeof getFirestore> | null = null;
export let auth: ReturnType<typeof getAuth> | null = null;

function initAdminApp() {
  if (getApps().length > 0) {
    // Already initialized; ensure exports reflect current apps
    db = getApps().length > 0 ? getFirestore() : null;
    auth = getApps().length > 0 ? getAuth() : null;
    firebaseAdminInitError = null;
    return;
  }

  const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const adminKeyBase64 = process.env.FIREBASE_ADMIN_SDK_BASE64;

  try {
    if (adminKeyBase64) {
      const raw = Buffer.from(adminKeyBase64, "base64").toString("utf-8");
      initializeApp({ credential: cert(JSON.parse(raw)) });
      db = getFirestore();
      auth = getAuth();
      firebaseAdminInitError = null;
      return;
    }

    if (serviceAccountPath) {
      if (!existsSync(serviceAccountPath)) {
        throw new Error(`Service account file not found: ${serviceAccountPath}`);
      }
      const raw = readFileSync(serviceAccountPath, "utf-8");
      const credentials = JSON.parse(raw);
      initializeApp({ credential: cert(credentials) });
      db = getFirestore();
      auth = getAuth();
      firebaseAdminInitError = null;
      return;
    }

    initializeApp({ credential: applicationDefault() });
    db = getFirestore();
    auth = getAuth();
    firebaseAdminInitError = null;
  } catch (error: any) {
    // Log full error server-side for debugging but keep exported message generic
    console.error("Firebase Admin initialization failed:", error);
    firebaseAdminInitError = new Error("Firebase Admin initialization failed. Check server logs for details.");
    db = null;
    auth = null;
  }
}

// Allow other modules to trigger a re-init attempt.
export function refreshFirebaseAdmin() {
  initAdminApp();
}

// Attempt init on module load; callers can re-run via refreshFirebaseAdmin().
initAdminApp();

export async function setCustomUserClaims(uid: string, claims: Record<string, any>) {
  if (!auth) {
    throw new Error("Firebase Admin auth is not initialized.");
  }
  return auth.setCustomUserClaims(uid, claims);
}

export async function setAdminCustomClaims(uid: string) {
  return setCustomUserClaims(uid, { admin: true, role: "admin" });
}

export async function clearAdminCustomClaims(uid: string) {
  return setCustomUserClaims(uid, { admin: false, role: "user" });
}

export async function getUserDocumentByPhone(phone: string) {
  if (!db) {
    throw new Error("Firebase Admin is not initialized.");
  }
  if (!phone) {
    return null;
  }

  const normalizedPhone = normalizePhoneId(phone);
  if (normalizedPhone) {
    const docRef = db.collection("users").doc(normalizedPhone);
    const docSnap = await docRef.get();
    if (docSnap.exists) {
      return { ref: docRef, snap: docSnap };
    }
  }

  const querySnapshot = await db.collection("users").where("phone", "==", phone).limit(1).get();
  if (querySnapshot.empty) {
    return null;
  }
  const foundDoc = querySnapshot.docs[0];
  return { ref: foundDoc.ref, snap: foundDoc };
}

export async function getUserDocumentById(id: string) {
  if (!db) {
    throw new Error("Firebase Admin is not initialized.");
  }
  if (!id) {
    return null;
  }

  const normalizedPhone = normalizePhoneId(id);
  if (normalizedPhone) {
    const docRef = db.collection("users").doc(normalizedPhone);
    const docSnap = await docRef.get();
    if (docSnap.exists) {
      return { ref: docRef, snap: docSnap };
    }
  }

  const phoneQuerySnapshot = await db.collection("users").where("phone", "==", id).limit(1).get();
  if (!phoneQuerySnapshot.empty) {
    return { ref: phoneQuerySnapshot.docs[0].ref, snap: phoneQuerySnapshot.docs[0] };
  }

  const uidQuerySnapshot = await db.collection("users").where("uid", "==", id).limit(1).get();
  if (!uidQuerySnapshot.empty) {
    return { ref: uidQuerySnapshot.docs[0].ref, snap: uidQuerySnapshot.docs[0] };
  }

  return null;
}


