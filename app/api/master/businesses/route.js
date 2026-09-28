import { NextResponse } from "next/server";
import { listBusinesses, updateBusiness, storageMode } from "../../../../lib/master-store";
import { checkAdminSecret } from "../../../../lib/auth.js";
import { listEinnahmequellen, createEinnahmequelle, updateEinnahmequelle, setzeEqStatus, uebersicht, kundeZuordnen, aufgabeErzeugen, starteEinnahmequelle, stoppeEinnahmequelle, aufgabenVon, verlaufVon, quelleHinzufuegen, planHinzufuegen, entwurfErzeugen, leadHinzufuegen, leadStatus, aufgabenAusSchritten } from "../../../../lib/einnahmequellen.js";
import { fetchWerknetz24Kalender, createWerknetz24KalenderTermin, fetchWerknetz24Aufgaben, fetchWerknetz24Rechnungen, fetchWerknetz24Incidents, fetchWerknetz24Agenten, runWerknetz24Systemcheck, closeWerknetz24Incident } from "../../../../lib/werknetz24-connector.js";

import { AKTIONEN } from "../../../../lib/aktionen.js";
import { fuehreAktionAus, listeLaeufe, ladeTagesbericht, ladeOptimierung } from "../../../../lib/aktion-ausfuehren.js";
import { ersteEinnahmeCheckliste, eqDashboard } from "../../../../lib/erste-einnahme.js";
import { emailZentrale, leadZeile, contentZentrale } from "../../../../lib/zentralen.js";
import { umsatzPipeline } from "../../../../lib/umsatz-pipeline.js";
import { naechstePilotAktion, einmalAngebotText } from "../../../../lib/google-profil.js";
import { anfragenDaten, anfrageErfassen, anfrageAbschliessen, anfrageArchivieren, angebotsentwurfSpeichern } from "../../../../lib/anfragen.js";
import { eqReport } from "../../../../lib/eq-automation.js";
import { listContent, createContent, updateContent, setzeContentStatus, contentVorbereiten, ideenVorschlaege, contentQuelle, contentBild, contentVeroeffentlichung, contentKennzahl, contentVerlauf, contentUebersicht } from "../../../../lib/content.js";
import { listFreigaben, freigabeEntscheiden, werkzeugStatus, werkzeugAnfragen, syncPlanFreigaben } from "../../../../lib/freigaben.js";
import { istWartend, istOffen } from "../../../../lib/aufgaben-status.js";
import { listLeads, leadAnlegen, leadAendern, leadStatusSetzen, emailEntwurfErstellen, alsGesendet, antwortErfassen, antwortErledigt, angebotErstellen, angebotEntscheidung, zahlungEingegangen, kostenErfassen, kostenVorschlagen, leadVerlauf, leadUebersicht } from "../../../../lib/leads.js";
import { strukturiere, ablaufStand, AUTOMATISIERUNGSGRAD, kontaktErlaubt } from "../../../../lib/leads-regeln.js";
import { listFinance, eqFinanzen } from "../../../../lib/master-finance.js";
import { pilotDaten, analyseSpeichern, preisFestlegen, vertragStarten, vertragBeenden, berichtText, angebotText, potenziellenKundenAnlegen, googleZugangBestaetigen, aenderungProtokollieren, zugriffEntfernt, rechnungVorbereiten } from "../../../../lib/pilot.js";
import { listTasks } from "../../../../lib/master-tasks.js";
import { antwortSeite, briefAntwortErfassen, briefVorbereiten } from "../../../../lib/antwort-link.js";

export const runtime = "nodejs";

