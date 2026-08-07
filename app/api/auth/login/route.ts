import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { db, firebaseAdminInitError as rawFirebaseAdminInitError } from "../../../../lib/firebaseAdmin";
import { isValidPhoneId } from "../../../../lib/phoneValidation";
import { checkLimit, getRequestIp, recordFailure, recordSuccess } from "../../../../lib/rateLimit";
import { createSessionTokenForPhone } from "../../../../lib/userAuth";

const firebaseAdminInitError = rawFirebaseAdminInitError as Error | null;

export async function POST(request: Request) {
  if (firebaseAdminInitError || !db) {
    return NextResponse.json({ error: "Firebase Admin is not initialized." }, { status: 500 });
  }

  try {
    const body = await request.json();
    const phone = String(body.phone || "").trim();
    const password = String(body.password || "");
    const ip = getRequestIp(request);

    if (!phone || !password) {
      return NextResponse.json({ error: "Phone and password are required." }, { status: 400 });
    }

    if (!isValidPhoneId(phone)) {
      return NextResponse.json({ error: "Phone number must start with 09 or 07 and be exactly 10 digits." }, { status: 400 });
    }

    // rate limit check
    const allowed = await checkLimit("auth:login", ip, phone);
    if (!allowed.allowed) {
      return NextResponse.json({ error: "Too many attempts. Try later." }, { status: 429, headers: { "Retry-After": String(allowed.retryAfter) } });
    }

    // Check bannedUsers by phone field (some records may be keyed by uid)
    const bannedQuery = await db.collection("bannedUsers").where("phone", "==", phone).limit(1).get();
    if (!bannedQuery.empty) {
      return NextResponse.json({ error: "This account has been banned.", banned: true }, { status: 403 });
    }

    // Lookup user by phone field. Some older records use uid as document id, so query ensures we find them.
    const userQuery = await db.collection("users").where("phone", "==", phone).limit(1).get();
    if (userQuery.empty) {
      await recordFailure("auth:login", ip, phone);
      return NextResponse.json({ error: "No user found with that phone number." }, { status: 404 });
    }

    const userSnapshot = userQuery.docs[0];
    const userData = userSnapshot.data() || {};
    const storedPassword = String(userData.password || "");
    const isHashed = /^\$2[aby]\$/.test(storedPassword);

    if (!storedPassword || !isHashed) {
      await recordFailure("auth:login", ip, phone);
      return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
    }

    const passwordMatches = await bcrypt.compare(password, storedPassword);

    if (!passwordMatches) {
      await recordFailure("auth:login", ip, phone);
      return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
    }

    // success — clear counters
    await recordSuccess("auth:login", ip, phone);

    const sessionToken = createSessionTokenForPhone(phone);
    const cookieValue =
      `sket-session=${encodeURIComponent(sessionToken)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${60 * 60 * 24}` +
      (process.env.NODE_ENV === "production" ? "; Secure" : "");

    return NextResponse.json(
      {
        success: true,
        user: {
          id: userSnapshot.id,
          firstName: userData.firstName || "",
          lastName: userData.lastName || "",
          phone: userData.phone || userSnapshot.id,
          fullName: userData.fullName || `${userData.firstName || ""} ${userData.lastName || ""}`.trim(),
          selectedPlan: userData.selectedPlan || "",
          approved: userData.approved ?? false,
          status: userData.status || (userData.approved ? "approved" : "pending"),
          walletBalance: userData.walletBalance ?? 0,
          referralCode: userData.referralCode || "",
          referralNumber: userData.referralNumber || "",
        },
      },
      { headers: { "Set-Cookie": cookieValue } }
    );
  } catch (error: any) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Failed to authenticate." }, { status: 500 });
  }
}
