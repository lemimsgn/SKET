import { NextResponse } from "next/server";
import { requireAdminAuth } from "../../../../lib/adminAuth";
import { db, firebaseAdminInitError as rawFirebaseAdminInitError } from "../../../../lib/firebaseAdmin";

const firebaseAdminInitError = rawFirebaseAdminInitError as Error | null;
const PENDING_ACCOUNT_TTL_MS = 48 * 60 * 60 * 1000;

async function deleteUserAndRelatedData(userId: string, phone: string) {
  if (!db) return;

  const deleteByField = async (collectionName: string, fieldName: string, value: string) => {
    const snapshot = await db!.collection(collectionName).where(fieldName, "==", value).limit(200).get();
    if (snapshot.empty) return;
    const batch = db!.batch();
    snapshot.docs.forEach((doc: any) => batch.delete(doc.ref));
    await batch.commit();
  };

  await deleteByField("withdrawRequests", "userId", userId);
  await deleteByField("withdrawRequests", "phone", phone);
  await deleteByField("walletTransactions", "userId", userId);
  await deleteByField("walletTransactions", "phone", phone);

  await db.collection("users").doc(userId).delete();
}

async function purgeExpiredPendingUsers() {
  if (!db) return;
  const snapshot = await db.collection("users").where("status", "==", "pending").get();
  const now = Date.now();

  for (const doc of snapshot.docs) {
    const data = doc.data() || {};
    const createdAt = data.createdAt && typeof data.createdAt.toDate === "function" ? data.createdAt.toDate() : new Date(data.createdAt || 0);
    if (Number.isNaN(createdAt.getTime())) continue;
    if (now - createdAt.getTime() >= PENDING_ACCOUNT_TTL_MS) {
      await deleteUserAndRelatedData(doc.id, String(data.phone || ""));
    }
  }
}

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
    await purgeExpiredPendingUsers();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const searchTerm = searchParams.get("q")?.trim().toLowerCase() || "";
    let usersQuery: any = db.collection("users");

    if (status) {
      usersQuery = usersQuery.where("status", "==", status);
    }

    const snapshot = await usersQuery.get();
    let users = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));

    users = users.sort((a: any, b: any) => {
      const toTime = (value: any) => {
        if (!value) return 0;
        if (typeof value.toDate === "function") {
          return value.toDate().getTime();
        }
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? 0 : date.getTime();
      };

      return toTime(b.createdAt) - toTime(a.createdAt);
    });

    if (searchTerm) {
      users = users.filter((user: any) => {
        const searchableFields = [
          user.fullName,
          user.firstName,
          user.lastName,
          user.phone,
          user.referralCode,
          user.id,
          user.email,
        ]
          .filter(Boolean)
          .map((value) => String(value).toLowerCase());

        return searchableFields.some((field) => field.includes(searchTerm));
      });
    }

    return NextResponse.json({ users });
  } catch (error: any) {
    console.error("admin/users error:", error);
    return NextResponse.json({ error: "Something went wrong, please try again." }, { status: 500 });
  }
}
