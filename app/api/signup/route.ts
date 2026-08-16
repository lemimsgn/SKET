import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { db, firebaseAdminInitError as rawFirebaseAdminInitError } from "../../../lib/firebaseAdmin";

const firebaseAdminInitError = rawFirebaseAdminInitError as Error | null;

export async function POST(request: Request) {
  if (firebaseAdminInitError || !db) {
    return NextResponse.json({ error: firebaseAdminInitError?.message || "Firebase Admin is not initialized." }, { status: 500 });
  }

  if (!db) {
    return NextResponse.json({ error: "Firebase Admin is not initialized." }, { status: 500 });
  }

  try {
    const body = await request.json();
    const firstName = String(body.firstName || "").trim();
    const lastName = String(body.lastName || "").trim();
    const phone = String(body.phone || "").trim();
    const password = String(body.password || "");
    const referralCode = String(body.referralCode || "").trim().toUpperCase();

    if (!firstName || !lastName || !phone || !password) {
      return NextResponse.json({ error: "Please complete all required fields." }, { status: 400 });
    }

    if (firstName.length > 15 || !/^[A-Za-z]+$/.test(firstName)) {
      return NextResponse.json({ error: "First name must be letters only and max 15 characters." }, { status: 400 });
    }

    if (lastName.length > 15 || !/^[A-Za-z]+$/.test(lastName)) {
      return NextResponse.json({ error: "Last name must be letters only and max 15 characters." }, { status: 400 });
    }

    if (!/^(09|07)\d{8}$/.test(phone)) {
      return NextResponse.json({ error: "Phone number must start with 09 or 07 and be exactly 10 digits." }, { status: 400 });
    }

    if (!/^\d{6,}$/.test(password.trim())) {
      return NextResponse.json({ error: "Password must be at least 6 digits." }, { status: 400 });
    }

    if (referralCode && !/^[A-Z]{2}\d{4}$/.test(referralCode)) {
      return NextResponse.json({ error: "Referral code must be 2 letters followed by 4 digits, e.g. AB1234." }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const bannedSnap = await db.collection("bannedUsers").doc(phone).get();
    if (bannedSnap.exists) {
      return NextResponse.json({ error: "This phone number is banned and cannot register.", banned: true }, { status: 403 });
    }

    const generateReferralCode = () => {
      const letters = Array.from({ length: 2 }, () => String.fromCharCode(65 + Math.floor(Math.random() * 26))).join("");
      const digits = String(Math.floor(1000 + Math.random() * 9000));
      return `${letters}${digits}`;
    };

    let newUserReferralCode = generateReferralCode();
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const existing = await db.collection("users").where("referralCode", "==", newUserReferralCode).limit(1).get();
      if (existing.empty) break;
      newUserReferralCode = generateReferralCode();
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
    const registrationFeeValue = Number(settingsData.registrationFee ?? 1000);

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
        const inviterData = inviter.data() || {};
        const notifications = Array.isArray(inviterData.notifications) ? inviterData.notifications : [];
        transaction.update(inviterRef, {
          notifications: [
            ...notifications,
            {
              type: "referral",
              message: `${firstName} ${lastName} joined using your referral number. Their account is pending approval.`,
              createdAt: new Date(),
              read: false,
            },
          ],
        });
      }
    });

    return NextResponse.json({ success: true, phone });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || String(error) }, { status: 500 });
  }
}
