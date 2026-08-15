import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { db, firebaseAdminInitError, getUserDocumentByPhone } from "../../../lib/firebaseAdmin";
import { assertValidPhoneId } from "../../../lib/phoneValidation";

const SECURITY_QUESTIONS = [
  "what is you favorite phone number",
  "what is your favorite 4 digit number",
  "what is your other favorite phone number",
];

export async function POST(request: Request) {
  if (firebaseAdminInitError) {
    console.error("Firebase Admin init error:", firebaseAdminInitError);
    return NextResponse.json({ error: "Firestore admin is not initialized." }, { status: 500 });
  }

  if (!db) {
    return NextResponse.json({ error: "Firestore admin is not initialized." }, { status: 500 });
  }

  const body = await request.json();
  let phone = String(body.phone || "").trim();
  const answerOne = String(body.answerOne || "").trim();
  const answerTwo = String(body.answerTwo || "").trim();
  const answerThree = String(body.answerThree || "").trim();
  const currentPassword = String(body.currentPassword || "").trim();

  if (!phone || !answerOne || !answerTwo || !answerThree || !currentPassword) {
    return NextResponse.json({ error: "All answers and current password are required." }, { status: 400 });
  }

  try {
    phone = assertValidPhoneId(phone);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Invalid phone number." }, { status: 400 });
  }

  // Validate formats: answerOne and answerThree should be 10-digit phone numbers, answerTwo is 4 digits
  if (!/^\d{10}$/.test(answerOne)) {
    return NextResponse.json({ error: "Favorite phone number must be exactly 10 digits." }, { status: 400 });
  }

  if (!/^\d{4}$/.test(answerTwo)) {
    return NextResponse.json({ error: "Favorite 4-digit number must be exactly 4 digits." }, { status: 400 });
  }

  if (!/^\d{10}$/.test(answerThree)) {
    return NextResponse.json({ error: "Other favorite phone number must be exactly 10 digits." }, { status: 400 });
  }

  // Ensure answers are distinct
  const normalizedAnswers = [answerOne, answerTwo, answerThree].map((a) => a.trim());
  const uniqueCount = new Set(normalizedAnswers).size;
  if (uniqueCount !== 3) {
    return NextResponse.json({ error: "Security answers must be different from each other." }, { status: 400 });
  }

  // Do not allow user to set their account phone number as one of the favorite phone answers
  if (answerOne === phone || answerThree === phone) {
    return NextResponse.json({ error: "Security answers cannot be your account phone number." }, { status: 400 });
  }

  try {
    const userResult = await getUserDocumentByPhone(phone);
    if (!userResult) {
      return NextResponse.json({ error: "Invalid phone or credentials." }, { status: 401 });
    }
    const userRef = userResult.ref;

    const user = userResult.snap.data() || {};
    const storedPassword = String(user.password || "");
    const isHashed = /^\$2[aby]\$/.test(storedPassword);

    if (!storedPassword || !isHashed) {
      return NextResponse.json({ error: "Invalid phone or credentials." }, { status: 401 });
    }

    const passwordMatches = await bcrypt.compare(currentPassword, storedPassword);

    if (!passwordMatches) {
      return NextResponse.json({ error: "Invalid phone or credentials." }, { status: 401 });
    }

    await userRef.update({
        securityQuestions: [
        { question: SECURITY_QUESTIONS[0], answer: await bcrypt.hash(answerOne, 10) },
        { question: SECURITY_QUESTIONS[1], answer: await bcrypt.hash(answerTwo, 10) },
        { question: SECURITY_QUESTIONS[2], answer: await bcrypt.hash(answerThree, 10) },
      ],
      updatedAt: new Date(),
    });

    return NextResponse.json({ message: "Security questions saved successfully.", securityQuestionsExist: true });
  } catch (error: any) {
    console.error("security-questions save error:", error);
    return NextResponse.json({ error: "Could not save security questions." }, { status: 500 });
  }
}
