import { NextResponse } from "next/server";
import { providerStatus } from "../../../lib/providers";

export async function GET() {
  return NextResponse.json({
    ok: true,
    providers: providerStatus(),
    note: "Configuration is intentionally false until real credentials and external account checks are completed."
  });
}
