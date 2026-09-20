import { listSystems } from "@/lib/master-systems.js";
import { runStaticQualityGate } from "@/lib/quality-gate.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const { storage, systems } = await listSystems();
    const gate = runStaticQualityGate({ storage, systems });
    return Response.json({
      ok: true,
      service: "master-zentrale",
      environment: process.env.NODE_ENV || "unknown",
      timestamp: new Date().toISOString(),
      checks: {
        application: "ok",
        persistence: storage,
        payments: systems.find(s => s.id === "stripe")?.status || "unknown",
        suppliers: systems.find(s => s.id === "shopify")?.status || "unknown",
        notifications: systems.find(s => s.id === "email")?.status || "unknown",
        quality_gate: gate.productionReady ? "ready" : "blocked"
      }
    });
  } catch (error) {
    return Response.json({
      ok: false,
      service: "master-zentrale",
      environment: process.env.NODE_ENV || "unknown",
      timestamp: new Date().toISOString(),
      error: error?.message || "Health check failed"
    }, { status: 503 });
  }
}
