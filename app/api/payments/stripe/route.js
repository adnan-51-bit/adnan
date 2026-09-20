import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST() {
  return NextResponse.json({
    ok: false,
    configured: false,
    error: "Stripe production webhook is not enabled yet.",
    reason: "The endpoint intentionally refuses to process payments until official Stripe signature verification and persistent storage are implemented."
  }, { status: 503 });
}
