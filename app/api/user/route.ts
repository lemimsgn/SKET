import { NextRequest, NextResponse } from "next/server";
import { db, firebaseAdminInitError as rawFirebaseAdminInitError, getUserDocumentByPhone } from "../../../lib/firebaseAdmin";
import { requireUserAuth } from "../../../lib/userAuth";
import { isValidPhoneId } from "../../../lib/phoneValidation";

const firebaseAdminInitError = rawFirebaseAdminInitError as Error | null;

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
