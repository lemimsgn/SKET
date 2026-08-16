import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
};

const canInitialize = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId);
if (canInitialize && !getApps().length) {
  try {
    initializeApp(firebaseConfig);
  } catch (e) {
    // silent - dev without firebase configured
  }
}

export const db = canInitialize ? getFirestore() : null;
export const auth = typeof window !== "undefined" && canInitialize ? getAuth() : null;
