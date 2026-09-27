import { NextResponse } from "next/server";
import { listBusinesses, updateBusiness, storageMode } from "../../../../lib/master-store";
import { checkAdminSecret } from "../../../../lib/auth.js";
import { listEinnahmequellen, createEinnahmequelle, updateEinnahmequelle, setzeEqStatus, uebersicht, kundeZuordnen, aufgabeErzeugen, starteEinnahmequelle, stoppeEinnahmequelle, aufgabenVon, verlaufVon, quelleHinzufuegen, planHinzufuegen, entwurfErzeugen, leadHinzufuegen, leadStatus, aufgabenAusSchritten } from "../../../../lib/einnahmequellen.js";
import { fetchWerknetz24Kalender, createWerknetz24KalenderTermin, fetchWerknetz24Aufgaben, fetchWerknetz24Rechnungen, fetchWerknetz24Incidents, fetchWerknetz24Agenten, runWerknetz24Systemcheck, closeWerknetz24Incident } from "../../../../lib/werknetz24-connector.js";

import { AKTIONEN } from "../../../../lib/aktionen.js";
import { fuehreAktionAus, listeLaeufe, ladeTagesbericht } from "../../../../lib/aktion-ausfuehren.js";
import { eqReport } from "../../../../lib/eq-automation.js";
import { listTasks } from "../../../../lib/master-tasks.js";

export const runtime = "nodejs";

