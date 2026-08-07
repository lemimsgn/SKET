
import { NextResponse } from "next/server";
import { db, firebaseAdminInitError as rawFirebaseAdminInitError } from "../../../lib/firebaseAdmin";
import { requireUserAuth } from "../../../lib/userAuth";
import { isValidPhoneId } from "../../../lib/phoneValidation";

const firebaseAdminInitError = rawFirebaseAdminInitError as Error | null;

export async function GET(request: Request) {
  if (firebaseAdminInitError || !db) {
    return NextResponse.json({ invites: [] }, { headers: { "Cache-Control": "public, max-age=5" } });
  }

  try {
    const { searchParams } = new URL(request.url);
    const referralCode = searchParams.get("referralCode") || searchParams.get("referralNumber");
    let phoneNumber = searchParams.get("phone")?.trim();
    const rawLimit = Number(searchParams.get("limit") || "20");
    const limit = Math.min(Math.max(Number.isFinite(rawLimit) ? rawLimit : 20, 1), 50);

    const allInvites: any[] = [];
    let inviter: any = null;

    // require authenticated caller and ensure they are requesting their own data
    const auth = await requireUserAuth(request as any);
    if (!auth.ok) return auth.response;
    const callerPhone = auth.phone || auth.uid;

    if (!callerPhone || !isValidPhoneId(String(callerPhone))) {
      return NextResponse.json({ error: "Authenticated phone number is invalid." }, { status: 401 });
    }

    if (!phoneNumber) {
      phoneNumber = String(callerPhone);
    }

    if (phoneNumber !== String(callerPhone)) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    if (referralCode) {
      // ensure the referralCode belongs to caller
      if (!isValidPhoneId(callerPhone)) {
        return NextResponse.json({ error: "Forbidden." }, { status: 403 });
      }
      const meSnap = await db.collection("users").doc(String(callerPhone)).get();
      if (!meSnap.exists) return NextResponse.json({ error: "User not found." }, { status: 404 });
      const me = meSnap.data() || {};
      const myReferralNumber = String(me.referralNumber || "");
      const myReferralCode = String(me.referralCode || "");
      if (String(referralCode) !== myReferralNumber && String(referralCode) !== myReferralCode) {
        return NextResponse.json({ error: "Forbidden." }, { status: 403 });
      }
    }

    // Helper to map doc to lightweight invite
    const mapDoc = (doc: any) => {
      const d = doc.data();
      return {
        id: doc.id,
        firstName: d.firstName || "",
        lastName: d.lastName || "",
        fullName: d.fullName || `${d.firstName || ""} ${d.lastName || ""}`.trim(),
        phone: d.phone || "",
        status: d.status || "pending",
        createdAt: d.createdAt || null,
      };
    };

    // Query 1: Find the owner of the referral code by referralNumber or referralCode
    if (referralCode) {
      try {
        let snapshot1 = await db
          .collection("users")
          .where("referralNumber", "==", referralCode)
          .limit(1)
          .select("firstName", "lastName", "phone", "status", "createdAt")
          .get();

        if (snapshot1.empty) {
          snapshot1 = await db
            .collection("users")
            .where("referralCode", "==", referralCode)
            .limit(1)
            .select("firstName", "lastName", "phone", "status", "createdAt")
            .get();
        }

        if (!snapshot1.empty) {
          const doc = snapshot1.docs[0];
          inviter = mapDoc(doc);
        }
      } catch (err) {
        console.error("Query 1 error:", err);
      }
    }

    // Query 2: Find users who were referred by the given referral code
    if (referralCode) {
      try {
        const referralFieldQueries = [
          db.collection("users").where("referredBy", "==", referralCode),
          db.collection("users").where("referralCode", "==", referralCode),
        ];

        for (const query of referralFieldQueries) {
          const snapshot2 = await query
            .limit(limit)
            .select("firstName", "lastName", "phone", "status", "createdAt")
            .get();

          snapshot2.docs.forEach((doc) => {
            if (inviter && doc.id === inviter.id) {
              return;
            }
            if (!allInvites.find((i) => i.id === doc.id)) {
              allInvites.push(mapDoc(doc));
            }
          });
        }
      } catch (err) {
        console.error("Query 2 error:", err);
      }
    }

    // Query 3: Find users with referredBy or referralCode matching the phone number
    if (phoneNumber) {
      try {
        const phoneFieldQueries = [
          db.collection("users").where("referredBy", "==", phoneNumber),
          db.collection("users").where("referralCode", "==", phoneNumber),
        ];

        for (const query of phoneFieldQueries) {
          const snapshot3 = await query
            .limit(limit)
            .select("firstName", "lastName", "phone", "status", "createdAt")
            .get();

          snapshot3.docs.forEach((doc) => {
            if (!allInvites.find((i) => i.id === doc.id)) {
              allInvites.push(mapDoc(doc));
            }
          });
        }
      } catch (err) {
        console.error("Query 3 error:", err);
      }
    }

    const sortedInvites = allInvites.slice().sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt.toDate ? a.createdAt.toDate() : a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt.toDate ? b.createdAt.toDate() : b.createdAt).getTime() : 0;
      return bTime - aTime;
    });

    return NextResponse.json(
      { invites: sortedInvites, inviter },
      { headers: { "Cache-Control": "public, max-age=30, s-maxage=60, stale-while-revalidate=120" } }
    );
  } catch (error: any) {
    console.error("Referral invites error:", error);
    return NextResponse.json({ invites: [] }, { headers: { "Cache-Control": "public, max-age=5" } });
  }
}
