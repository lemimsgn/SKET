import { NextResponse } from "next/server";
import { randomInt } from "crypto";
import { requireAdminAuth } from "../../../../lib/adminAuth";
import { db, firebaseAdminInitError as rawFirebaseAdminInitError } from "../../../../lib/firebaseAdmin";
import { appendNotification } from "../../../../lib/notifications";

const firebaseAdminInitError = rawFirebaseAdminInitError as Error | null;

async function createReferralCode() {
  if (!db) {
    throw new Error("Firebase Admin is not initialized.");
  }

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const letters = Array.from({ length: 2 }, () => String.fromCharCode(65 + Math.floor(Math.random() * 26))).join("");
    const digits = String(Math.floor(1000 + Math.random() * 9000));
    const referralCode = `${letters}${digits}`;
    const existing = await db.collection("users").where("referralCode", "==", referralCode).limit(1).get();
    if (existing.empty) {
      return referralCode;
    }
  }

  throw new Error("Could not create a unique referral code. Please try again.");
}

async function applyReferralReward(userId: string, referredBy: string) {
  if (!db || !referredBy) {
    return null;
  }

  const referralByCodeSnapshot = await db.collection("users").where("referralCode", "==", referredBy).limit(1).get();
  let inviterDoc = !referralByCodeSnapshot.empty ? referralByCodeSnapshot.docs[0] : null;

  if (!inviterDoc) {
    const referralByNumberSnapshot = await db.collection("users").where("referralNumber", "==", referredBy).limit(1).get();
    inviterDoc = !referralByNumberSnapshot.empty ? referralByNumberSnapshot.docs[0] : null;
  }

  if (!inviterDoc || inviterDoc.id === userId) {
    return null;
  }

  const inviterRef = inviterDoc.ref;
  const invitedUserRef = db.collection("users").doc(userId);
  const rewardSettingsRef = db.collection("settings").doc("referralRewards");
  const transactionRef = db.collection("walletTransactions").doc();

  return db.runTransaction(async (transaction: any) => {
    const [invitedUserSnapshot, inviterSnapshot, rewardSettingsSnapshot] = await Promise.all([
      transaction.get(invitedUserRef),
      transaction.get(inviterRef),
      transaction.get(rewardSettingsRef),
    ]);

    if (!invitedUserSnapshot.exists || !inviterSnapshot.exists) {
      return null;
    }

    const invitedUser = invitedUserSnapshot.data() || {};
    const inviter = inviterSnapshot.data() || {};
    const rewardSettings = rewardSettingsSnapshot.exists ? rewardSettingsSnapshot.data() || {} : {};
    if (invitedUser.referralRewardPaidAt || invitedUser.status !== "pending") {
      return null;
    }

    const successfulReferrals = Number(inviter.successfulReferrals || 0);
    const firstTwoReward = Number(rewardSettings.firstTwoInvites ?? 1500);
    const laterInviteReward = Number(rewardSettings.thirdAndLaterInvites ?? 1000);
    if (!Number.isFinite(firstTwoReward) || !Number.isFinite(laterInviteReward) || firstTwoReward < 0 || laterInviteReward < 0) {
      throw new Error("Invalid referral reward settings in Firestore.");
    }
    if (!rewardSettingsSnapshot.exists) {
      transaction.set(rewardSettingsRef, {
        firstTwoInvites: firstTwoReward,
        thirdAndLaterInvites: laterInviteReward,
        updatedAt: new Date(),
      });
    }
    const reward = successfulReferrals < 2 ? firstTwoReward : laterInviteReward;
    const walletBalance = Number(inviter.walletBalance || 0) + reward;
    const totalEarned = Number(inviter.totalEarned || 0) + reward;

    await appendNotification(inviterRef, {
      type: "referral",
      message: `user ${invitedUser.fullName || invitedUser.phone || userId} is approved. your account is credited with ETB ${reward}`,
      createdAt: new Date(),
      read: false,
    }, 100, transaction);

    transaction.update(inviterRef, {
      walletBalance,
      totalEarned,
      successfulReferrals: successfulReferrals + 1,
    });
    transaction.set(transactionRef, {
      userId: inviterRef.id,
      type: "Referral Reward",
      amount: reward,
      balanceAfter: walletBalance,
      referenceId: userId,
      createdAt: new Date(),
      note: `Referral reward for inviting ${invitedUser.fullName || invitedUser.phone || userId}`,
    });
    transaction.update(invitedUserRef, { referralRewardPaidAt: new Date() });

    return { reward, successfulReferrals: successfulReferrals + 1 };
  });
}

export async function POST(request: Request) {
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
    const body = await request.json();
    const { id, status } = body as { id?: string; status?: string };

    if (!id || !status || !["approved", "rejected"].includes(status)) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const ref = db.collection("users").doc(id);
    const currentUser = await ref.get();
    if (!currentUser.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const currentData = currentUser.data() || {};
    const existingReferralCode = String(currentData.referralCode || "").trim().toUpperCase();
    const referralCode =
      status === "approved"
        ? /^[A-Z]{2}\d{4}$/.test(existingReferralCode)
          ? existingReferralCode
          : await createReferralCode()
        : existingReferralCode || null;

    const referralReward =
      status === "approved" ? await applyReferralReward(id, String(currentData.referredBy || currentData.referralCode || currentData.referralNumber || "")) : null;

    await db.runTransaction(async (transaction: any) => {
      await appendNotification(ref, {
        type: "registration",
        message: status === "approved" ? "Your registration has been approved." : "Your registration was rejected.",
        createdAt: new Date(),
        read: false,
      }, 100, transaction);
      transaction.update(ref, {
        status,
        approvedAt: status === "approved" ? new Date() : null,
        referralCode,
      });
    });

    return NextResponse.json({ success: true, referralCode, referralNumber: referralCode, referralReward });
  } catch (error: any) {
    console.error("admin/user-status error:", error);
    return NextResponse.json({ error: "Something went wrong, please try again." }, { status: 500 });
  }
}
