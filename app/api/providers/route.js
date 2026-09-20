import { NextResponse } from "next/server";
import { providerCapabilities, providerStatus } from "../../../lib/providers";

export async function GET() {
  return NextResponse.json({
    ok: true,
    capabilities: providerCapabilities,
    providers: providerStatus(),
    note: "Credentials alone do not make a provider production-ready; each connector requires its own verification and end-to-end test."
  });
}
