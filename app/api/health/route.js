import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "master-zentrale",
    environment: process.env.NODE_ENV || "unknown",
    timestamp: new Date().toISOString(),
    checks: { application: "ok", persistence: "not_configured", payments: "not_connected", suppliers: "not_connected", notifications: "not_connected" }
  });
}