export async function GET(request){
  try{
    const params = new URL(request.url).searchParams;
    // Antwort-Link aus dem Brief (27.09.2026): oeffentlich, nur der eigene Profil-Check des Betriebs.
    if (params.get("antwort")) {
      const seite = await antwortSeite(params.get("antwort"));
      return seite ? NextResponse.json({ ok: true, seite }) : NextResponse.json({ ok: false, error: "Link nicht gefunden" }, { status: 404 });
    }
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
    // Pilot Google-Profil (Teil 5, 27.09.2026) - nur mit Secret.
    // Pilot Anfragen-Service (27.09.2026) - nur mit Secret.
    if (params.get("anfragen")) {
      if (authError) return NextResponse.json({ ok: false, error: authError.error }, { status: authError.status });
      try { return NextResponse.json({ ok: true, ...(await anfragenDaten()) }); } catch (error) { return NextResponse.json({ ok: false, error: error.message }, { status: /fehlt/.test(error.message) ? 404 : 500 }); }
    }
    if (params.get("pilot")) {
      if (authError) return NextResponse.json({ ok: false, error: authError.error }, { status: authError.status });
      let d; try { d = await pilotDaten(); } catch (error) { return NextResponse.json({ ok: false, error: error.message }, { status: /fehlt/.test(error.message) ? 404 : 500 }); }
      return NextResponse.json({ ok: true, ...d, leads: d.leads.map(l => ({ ...l, bericht: l.profil_analyse ? berichtText(l, l.profil_analyse) : null, einmalAngebot: l.profil_analyse ? einmalAngebotText(l, l.profil_analyse) : null, angebotVorlage: angebotText(l, d.eq.pilot?.monatspreis_cent) })) });
    }
    // E-Mail & Leads + Einnahmen je Einnahmequelle + Einnahme-Ablauf (Teil 4B, 27.09.2026) - nur mit Secret.
    if (params.get("leads")) {
      if (authError) return NextResponse.json({ ok: false, error: authError.error }, { status: authError.status });
      const lid = params.get("id");
      if (lid) return NextResponse.json({ ok: true, verlauf: await leadVerlauf(lid) });
      const [leads, eqs, finance, content, laeufe, alleTasks] = await Promise.all([listLeads(), listEinnahmequellen(), listFinance(), listContent(), listeLaeufe(200), listTasks()]);
      const reportLaeufe = laeufe.filter(l => ["eq-report", "tagesbericht", "wiederkehrende-pruefungen"].includes(l.details?.aktion) && l.details?.ergebnis === "ok");
      const einnahmequellen = eqs.map(q => {
        const finanzen = eqFinanzen(finance, q.id);
        const ersteEinnahme = finanzen.buchungen.filter(b => b.art === "Einnahme" && b.status === "bezahlt").map(b => b.datum).sort()[0];
        const reportNachEinnahme = Boolean(ersteEinnahme && reportLaeufe.some(l => l.created_at > ersteEinnahme));
        return { id: q.id, name: q.name, status: q.status, finanzen, ablauf: ablaufStand(q, { content, leads, finanzen, reportNachEinnahme }) };
      });
      return NextResponse.json({ ok: true, leads: leads.map(l => ({ ...l, kontakt: kontaktErlaubt(l), zeile: leadZeile(l) })), uebersicht: leadUebersicht(leads), einnahmequellen, automatisierungsgrad: AUTOMATISIERUNGSGRAD, emailZentrale: emailZentrale({ leads, tasks: alleTasks }),
        umsatz: await (async () => {
          const pq = eqs.find(q => q.kategorie === "C");
          const na = pq ? naechstePilotAktion(leads.filter(l => l.einnahmequelle_id === pq.id)) : null;
          const heute = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Berlin" }); const tag = t => t ? new Date(t).toLocaleDateString("sv-SE", { timeZone: "Europe/Berlin" }) : "";
          const claudeErledigt = [
            ...laeufe.filter(l => tag(l.created_at) === heute && l.details?.ergebnis === "ok" && ["lead-recherche", "engine", "optimierung", "pilot-monatslauf"].includes(l.details?.aktion)).slice(0, 4).map(l => l.details.name + ": " + (l.details.zusammenfassung || "ok")),
            ...alleTasks.filter(t => t.status === "Erledigt" && /Claude|Zentrale/.test(t.owner || "") && tag(t.updated_at) === heute).slice(0, 6).map(t => t.title),
          ];
          const offen = (await listFreigaben()).filter(f => f.status === "OFFEN");
          let duMusst = [...offen.filter(f => ["lead-kontakt", "angebot", "pilot"].includes(f.bezug_typ)).map(f => f.titel), ...alleTasks.filter(t => t.status === "Wartet auf Benutzer" && String(t.quelle || "").startsWith("lead:")).map(t => t.title)];
          const aktuell = na?.lead_id ? leads.find(l => l.id === na.lead_id) : null;
          // Vertriebsstatus + Selbstpruefung (28.09.2026): "WARTET AUF MICH" ersetzt die lange Freigabe-Liste.
          const { vertriebStatus } = await import("../../../../lib/vertrieb-status.js");
          const vertrieb = pq ? vertriebStatus({ leads: leads.filter(l => l.einnahmequelle_id === pq.id), tasks: alleTasks, freigaben: offen, audit: laeufe, einnahmen_cent: eqFinanzen(finance, pq.id).einnahmen_cent || 0, monatspreis_cent: pq.pilot?.monatspreis_cent || null }) : null;
          if (vertrieb) duMusst = [...vertrieb.wartetAufMich.map(t => t.replace(/^WARTET AUF MICH: /, "")), ...duMusst.filter(t => !/^Kontakt zu „/.test(t) && !/^Angebot für „/.test(t))];
          // Zuerst was den aktuellen Lead betrifft, dann Preis/Gewerbe, dann der Rest.
          if (aktuell) duMusst.sort((a, b) => (b.includes(aktuell.firma || aktuell.name) - a.includes(aktuell.firma || aktuell.name)) || (/Monatspreis|Gewerbe/.test(b) - /Monatspreis|Gewerbe/.test(a)));
          return { ...umsatzPipeline({ leads: pq ? leads.filter(l => l.einnahmequelle_id === pq.id) : leads, tasks: alleTasks, finance, naechsterSchritt: na?.text || null, aktuellerLead: aktuell ? { id: aktuell.id, name: aktuell.firma || aktuell.name, punkte: aktuell.profil_analyse?.punkte ?? null, stufe: na.stufe } : null, claudeErledigt, duMusst: duMusst.slice(0, 8) }), vertrieb };
        })() });
    }
    // Content & Werbung + "Wartet auf Freigabe" (Teil 4A, 27.09.2026) - nur mit Secret.
    if (params.get("content") || params.get("freigaben")) {
      if (authError) return NextResponse.json({ ok: false, error: authError.error }, { status: authError.status });
      if (params.get("freigaben")) {
        await syncPlanFreigaben(await listEinnahmequellen());
        const wartend = (await listTasks()).filter(t => istOffen(t.status) && istWartend(t.status));
        return NextResponse.json({ ok: true, freigaben: await listFreigaben(), werkzeuge: await werkzeugStatus(), wartendeAufgaben: wartend });
      }
      const cid = params.get("id");
      if (cid) return NextResponse.json({ ok: true, verlauf: await contentVerlauf(cid) });
      const alleContent = await listContent();
      return NextResponse.json({ ok: true, content: alleContent, ...(await contentUebersicht()), werkzeuge: await werkzeugStatus(), zentrale: contentZentrale(alleContent) });
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
      const [liste, leads, tasks, finance, freigaben, content] = await Promise.all([listEinnahmequellen(), listLeads(), listTasks(), listFinance().catch(() => []), listFreigaben().catch(() => []), listContent().catch(() => [])]);
      const opt = await ladeOptimierung().catch(() => null);
      const pilotEq = liste.find(q => q.kategorie === "C");
      return NextResponse.json({ ok: true, einnahmequellen: liste, uebersicht: uebersicht(liste), dashboard: eqDashboard({ eqs: liste, leads, tasks, finance, optimierung: opt, content }), ersteEinnahme: pilotEq ? { eq: pilotEq.name, ...ersteEinnahmeCheckliste({ eq: pilotEq, leads, tasks, finance, freigaben }) } : null });
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
  // Antwort des Betriebs ueber den Brief-Link: oeffentlich (ohne Anmeldung), nur fuer einen gueltigen Link.
  if (new URL(request.url).searchParams.get("antwort")) {
    try { const body = await request.json(); return NextResponse.json(await briefAntwortErfassen(new URL(request.url).searchParams.get("antwort"), body || {})); }
    catch (error) { return NextResponse.json({ ok: false, error: error.message }, { status: /nicht gefunden/.test(error.message) ? 404 : 400 }); }
  }
  const authError = await checkAdminSecret(request);
  if (authError) return NextResponse.json({ ok: false, error: authError.error }, { status: authError.status });
  try{
    const body = await request.json();
    // Einnahmequellen (27.09.2026): anlegen / Inhalte aendern / Status (nur mit erfuellten Voraussetzungen).
    // Workflow (27.09.2026): Kunde zuordnen, Aufgabe erzeugen (zentrale Aufgabenliste), Start/Stop.
    // Teil 5: Pilot Google-Profil.
    // Pilot Anfragen-Service: erfassen (-> Analyse, Entwuerfe, Aufgabe), abschliessen, archivieren, Angebotsentwurf. Nichts wird gesendet.
    if (["anfrage-erfassen", "anfrage-abschliessen", "anfrage-archivieren", "angebotsentwurf-speichern"].includes(body?.action)) {
      try {
        const a = body.action;
        const e = a === "anfrage-erfassen" ? { anfrage: await anfrageErfassen(body.anfrage || {}) }
          : a === "anfrage-abschliessen" ? { anfrage: await anfrageAbschliessen(body.id, body.ergebnis) }
          : a === "anfrage-archivieren" ? { anfrage: await anfrageArchivieren(body.id, body.grund) }
          : { angebotsentwurf: await angebotsentwurfSpeichern(body.entwurf || {}) };
        return NextResponse.json({ ok: true, ...e }, { status: a === "anfrage-erfassen" ? 201 : 200 });
      } catch (error) { return NextResponse.json({ ok: false, error: error.message }, { status: /nicht gefunden|fehlt$/.test(error.message) ? 404 : 400 }); }
    }
    if (String(body?.action || "").startsWith("pilot-")) {
      try {
        const a = body.action;
        const e = a === "pilot-analyse" ? await analyseSpeichern(body.id, body.analyse)
          : a === "pilot-preis" ? { einnahmequelle: await preisFestlegen(body.monatspreis_cent) }
          : a === "pilot-vertrag" ? await vertragStarten(body.id, body.vertrag || {})
          : a === "pilot-vertrag-ende" ? { lead: await vertragBeenden(body.id) }
          : a === "pilot-potenziell" ? { lead: await potenziellenKundenAnlegen(body.betrieb) }
          : a === "pilot-google-zugang" ? { lead: await googleZugangBestaetigen(body.id, body.zugang || {}) }
          : a === "pilot-aenderung" ? { lead: await aenderungProtokollieren(body.id, body.aenderung || {}) }
          : a === "pilot-zugriff-entfernt" ? { lead: await zugriffEntfernt(body.id, body.zugang || {}) }
          : a === "pilot-rechnung" ? { text: await rechnungVorbereiten(body.id) }
          : a === "pilot-brief" ? await briefVorbereiten(body.id)
          : null;
        if (!e) return NextResponse.json({ ok: false, error: "Unbekannte Aktion" }, { status: 400 });
        return NextResponse.json({ ok: true, ...e });
      } catch (error) { return NextResponse.json({ ok: false, error: error.message }, { status: /nicht gefunden|fehlt$/.test(error.message) ? 404 : 400 }); }
    }
    // Teil 4B: E-Mail & Leads, Angebote, Einnahmen/Kosten je Einnahmequelle.
    if (String(body?.action || "").startsWith("lead-") || ["zahlung-eingegangen", "eq-kosten", "eq-kosten-vorschlag"].includes(body?.action)) {
      try {
        const a = body.action, id = body.id;
        const e =
          a === "lead-strukturieren" ? { erkannt: strukturiere(body.text) }
          : a === "lead-anlegen" ? await leadAnlegen(body.lead || {}, { ohneAufgabe: body.ohneAufgabe === true })
          : a === "lead-aendern" ? { lead: await leadAendern(id, body.daten) }
          : a === "lead-status" ? { lead: await leadStatusSetzen(id, body.status) }
          : a === "lead-entwurf" ? { lead: await emailEntwurfErstellen(id, body.art) }
          : a === "lead-gesendet" ? { lead: await alsGesendet(id, body.index) }
          : a === "lead-antwort" ? await antwortErfassen(id, body.text)
          : a === "lead-antwort-erledigt" ? { lead: await antwortErledigt(id, body.index) }
          : a === "lead-angebot" ? { lead: await angebotErstellen(id, { text: body.text, betrag_cent: body.betrag_cent ?? null }) }
          : a === "lead-angebot-entscheidung" ? await angebotEntscheidung(id, body.angenommen)
          : a === "zahlung-eingegangen" ? { buchung: await zahlungEingegangen(id, body.datum, body.nachweis) }
          : a === "eq-kosten" ? { buchung: await kostenErfassen(id, body.kosten || {}) }
          : a === "eq-kosten-vorschlag" ? { freigabe: await kostenVorschlagen(id, body.vorschlag || {}) }
          : null;
        if (!e) return NextResponse.json({ ok: false, error: "Unbekannte Aktion" }, { status: 400 });
        return NextResponse.json({ ok: true, ...e }, { status: ["lead-anlegen", "eq-kosten"].includes(a) ? 201 : 200 });
      } catch (error) { return NextResponse.json({ ok: false, error: error.message }, { status: /nicht gefunden/.test(error.message) ? 404 : 400 }); }
    }
    // Teil 4A: Content & Werbung, Freigaben, Werkzeug-Anfragen.
    if (String(body?.action || "").startsWith("content-") || body?.action === "freigabe-entscheiden" || body?.action === "werkzeug-anfragen") {
      try {
        const a = body.action, id = body.id;
        const ergebnis =
          a === "content-anlegen" ? { content: await createContent(body.daten || {}) }
          : a === "content-aendern" ? { content: await updateContent(id, body.daten || {}) }
          : a === "content-status" ? { content: await setzeContentStatus(id, body.status) }
          : a === "content-vorbereiten" ? await contentVorbereiten(id)
          : a === "content-ideen" ? { ideen: ideenVorschlaege(body) }
          : a === "content-quelle" ? { content: await contentQuelle(id, body.quelle) }
          : a === "content-bild" ? { content: await contentBild(id, body.bild) }
          : a === "content-veroeffentlichung" ? { content: await contentVeroeffentlichung(id, body.veroeffentlichung) }
          : a === "content-kennzahl" ? { content: await contentKennzahl(id, body.kennzahl) }
          : a === "freigabe-entscheiden" ? { freigabe: await freigabeEntscheiden(id, body.entscheidung, body.notiz) }
          : a === "werkzeug-anfragen" ? { freigabe: await werkzeugAnfragen(id) }
          : null;
        if (!ergebnis) return NextResponse.json({ ok: false, error: "Unbekannte Aktion" }, { status: 400 });
        return NextResponse.json({ ok: true, ...ergebnis }, { status: a === "content-anlegen" ? 201 : 200 });
      } catch (error) { return NextResponse.json({ ok: false, error: error.message }, { status: /nicht gefunden/.test(error.message) ? 404 : 400 }); }
    }
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
