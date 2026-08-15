import { NextResponse } from "next/server";

export async function POST() {
  try {
    const cookieValue =
      `sket-session=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0` +
      (process.env.NODE_ENV === "production" ? "; Secure" : "");

    return NextResponse.json({ success: true }, { headers: { "Set-Cookie": cookieValue } });
  } catch (err: any) {
    console.error("logout error:", err);
    const cookieValue = `sket-session=; Path=/; Max-Age=0`;
    return NextResponse.json({ success: true }, { headers: { "Set-Cookie": cookieValue } });
  }
}
