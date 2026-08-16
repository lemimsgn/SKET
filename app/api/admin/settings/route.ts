import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "../../../../lib/adminAuth";
import { db, firebaseAdminInitError as rawFirebaseAdminInitError } from "../../../../lib/firebaseAdmin";

const firebaseAdminInitError = rawFirebaseAdminInitError as Error | null;
const SETTINGS_DOC = "referralRewards";
const MAX_REGISTRATION_FEE = 20000;
const MAX_REFERRAL_REWARD = 10000;
const MIN_REWARD = 0;

export async function GET(request: Request) {
  const authResponse = await requireAdminAuth(request);
  if (authResponse) {
    return authResponse;
  }
  if (firebaseAdminInitError || !db) {
    return NextResponse.json({ error: firebaseAdminInitError?.message || "Firebase Admin is not initialized." }, { status: 500 });
  }

  try {
    const settingsDoc = await db.collection("settings").doc(SETTINGS_DOC).get();
    const data = settingsDoc.exists ? settingsDoc.data() : null;

    return NextResponse.json({
      registrationFee: data?.registrationFee ?? 3000,
      accountNumber: data?.accountNumber || "1000686058477",
      registrationTelegramLink: data?.registrationTelegramLink || "https://t.me/leonmsgn",
      forgotPasswordTelegramLink: data?.forgotPasswordTelegramLink || "https://t.me/leonmsgn",
      firstTwoInvites: data?.firstTwoInvites ?? 1500,
      thirdAndLaterInvites: data?.thirdAndLaterInvites ?? 1000,
    });
  } catch (error) {
    return NextResponse.json({ error: "Connection error. Please try again later." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const authResponse = await requireAdminAuth(request);
  if (authResponse) {
    return authResponse;
  }
  if (firebaseAdminInitError || !db) {
    return NextResponse.json({ error: firebaseAdminInitError?.message || "Firebase Admin is not initialized." }, { status: 500 });
  }

  try {
    const body = await request.json();
    const registrationFee = Number(body.registrationFee ?? 3000);
    const accountNumber = String(body.accountNumber ?? "").trim();
    let registrationTelegramLink = String(body.registrationTelegramLink ?? "").trim();
    let forgotPasswordTelegramLink = String(body.forgotPasswordTelegramLink ?? "").trim();
    const firstTwoInvites = Number(body.firstTwoInvites ?? 1500);
    const thirdAndLaterInvites = Number(body.thirdAndLaterInvites ?? 1000);

    if (Number.isNaN(registrationFee) || Number.isNaN(firstTwoInvites) || Number.isNaN(thirdAndLaterInvites)) {
      return NextResponse.json({ error: "Invalid numerical values provided." }, { status: 400 });
    }
    if (
      !Number.isInteger(registrationFee) ||
      registrationFee < MIN_REWARD ||
      registrationFee > MAX_REGISTRATION_FEE ||
      !Number.isInteger(firstTwoInvites) ||
      firstTwoInvites < MIN_REWARD ||
      firstTwoInvites > MAX_REFERRAL_REWARD ||
      !Number.isInteger(thirdAndLaterInvites) ||
      thirdAndLaterInvites < MIN_REWARD ||
      thirdAndLaterInvites > MAX_REFERRAL_REWARD
    ) {
      return NextResponse.json({ error: `Numeric values must be integers between ${MIN_REWARD} and ${MAX_REGISTRATION_FEE} for registration fee, and between ${MIN_REWARD} and ${MAX_REFERRAL_REWARD} for invite rewards.` }, { status: 400 });
    }
    if (firstTwoInvites < thirdAndLaterInvites) {
      return NextResponse.json({ error: "First two invites reward must be equal to or greater than third and later invites reward." }, { status: 400 });
    }

    if (accountNumber && !/^\d{13}$/.test(accountNumber)) {
      return NextResponse.json({ error: "Account number must be exactly 13 digits." }, { status: 400 });
    }

    if (registrationTelegramLink && !/^https?:\/\//i.test(registrationTelegramLink)) {
      registrationTelegramLink = `https://${registrationTelegramLink}`;
    }
    if (forgotPasswordTelegramLink && !/^https?:\/\//i.test(forgotPasswordTelegramLink)) {
      forgotPasswordTelegramLink = `https://${forgotPasswordTelegramLink}`;
    }

    await db.collection("settings").doc(SETTINGS_DOC).set(
      {
        registrationFee,
        accountNumber: accountNumber || "1000686058477",
        registrationTelegramLink: registrationTelegramLink || "https://t.me/leonmsgn",
        forgotPasswordTelegramLink: forgotPasswordTelegramLink || "https://t.me/leonmsgn",
        firstTwoInvites,
        thirdAndLaterInvites,
      },
      { merge: true }
    );

    const pendingUsers = await db.collection("users").where("status", "==", "pending").get();
    if (!pendingUsers.empty) {
      const batch = db.batch();
      pendingUsers.docs.forEach((pendingDoc) => {
        batch.update(pendingDoc.ref, {
          registrationFee,
          registrationAccountNumber: accountNumber || "1000686058477",
          registrationTelegramLink: registrationTelegramLink || "https://t.me/leonmsgn",
        });
      });
      await batch.commit();
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Connection error. Please try again later." }, { status: 500 });
  }
}