export async function GET(request){
  try{
    const params = new URL(request.url).searchParams;
    // Full-System-Audit 26.09.2026 (Fund 🔴): die Werknetz24-GET-Zweige waren ohne Anmeldung
    // abrufbar - jeder mit der URL bekam echte Werknetz24-Aufgaben, Rechnungen, Incidents und
    // Kalendertermine; das WERKNETZ24_STATUS_SECRET war durch diesen offenen Proxy wirkungslos.
    // Werknetz24-Daten (inkl. aggregiertem liveStatus) gibt es jetzt nur mit MASTER_API_SECRET,
    // die restliche Betriebsliste bleibt wie bisher ohne Anmeldung lesbar.
    const authError = await checkAdminSecret(request);
    const werknetz24Detail = ["werknetz24Kalender", "werknetz24Aufgaben", "werknetz24Rechnungen", "werknetz24Incidents", "werknetz24Agenten"].some(k => params.get(k));
    if (werknetz24Detail && authError) {
      return NextResponse.json({ ok: false, error: authError.error }, { status: authError.status });
    }
    // Einnahmequellen (27.09.2026): eigener Bereich, nur mit Secret. Hier statt eigener Route (Vercel-Limit 12 Funktionen).
    // Taeglicher Vercel-Cron (vercel.json, kostenlos): wiederkehrende Pruefungen. Nur lesende Pruefungen +
    // Protokoll, keine Kosten, keine Daten nach aussen. Schutz: CRON_SECRET (falls gesetzt) und hoechstens
    // ein Lauf pro Stunde; die Antwort enthaelt nur Zaehlwerte.
    if (params.get("cron") === "wiederkehrend") {
      if (process.env.CRON_SECRET && request.headers.get("authorization") !== "Bearer " + process.env.CRON_SECRET) return NextResponse.json({ ok: false, error: "nicht berechtigt" }, { status: 401 });
      const letzter = (await listeLaeufe(200)).find(l => l.details?.aktion === "wiederkehrende-pruefungen");
      if (letzter && Date.now() - Date.parse(letzter.created_at) < 3600000) return NextResponse.json({ ok: false, error: "Letzter Lauf ist weniger als eine Stunde her" }, { status: 429 });
      const e = await fuehreAktionAus("wiederkehrende-pruefungen");
      return NextResponse.json({ ok: Boolean(e.ok), gelaufen: true });
    }
    // Einnahmequellen-Report (Text) nur mit Secret.
    if (params.get("eqreport")) {
      if (authError) return NextResponse.json({ ok: false, error: authError.error }, { status: authError.status });
      return NextResponse.json({ ok: true, report: eqReport(await listEinnahmequellen(), await listTasks()) });
    }
    // Steuerung (27.09.2026): Aktionskatalog + Automatisierungs-Log, Tagesbericht - nur mit Secret.
    if (params.get("aktionen") || params.get("tagesbericht")) {
      if (authError) return NextResponse.json({ ok: false, error: authError.error }, { status: authError.status });
      if (params.get("tagesbericht")) return NextResponse.json({ ok: true, bericht: await ladeTagesbericht() });
      return NextResponse.json({ ok: true, aktionen: AKTIONEN, laeufe: await listeLaeufe() });
    }
    if (params.get("einnahmequellen")) {
      if (authError) return NextResponse.json({ ok: false, error: authError.error }, { status: authError.status });
      // Details einer Einnahmequelle: ihre Aufgaben (aus der zentralen Liste) + Aktivitaetsverlauf.
      const eqId = params.get("id");
      if (eqId) return NextResponse.json({ ok: true, aufgaben: await aufgabenVon(eqId), verlauf: await verlaufVon(eqId) });
      const liste = await listEinnahmequellen();
      return NextResponse.json({ ok: true, einnahmequellen: liste, uebersicht: uebersicht(liste) });
    }
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
    if (params.get("werknetz24Incidents")) {
      const incidents = await fetchWerknetz24Incidents();
      return NextResponse.json({ ok: true, incidents });
    }
    if (params.get("werknetz24Agenten")) {
      const agenten = await fetchWerknetz24Agenten();
      return NextResponse.json({ ok: true, agenten });
    }
    const id = params.get("id");
    const businesses = (await listBusinesses()).map(b => {
      if (!authError || !("liveStatus" in b)) return withLiveHealth(b);
      return { ...b, liveStatus: { configured: true, ok: false, authRequired: true, error: "Anmeldung erforderlich (Admin-Secret)" } };
    });
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
  const authError = await checkAdminSecret(request);
  if (authError) return NextResponse.json({ ok: false, error: authError.error }, { status: authError.status });
  try{
    const body = await request.json();
    // Einnahmequellen (27.09.2026): anlegen / Inhalte aendern / Status (nur mit erfuellten Voraussetzungen).
    // Workflow (27.09.2026): Kunde zuordnen, Aufgabe erzeugen (zentrale Aufgabenliste), Start/Stop.
    // Teil 3A: kostenlose Automatisierungen (Entwuerfe, Leads, Aufgaben aus Schritten).
    if (["einnahmequelle-entwurf", "einnahmequelle-lead", "einnahmequelle-lead-status", "einnahmequelle-schritte"].includes(body?.action)) {
      try {
        const r = body.action === "einnahmequelle-entwurf" ? { entwurf: await entwurfErzeugen(body.id, body.art) }
          : body.action === "einnahmequelle-lead" ? await leadHinzufuegen(body.id, body.lead)
          : body.action === "einnahmequelle-lead-status" ? { einnahmequelle: await leadStatus(body.id, body.index, body.status) }
          : await aufgabenAusSchritten(body.id);
        return NextResponse.json({ ok: true, ...r }, { status: body.action === "einnahmequelle-lead-status" ? 200 : 201 });
      } catch (error) { return NextResponse.json({ ok: false, error: error.message }, { status: /nicht gefunden/.test(error.message) && !/Lead nicht/.test(error.message) ? 404 : 400 }); }
    }
    if (body?.action === "einnahmequelle-aufgabe") {
      try { return NextResponse.json({ ok: true, task: await aufgabeErzeugen(body.id, { title: body.title, priority: body.priority, beschreibung: body.beschreibung, naechste_aktion: body.naechste_aktion, quelle: body.quelle, due_at: body.due_at }) }, { status: 201 }); }
      catch (error) { return NextResponse.json({ ok: false, error: error.message }, { status: /nicht gefunden/.test(error.message) ? 404 : 400 }); }
    }
    if (["einnahmequelle-anlegen", "einnahmequelle-aendern", "einnahmequelle-status", "einnahmequelle-kunde", "einnahmequelle-start", "einnahmequelle-stop", "einnahmequelle-quelle", "einnahmequelle-plan"].includes(body?.action)) {
      try {
        const { action, id, status, kunde, quelle, vorschlag, ...daten } = body;
        const q = action === "einnahmequelle-anlegen" ? await createEinnahmequelle(daten)
          : action === "einnahmequelle-aendern" ? await updateEinnahmequelle(id, daten)
          : action === "einnahmequelle-kunde" ? await kundeZuordnen(id, kunde)
          : action === "einnahmequelle-start" ? await starteEinnahmequelle(id)
          : action === "einnahmequelle-stop" ? await stoppeEinnahmequelle(id)
          : action === "einnahmequelle-quelle" ? await quelleHinzufuegen(id, quelle)
          : action === "einnahmequelle-plan" ? await planHinzufuegen(id, vorschlag)
          : await setzeEqStatus(id, status);
        return NextResponse.json({ ok: true, einnahmequelle: q }, { status: action === "einnahmequelle-anlegen" ? 201 : 200 });
      } catch (error) {
        return NextResponse.json({ ok: false, error: error.message }, { status: /nicht gefunden/.test(error.message) ? 404 : 400 });
      }
    }
    // Fehlerzentrale-Aktionen (Phase 2, 26.09.2026): echte Werknetz24-Aktionen, gleiche doppelte
    // Schutzschicht wie der Kalender (MASTER_API_SECRET hier, WERKNETZ24_WRITE_SECRET gegenueber
    // Werknetz24). Aendern keine Kunden-/Zahlungsdaten.
    // Zentrale Aktionslogik: Kategorie + Kostenschutz in lib/aktionen.js, Ausfuehrung + Log in lib/aktion-ausfuehren.js.
    if (body?.action === "aktion-ausfuehren") {
      const r = await fuehreAktionAus(String(body.id || ""), body.freigabe);
      const { erlaubt, status, ...rest } = r;
      return NextResponse.json({ ok: Boolean(erlaubt && r.ok), ...rest }, { status: erlaubt ? (r.ok ? 200 : 502) : status });
    }
    if (body?.action === "werknetz24-systemcheck") {
      const result = await runWerknetz24Systemcheck();
      if (!result.configured) return NextResponse.json({ ok: false, error: result.reason }, { status: 503 });
      if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: 502 });
      return NextResponse.json({ ok: true, ...result.data });
    }
    if (body?.action === "werknetz24-incident-abschliessen") {
      if (typeof body.incidentId !== "string" || !body.incidentId) return NextResponse.json({ ok: false, error: "incidentId fehlt" }, { status: 400 });
      const result = await closeWerknetz24Incident(body.incidentId);
      if (!result.configured) return NextResponse.json({ ok: false, error: result.reason }, { status: 503 });
      // 409 von Werknetz24 (Pruefung nicht gruen) unveraendert durchreichen - kein "behoben" ohne Nachweis.
      if (!result.ok) return NextResponse.json({ ok: false, error: result.error, ...(result.data || {}) }, { status: result.status === 409 ? 409 : 502 });
      return NextResponse.json({ ok: true, abschluss: result.data.abschluss });
    }
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
  const authError = await checkAdminSecret(request);
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

// Ampel der Werknetz24-Karte aus dem echten Live-Status ableiten (Audit-Fund F9: fest "🟡" stand
// neben einem live "🔴"). Nur wenn der Live-Status tatsaechlich vorliegt, sonst bleibt der Wert.
function withLiveHealth(b) {
  const gesamt = b?.liveStatus?.ok ? b.liveStatus.data?.systemStatus?.gesamtstatus : null;
  const ampel = { gruen: "🟢", gelb: "🟡", rot: "🔴" }[gesamt];
  return ampel ? { ...b, health: ampel } : b;
}
