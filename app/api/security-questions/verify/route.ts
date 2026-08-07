import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { db, firebaseAdminInitError, getUserDocumentByPhone } from "../../../../lib/firebaseAdmin";
import { createPasswordResetToken } from "../../../../lib/passwordReset";
import { sendPasswordResetToken } from "../../../../lib/resetDelivery";
import { checkLimit, getRequestIp, recordFailure, recordSuccess } from "../../../../lib/rateLimit";
import { getSecurityQuestionLockStatus, recordSecurityQuestionFailure, resetSecurityQuestionAttempts } from "../../../../lib/securityQuestionLock";
import { assertValidPhoneId } from "../../../../lib/phoneValidation";

export async function POST(request: Request) {
  if (firebaseAdminInitError) {
    console.error("Firebase Admin init error:", firebaseAdminInitError);
    return NextResponse.json({ error: "Firestore admin is not initialized." }, { status: 500 });
  }

  if (!db) {
    return NextResponse.json({ error: "Firestore admin is not initialized." }, { status: 500 });
  }

  const body = await request.json();
  const rawPhone = String(body.phone || "").trim();
  const answers = Array.isArray(body.answers) ? (body.answers as string[]) : [];

  if (!rawPhone || answers.length !== 3) {
    return NextResponse.json({ error: "Phone and three answers are required." }, { status: 400 });
  }

  let phone: string;
  try {
    phone = assertValidPhoneId(rawPhone);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Invalid phone number." }, { status: 400 });
  }

  const sanitizedAnswers = answers.map((item: string) => String(item || "").trim());
  if (sanitizedAnswers.some((answer: string) => !answer)) {
    return NextResponse.json({ error: "All three answers are required." }, { status: 400 });
  }

  try {
    const ip = getRequestIp(request);

    // fast IP-based check
    const allowed = await checkLimit("security:verify", ip, phone);
    if (!allowed.allowed) {
      return NextResponse.json({ error: "Too many attempts. Try later." }, { status: 429, headers: { "Retry-After": String(allowed.retryAfter) } });
    }

    // persistent per-account lockout
    const lockStatus = await getSecurityQuestionLockStatus(phone);
    if (lockStatus.locked) {
      await recordFailure("security:verify", ip, phone);
      return NextResponse.json({ error: "Account locked due to repeated failed attempts. Try later." }, { status: 429, headers: { "Retry-After": String(((lockStatus as any).retryAfter || 60)) } });
    }

    const userResult = await getUserDocumentByPhone(phone);
    if (!userResult) {
      await recordFailure("security:verify", ip, phone);
      return NextResponse.json({ error: "Invalid phone or answers." }, { status: 401 });
    }

    const userData = userResult.snap.data() || {};
    const storedQuestions = Array.isArray(userData.securityQuestions) ? userData.securityQuestions : [];
    if (storedQuestions.length !== 3) {
      await recordFailure("security:verify", ip, phone);
      return NextResponse.json({ error: "Invalid phone or answers." }, { status: 401 });
    }

    const verificationResults = await Promise.all(
      storedQuestions.map(async (item: any, index: number) => {
        const storedAnswer = String(item.answer || "");
        const providedAnswer = sanitizedAnswers[index];
        return await bcrypt.compare(providedAnswer, storedAnswer);
      })
    );

    if (verificationResults.some((result: boolean) => !result)) {
      // record persistent failure and possibly lock the account
      const failure = await recordSecurityQuestionFailure(phone);
      await recordFailure("security:verify", ip, phone);
      if (failure.locked) {
        return NextResponse.json({ error: "Account locked due to repeated failed attempts. Try later." }, { status: 429, headers: { "Retry-After": String(((failure as any).retryAfter || 60)) } });
      }
      return NextResponse.json({ error: "One or more answers are incorrect." }, { status: 401 });
    }

    // success — clear persistent counters and issue reset token out-of-band
    await resetSecurityQuestionAttempts(phone);
    await recordSuccess("security:verify", ip, phone);
    const resetToken = await createPasswordResetToken(phone);
    // send token via configured provider (sms/email). If no provider, it will be logged.
    const delivery = await sendPasswordResetToken(phone, resetToken);
    if (!delivery.ok) {
      // still do not return token; inform the caller that delivery failed and ask them to retry or contact support
      return NextResponse.json({ success: false, message: "Could not deliver reset token. Please try again later or contact support." }, { status: 500 });
    }
    return NextResponse.json({ success: true, message: "Security answers verified. A reset token was sent via " + delivery.method }, { status: 200 });
  } catch (error: any) {
    console.error("security-questions/verify error:", error);
    return NextResponse.json({ error: "Could not verify security answers." }, { status: 500 });
  }
}
