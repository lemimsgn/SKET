import { NextRequest, NextResponse } from "next/server";
import { db, firebaseAdminInitError as rawFirebaseAdminInitError, getUserDocumentByPhone } from "../../../lib/firebaseAdmin";
import { requireUserAuth } from "../../../lib/userAuth";
import { isValidPhoneId } from "../../../lib/phoneValidation";

const firebaseAdminInitError = rawFirebaseAdminInitError as Error | null;
const PENDING_ACCOUNT_TTL_MS = 48 * 60 * 60 * 1000;

function toDateValue(value: any): Date | null {
  if (!value) return null;
  if (typeof value.toDate === "function") return value.toDate();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

async function deleteUserAndRelatedData(userId: string, phone: string, uid?: string) {
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

  const userRef = db.collection("users").doc(userId);
  await userRef.delete();
}

export async function GET(request: NextRequest) {
  if (firebaseAdminInitError || !db) {
    return NextResponse.json({ error: "Firebase Admin is not initialized." }, { status: 500, headers: { "Cache-Control": "public, max-age=5" } });
  }

  let requestedPhone = request.nextUrl.searchParams.get("phone")?.trim() || "";

  const auth = await requireUserAuth(request);
  if (!auth.ok) return auth.response;
  const callerPhone = auth.phone || auth.uid;

  if (!callerPhone || !isValidPhoneId(String(callerPhone))) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!requestedPhone) {
    requestedPhone = String(callerPhone);
  }

  if (!isValidPhoneId(requestedPhone)) {
    return NextResponse.json({ error: "Phone number must start with 09 or 07 and be exactly 10 digits." }, { status: 400 });
  }

  if (String(callerPhone) !== requestedPhone) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  try {
    const userResult = await getUserDocumentByPhone(requestedPhone);
    if (!userResult) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const userData = userResult.snap.data() || {};
    const createdAt = toDateValue(userData.createdAt);
    const isPendingExpired =
      String(userData.status || (userData.approved ? "approved" : "pending")).toLowerCase() === "pending" &&
      createdAt &&
      Date.now() - createdAt.getTime() >= PENDING_ACCOUNT_TTL_MS;

    if (isPendingExpired) {
      await deleteUserAndRelatedData(userResult.snap.id, String(userData.phone || requestedPhone), String(userData.uid || ""));
      return NextResponse.json({ error: "Your pending account has expired and was deleted automatically." }, { status: 410 });
    }

    const settingsRef = db.collection("settings").doc("referralRewards");
    const settingsSnapshot = await settingsRef.get();
    const settingsData = settingsSnapshot.exists ? settingsSnapshot.data() || {} : {};
    const currentRegistrationFee = userData.registrationFee ?? Number(settingsData.registrationFee ?? 3000);
    const currentRegistrationAccountNumber =
      String(userData.registrationAccountNumber || settingsData.accountNumber || "1000686058477").trim();
    const currentRegistrationTelegramLink =
      String(userData.registrationTelegramLink || settingsData.registrationTelegramLink || "https://t.me/leonmsgn").trim();
    return NextResponse.json({
      user: {
        id: userResult.snap.id,
        firstName: userData.firstName || "",
        lastName: userData.lastName || "",
        fullName: userData.fullName || `${userData.firstName || ""} ${userData.lastName || ""}`.trim(),
        phone: userData.phone || userResult.snap.id,
        selectedPlan: userData.selectedPlan || "",
        approved: userData.approved ?? false,
        status: userData.status || (userData.approved ? "approved" : "pending"),
        rejectionCount: Number(userData.rejectionCount || 0),
        createdAt: userData.createdAt || null,
        walletBalance: userData.walletBalance ?? 0,
        totalEarned: userData.totalEarned ?? 0,
        totalWithdrawn: userData.totalWithdrawn ?? 0,
        referralCode: userData.referralCode || "",
        referralNumber: userData.referralNumber || "",
        profileImage: userData.profileImage || "",
        registrationFee: currentRegistrationFee,
        registrationAccountNumber: currentRegistrationAccountNumber,
        registrationTelegramLink: currentRegistrationTelegramLink,
        securityQuestionsExist: Array.isArray(userData.securityQuestions) && (userData.securityQuestions || []).length >= 2,
        notifications: Array.isArray(userData.notifications) ? userData.notifications : [],
      },
    }, { headers: { "Cache-Control": "no-store, must-revalidate" } });
  } catch (error: any) {
    console.error("Error fetching user:", error);
    return NextResponse.json({ error: "Failed to load user." }, { status: 500, headers: { "Cache-Control": "public, max-age=5" } });
  }
}
