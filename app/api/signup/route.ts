import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { db, firebaseAdminInitError as rawFirebaseAdminInitError } from "../../../lib/firebaseAdmin";
import { validatePassword } from "../../../lib/passwordPolicy";
import { isValidPhoneId } from "../../../lib/phoneValidation";
import { appendNotification } from "../../../lib/notifications";
import { checkLimit, getRequestIp, recordFailure, recordSuccess } from "../../../lib/rateLimit";

const firebaseAdminInitError = rawFirebaseAdminInitError as Error | null;

export async function POST(request: Request) {
  if (firebaseAdminInitError || !db) {
    return NextResponse.json({ error: firebaseAdminInitError?.message || "Firebase Admin is not initialized." }, { status: 500 });
  }

  try {
    const body = await request.json();
    const firstName = String(body.firstName || "").trim();
    const lastName = String(body.lastName || "").trim();
    const rawPhone = String(body.phone || "").trim();
    const phone = isValidPhoneId(rawPhone) ? rawPhone : "";
    const password = String(body.password || "");
    const referralCode = String(body.referralCode || "").trim().toUpperCase();
    const ip = getRequestIp(request);

    const allowSignup = await checkLimit("auth:signup", ip, phone || undefined);
    if (!allowSignup.allowed) {
      return NextResponse.json(
        { error: "Too many signup attempts. Try again later." },
        { status: 429, headers: { "Retry-After": String(allowSignup.retryAfter) } }
      );
    }

    if (!firstName || !lastName || !phone || !password) {
      await recordFailure("auth:signup", ip, phone || undefined);
      return NextResponse.json({ error: "Please complete all required fields." }, { status: 400 });
    }

    if (firstName.length > 15 || !/^[A-Za-z]+$/.test(firstName)) {
      await recordFailure("auth:signup", ip, phone);
      return NextResponse.json({ error: "First name must be letters only and max 15 characters." }, { status: 400 });
    }

    if (lastName.length > 15 || !/^[A-Za-z]+$/.test(lastName)) {
      return NextResponse.json({ error: "Last name must be letters only and max 15 characters." }, { status: 400 });
    }

    const passCheck = validatePassword(password.trim());
    if (!passCheck.ok) {
      await recordFailure("auth:signup", ip, phone);
      return NextResponse.json({ error: passCheck.message }, { status: 400 });
    }

    if (referralCode && !/^[A-Z]{2}\d{4}$/.test(referralCode)) {
      await recordFailure("auth:signup", ip, phone);
      return NextResponse.json({ error: "Referral code must be 2 letters followed by 4 digits, e.g. AB1234." }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const bannedSnap = await db.collection("bannedUsers").doc(phone).get();
    if (bannedSnap.exists) {
      await recordFailure("auth:signup", ip, phone);
      return NextResponse.json({ error: "This phone number is banned and cannot register.", banned: true }, { status: 403 });
    }

    const existingByPhone = await db.collection("users").where("phone", "==", phone).limit(1).get();
    if (!existingByPhone.empty) {
      await recordFailure("auth:signup", ip, phone);
      return NextResponse.json({ error: "An account with this phone number already exists." }, { status: 409 });
    }

    const generateReferralCode = () => {
      const letters = Array.from({ length: 2 }, () => String.fromCharCode(65 + Math.floor(Math.random() * 26))).join("");
      const digits = String(Math.floor(1000 + Math.random() * 9000));
      return `${letters}${digits}`;
    };

    let newUserReferralCode = "";
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const candidateCode = generateReferralCode();
      const existingCode = await db.collection("users").where("referralCode", "==", candidateCode).limit(1).get();
      if (existingCode.empty) {
        newUserReferralCode = candidateCode;
        break;
      }
    }
    if (!newUserReferralCode) {
      await recordFailure("auth:signup", ip, phone);
      return NextResponse.json(
        { error: "Unable to generate a unique referral code right now. Please try again." },
        { status: 503 }
      );
    }

    const userRef = db.collection("users").doc(phone);
    let inviterQuery = referralCode
      ? db.collection("users").where("referralCode", "==", referralCode).limit(1)
      : null;
    let inviterSnapshot = inviterQuery ? await inviterQuery.get() : null;

    if (referralCode && (!inviterSnapshot || inviterSnapshot.empty)) {
      inviterQuery = db.collection("users").where("referralNumber", "==", referralCode).limit(1);
      inviterSnapshot = await inviterQuery.get();
    }

    if (referralCode && (!inviterSnapshot || inviterSnapshot.empty)) {
      return NextResponse.json({ error: "Referral code not found." }, { status: 400 });
    }

    const inviterRef = inviterSnapshot?.docs[0]?.ref || null;
    const settingsRef = db.collection("settings").doc("referralRewards");
    const settingsSnapshot = await settingsRef.get();
    const settingsData = settingsSnapshot.exists ? settingsSnapshot.data() || {} : {};
    const registrationFeeValue = Number(settingsData.registrationFee ?? 3000);

    await db.runTransaction(async (transaction: any) => {
      const existingUser = await transaction.get(userRef);
      const inviter = inviterRef ? await transaction.get(inviterRef) : null;
      if (existingUser.exists) {
        throw new Error("An account with this phone number already exists.");
      }

      if (inviterRef && (!inviter || !inviter.exists)) {
        throw new Error("Referral user no longer exists.");
      }

      transaction.set(userRef, {
        uid: phone,
        firstName,
        lastName,
        fullName: `${firstName} ${lastName}`.trim(),
        phone,
        password: passwordHash,
        selectedPlan: "",
        referralCode: newUserReferralCode,
        referralNumber: null,
        referredBy: referralCode || null,
        status: "pending",
        role: "user",
        registrationFee: registrationFeeValue,
        walletBalance: 0,
        totalEarned: 0,
        totalWithdrawn: 0,
        successfulReferrals: 0,
        profileImage: "",
        notifications: [],
        createdAt: new Date(),
        approvedAt: null,
        lastLogin: null,
      });

      if (inviterRef && inviter) {
        await appendNotification(inviterRef, {
          type: "referral",
          message: `${firstName} ${lastName} joined using your referral number. Their account is pending approval.`,
          createdAt: new Date(),
          read: false,
        }, 100, transaction);
      }
    });

    await recordSuccess("auth:signup", ip, phone);
    return NextResponse.json({ success: true, phone });
  } catch (error: any) {
    console.error("signup error:", error);
    await recordFailure("auth:signup", getRequestIp(request), "");
    return NextResponse.json({ error: "Something went wrong, please try again." }, { status: 500 });
  }
}
