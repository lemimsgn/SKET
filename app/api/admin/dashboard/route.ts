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
    const usersRef = db.collection("users");
    const pendingSnapshot = await usersRef.where("status", "==", "pending").get();
    const nowMs = Date.now();

    for (const doc of pendingSnapshot.docs) {
      const data = doc.data() || {};
      const createdAt = data.createdAt && typeof data.createdAt.toDate === "function" ? data.createdAt.toDate() : new Date(data.createdAt || 0);
      if (Number.isNaN(createdAt.getTime())) continue;
      if (nowMs - createdAt.getTime() >= 48 * 60 * 60 * 1000) {
        const phone = String(data.phone || "");
        const deleteByField = async (collectionName: string, fieldName: string, value: string) => {
          if (!db) return;
          const child = await db.collection(collectionName).where(fieldName, "==", value).limit(200).get();
          if (child.empty) return;
          const batch = db.batch();
          child.docs.forEach((entry: any) => batch.delete(entry.ref));
          await batch.commit();
        };

        await deleteByField("withdrawRequests", "userId", doc.id);
        await deleteByField("withdrawRequests", "phone", phone);
        await deleteByField("walletTransactions", "userId", doc.id);
        await deleteByField("walletTransactions", "phone", phone);
        if (db) {
          await db.collection("users").doc(doc.id).delete();
        }
      }
    }

    const pendingQuery = usersRef.where("status", "==", "pending");
    const approvedQuery = usersRef.where("status", "==", "approved");

    const [pendingSnap, approvedSnap] = await Promise.all([
      pendingQuery.get(),
      approvedQuery.get(),
    ]);

    const pendingUsers = pendingSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    const approvedUsers = approvedSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    const withdrawRef = db.collection("withdrawRequests");
    const withdrawQuery = withdrawRef.where("status", "==", "pending");
    const withdrawSnap = await withdrawQuery.get();
    const pendingWithdrawals = withdrawSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    // Count today's registrations (users with createdAt on the same local day)
    const now = new Date();
    const isSameLocalDay = (d: any) => {
      if (!d) return false;
      let date: Date;
      try {
        if (typeof d.toDate === "function") {
          date = d.toDate();
        } else {
          date = new Date(d);
        }
      } catch (e) {
        return false;
      }
      return (
        date.getFullYear() === now.getFullYear() &&
        date.getMonth() === now.getMonth() &&
        date.getDate() === now.getDate()
      );
    };

    const todaysRegistrations = approvedUsers.reduce((count, u) => {
      return count + (isSameLocalDay((u as any).createdAt) ? 1 : 0);
    }, 0);

    return NextResponse.json({ pendingUsers, approvedUsers, pendingWithdrawals, todaysRegistrations });
  } catch (error: any) {
    console.error("admin/dashboard error:", error);
    return NextResponse.json({ error: "Something went wrong, please try again." }, { status: 500 });
  }
}
