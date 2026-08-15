import { NextResponse } from "next/server";
import { db, firebaseAdminInitError as rawFirebaseAdminInitError } from "../../../../lib/firebaseAdmin";

const firebaseAdminInitError = rawFirebaseAdminInitError as Error | null;

export async function GET(request: Request) {
  if (firebaseAdminInitError || !db) {
    return NextResponse.json({ inviter: null }, { status: 500, headers: { "Cache-Control": "public, max-age=5" } });
  }

  try {
    const { searchParams } = new URL(request.url);
    const referralCode = (searchParams.get("referralCode") || searchParams.get("referralNumber") || "").trim();
    if (!referralCode) {
      return NextResponse.json({ inviter: null }, { status: 400, headers: { "Cache-Control": "public, max-age=5" } });
    }

    // Try lookup by referralNumber first, then referralCode
    let snap = await db.collection("users").where("referralNumber", "==", referralCode).limit(1).select("firstName", "lastName", "phone", "status", "createdAt").get();
    if (snap.empty) {
      snap = await db.collection("users").where("referralCode", "==", referralCode).limit(1).select("firstName", "lastName", "phone", "status", "createdAt").get();
    }

    if (snap.empty) {
      return NextResponse.json({ inviter: null }, { headers: { "Cache-Control": "public, max-age=30, s-maxage=60" } });
    }

    const doc = snap.docs[0];
    const d = doc.data() || {};
    const inviter = {
      id: doc.id,
      firstName: d.firstName || "",
      lastName: d.lastName || "",
      phone: d.phone || "",
      status: d.status || "pending",
      createdAt: d.createdAt || null,
    };

    return NextResponse.json({ inviter }, { headers: { "Cache-Control": "public, max-age=30, s-maxage=60" } });
  } catch (err: any) {
    console.error("referrals/lookup error:", err);
    return NextResponse.json({ inviter: null }, { status: 500, headers: { "Cache-Control": "public, max-age=5" } });
  }
}
