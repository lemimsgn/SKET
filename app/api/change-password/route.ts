import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { db, firebaseAdminInitError, getUserDocumentByPhone } from "../../../lib/firebaseAdmin";
import { requireUserAuth } from "../../../lib/userAuth";
import { verifyAndConsumePasswordResetToken } from "../../../lib/passwordReset";
import { checkLimit, getRequestIp, recordFailure, recordSuccess } from "../../../lib/rateLimit";
import { validatePassword } from "../../../lib/passwordPolicy";
import { assertValidPhoneId } from "../../../lib/phoneValidation";

export async function POST(request: Request) {
  if (firebaseAdminInitError) {
    console.error("Firebase Admin init error:", firebaseAdminInitError);
    return NextResponse.json({ error: "Firebase Admin is not initialized." }, { status: 500 });
  }

  if (!db) {
    return NextResponse.json({ error: "Firestore admin is not initialized." }, { status: 500 });
  }

  const body = await request.json();
  const newPassword = String(body.newPassword || "");
  const oldPassword = String(body.oldPassword || "").trim();
  const resetToken = String(body.resetToken || "").trim() || null;

  const ip = getRequestIp(request);

  let phone: string | undefined | null = null;
  let isTokenReset = false;
  if (resetToken) {
    const tokenLimit = await checkLimit("password:reset", ip);
    if (!tokenLimit.allowed) {
      return NextResponse.json({ error: "Too many password reset attempts. Try later." }, { status: 429, headers: { "Retry-After": String(tokenLimit.retryAfter) } });
    }

    const verifiedPhone = await verifyAndConsumePasswordResetToken(resetToken);
    if (!verifiedPhone) {
      await recordFailure("password:reset", ip);
      return NextResponse.json({ error: "Invalid or expired reset token." }, { status: 401 });
    }
    phone = verifiedPhone;
    isTokenReset = true;
  } else {
    const allowed = await checkLimit("password:change", ip);
    if (!allowed.allowed) return NextResponse.json({ error: "Too many attempts. Try later." }, { status: 429, headers: { "Retry-After": String(allowed.retryAfter) } });
    const auth = await requireUserAuth(request);
    if (!auth.ok) return auth.response;
    phone = auth.phone || auth.uid;
  }

  if (!phone || !newPassword) {
    return NextResponse.json({ error: "Phone and new password are required." }, { status: 400 });
  }

  try {
    phone = assertValidPhoneId(phone);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Invalid phone number." }, { status: 400 });
  }

  const passCheck = validatePassword(newPassword.trim());
  if (!passCheck.ok) return NextResponse.json({ error: passCheck.message }, { status: 400 });

  try {
    const userResult = await getUserDocumentByPhone(phone);
    if (!userResult) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    if (!isTokenReset) {
      if (!oldPassword) {
        await recordFailure("password:change", ip, phone || undefined);
        return NextResponse.json({ error: "Current password is required to change password." }, { status: 400 });
      }
      const userData = userResult.snap.data() || {};
      const storedPassword = String(userData.password || "");
      const isHashed = /^\$2[aby]\$/.test(storedPassword);
      if (!storedPassword || !isHashed) {
        await recordFailure("password:change", ip, phone || undefined);
        return NextResponse.json({ error: "Unable to verify current password." }, { status: 401 });
      }
      const match = await bcrypt.compare(oldPassword, storedPassword);
      if (!match) {
        await recordFailure("password:change", ip, phone || undefined);
        return NextResponse.json({ error: "Current password is incorrect." }, { status: 401 });
      }
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await userResult.ref.update({ password: passwordHash, updatedAt: new Date() });
    await recordSuccess(isTokenReset ? "password:reset" : "password:change", ip, phone || undefined);
    return NextResponse.json({ message: "Password updated successfully." });
  } catch (error: any) {
    await recordFailure(isTokenReset ? "password:reset" : "password:change", ip, phone || undefined);
    return NextResponse.json({ error: error.message || "Could not update password." }, { status: 500 });
  }
}
