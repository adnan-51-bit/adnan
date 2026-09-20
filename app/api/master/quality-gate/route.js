import { listSystems } from "@/lib/master-systems.js";
import { runStaticQualityGate } from "@/lib/quality-gate.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const { storage, systems } = await listSystems();
    const gate = runStaticQualityGate({ storage, systems });
    return Response.json({ ok: true, ...gate }, { status: gate.productionReady ? 200 : 503 });
  } catch (error) {
    return Response.json({
      ok: false,
      productionReady: false,
      checkedAt: new Date().toISOString(),
      error: error?.message || "Quality Gate konnte nicht ausgeführt werden"
    }, { status: 503 });
  }
}
