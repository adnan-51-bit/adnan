import { NextResponse } from "next/server";
import { listBusinesses, updateBusiness, storageMode } from "../../../../lib/master-store";
import { checkAdminSecret } from "../../../../lib/auth.js";
import { fetchWerknetz24Kalender, createWerknetz24KalenderTermin, fetchWerknetz24Aufgaben, fetchWerknetz24Rechnungen } from "../../../../lib/werknetz24-connector.js";

export const runtime = "nodejs";

export async function GET(request){
  try{
    const params = new URL(request.url).searchParams;
    // Werknetz24-Kalender (22.09.2026, "Kommandozentrale"-Folgeauftrag) - eigener Zweig statt
    // neuer Route-Datei (12/12 Serverless-Funktionen bereits belegt, s. PROJECT-AUDIT.md im
    // Schwester-Repo). Bewusst hier statt in lib/master-store.js, da es kein lokaler
    // Betriebs-Datensatz ist, sondern ein Live-Proxy zu einem fremden System.
    if (params.get("werknetz24Kalender")) {
      const kalender = await fetchWerknetz24Kalender();
      return NextResponse.json({ ok: true, kalender });
    }
    if (params.get("werknetz24Aufgaben")) {
      const aufgaben = await fetchWerknetz24Aufgaben();
      return NextResponse.json({ ok: true, aufgaben });
    }
    if (params.get("werknetz24Rechnungen")) {
      const rechnungen = await fetchWerknetz24Rechnungen();
      return NextResponse.json({ ok: true, rechnungen });
    }
    const id = params.get("id");
    const businesses = await listBusinesses();
    if (id) {
      const business = businesses.find(b => b.id === id);
      if (!business) return NextResponse.json({ok:false,error:"Business nicht gefunden"},{status:404});
      return NextResponse.json({ok:true,storage:storageMode(),business});
    }
    return NextResponse.json({ok:true,storage:storageMode(),businesses});
  }catch(error){
    return NextResponse.json({ok:false,error:error.message},{status:500});
  }
}

// Termin bei Werknetz24 anlegen - eigener POST-Zweig (Route hatte vorher nur GET/PATCH), durch
// MASTER_API_SECRET geschuetzt wie jeder andere Schreibzugriff in dieser API. Leitet intern an
// createWerknetz24KalenderTermin() weiter, das seinerseits das separate WERKNETZ24_WRITE_SECRET
// gegenueber Werknetz24 verwendet - zwei unabhaengige Schutzschichten (wer die Master-Zentrale
// bedienen darf, und ob Werknetz24 den Schreibzugriff ueberhaupt zulaesst).
export async function POST(request){
  const authError = checkAdminSecret(request);
  if (authError) return NextResponse.json({ ok: false, error: authError.error }, { status: authError.status });
  try{
    const body = await request.json();
    if (body?.action !== "werknetz24-kalender-termin") {
      return NextResponse.json({ ok: false, error: "Unbekannte oder fehlende action" }, { status: 400 });
    }
    const { summary, description, startISO, endISO } = body;
    const result = await createWerknetz24KalenderTermin({ summary, description, startISO, endISO });
    if (!result.configured) return NextResponse.json({ ok: false, error: result.reason }, { status: 503 });
    if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: 502 });
    return NextResponse.json({ ok: true, termin: result.termin }, { status: 201 });
  }catch(error){
    return NextResponse.json({ok:false,error:error.message},{status:500});
  }
}

export async function PATCH(request){
  const authError = checkAdminSecret(request);
  if (authError) return NextResponse.json({ ok: false, error: authError.error }, { status: authError.status });
  try{
    const body=await request.json();
    if(!body?.id) return NextResponse.json({ok:false,error:"id is required"},{status:400});
    const {id,...patch}=body;
    const allowed=["name","type","status","health","revenue","link","modules"];
    const clean=Object.fromEntries(Object.entries(patch).filter(([key])=>allowed.includes(key)));
    return NextResponse.json({ok:true,storage:storageMode(),business:await updateBusiness(id,clean)});
  }catch(error){
    return NextResponse.json({ok:false,error:error.message},{status:500});
  }
}
