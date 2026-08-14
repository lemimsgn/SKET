#!/usr/bin/env node
const { initializeApp, getApps } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore } = require("firebase-admin/firestore");

async function main() {
  const uid = process.argv[2];
  if (!uid) {
    console.error("Usage: node scripts/promote-admin.js <FIREBASE_AUTH_UID>");
    process.exit(1);
  }

  // Initialize using GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_ADMIN_SDK_BASE64
  if (!getApps() || !getApps().length) {
    initializeApp();
  }

  const auth = getAuth();
  const db = getFirestore();

  console.log("Setting custom claims for", uid);
  await auth.setCustomUserClaims(uid, { admin: true, role: "admin" });

  // Try to locate a user document and set role: 'admin'
  let docRef = db.collection("users").doc(uid);
  const snap = await docRef.get();
  if (!snap.exists) {
    const q = await db.collection("users").where("uid", "==", uid).limit(1).get();
    if (!q.empty) {
      docRef = q.docs[0].ref;
    } else {
      // create a new doc keyed by uid
      docRef = db.collection("users").doc(uid);
    }
  }

  await docRef.set({ role: "admin", uid }, { merge: true });
  console.log("User Firestore doc updated at", docRef.path);
  console.log("Done. Sign out and sign back in (or call getIdToken(true)) to refresh the ID token.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
