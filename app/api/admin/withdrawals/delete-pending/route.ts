import { NextResponse } from "next/server";
import { requireAdminAuth } from "../../../../../lib/adminAuth";
import { db, firebaseAdminInitError as rawFirebaseAdminInitError } from "../../../../../lib/firebaseAdmin";

const firebaseAdminInitError = rawFirebaseAdminInitError as Error | null;

export async function POST(request: Request) {
  const authResponse = await requireAdminAuth(request);
  if (authResponse) {
    return authResponse;
  }
  if (firebaseAdminInitError || !db) {
    return NextResponse.json({ error: firebaseAdminInitError?.message || "Firebase Admin is not initialized." }, { status: 500 });
  }

  const firestore = db;

  try {
    const snapshot = await firestore.collection("withdrawRequests").where("status", "==", "pending").get();
    if (snapshot.empty) {
      return NextResponse.json({ success: true, deleted: 0 });
    }

    const batch = firestore.batch();
    let deleted = 0;
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
      deleted += 1;
    });

    await batch.commit();
    return NextResponse.json({ success: true, deleted });
  } catch (error: any) {
    console.error("admin/withdrawals/delete-pending error:", error);
    return NextResponse.json({ error: "Something went wrong, please try again." }, { status: 500 });
  }
}
