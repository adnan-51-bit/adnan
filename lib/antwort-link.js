// Antwort-Link fuer den Brief (27.09.2026, Sales-Automat): Der Betrieb bekommt seinen Profil-Check als Brief
// (von Adnan persoenlich eingeworfen - Briefwerbung an Betriebe ist erlaubt, Werbe-Mails/-Anrufe ohne Einwilligung nicht).
// Ueber QR-Code/Link antwortet er selbst: "Ja, Gespraech" -> Einwilligung + eigene Anfrage dokumentiert, Status Interessent,
// Rueckruf-Aufgabe; "Kein Interesse" -> gesperrt (Widerspruch), keine weitere Ansprache. Nichts wird automatisch gesendet.
// Der Link oeffnet nur den eigenen Profil-Check (oeffentlich abgeleitete Daten), keine internen Notizen.
import crypto from "crypto";
import { listLeads, leadFeldSetzen, leadAendern, leadStatusSetzen } from "./leads.js";
import { createTask, listTasks, updateTask } from "./master-tasks.js";
import { writeAudit } from "./audit.js";
import { istOffen } from "./aufgaben-status.js";

export const TOKEN_MUSTER = /^[A-Za-z0-9_-]{12}$/;
export const MAX_ANTWORTEN = 3;
const plusTage = n => new Date(Date.now() + n * 86400000).toISOString();
const wer = l => l.firma || l.name;
const schliesse = async (leadId, muster, ergebnis) => { for (const t of (await listTasks()).filter(t => t.quelle === "lead:" + leadId && istOffen(t.status) && muster.test(t.title))) await updateTask(t.id, { status: "Erledigt", ergebnis }); };
const aufgabe = (l, title, tage, naechste_aktion, priority = "Hoch") => createTask({ title, area: "Pilot Google-Profil", business_id: "master", priority, owner: "Adnan", einnahmequelle_id: l.einnahmequelle_id || undefined, due_at: plusTage(tage), beschreibung: `Automatisch erzeugt für „${wer(l)}“.`, naechste_aktion, quelle: "lead:" + l.id });

// Brief vorbereiten: nur nach deiner Kontakt-Freigabe. Erzeugt (einmalig) den Antwort-Link und die Aufgaben
// "Brief einwerfen" (+3 Tage) und "Ohne Antwort nachfassen" (+14 Tage). Mehrfaches Drucken erzeugt nichts doppelt.
export async function briefVorbereiten(leadId) {
  const l = (await listLeads()).find(x => x.id === leadId);
  if (!l) throw new Error("Lead nicht gefunden");
  if (!l.profil_analyse) throw new Error("Erst die Profil-Analyse speichern");
  if (["GESPERRT", "VERLOREN"].includes(l.status)) throw new Error("Kein Brief – der Betrieb möchte keinen Kontakt");
  if (!l.pilot_crm?.kontakt_freigegeben) throw new Error("Erst den Kontakt freigeben („Wartet auf mich“)");
  if (l.pilot_crm?.antwort_token) return { lead: l, token: l.pilot_crm.antwort_token, neu: false };
  const token = crypto.randomBytes(9).toString("base64url");
  const lead = await leadFeldSetzen(leadId, { pilot_crm: { ...l.pilot_crm, antwort_token: token, brief_am: new Date().toISOString() } });
  await schliesse(leadId, /^Profil-Check-Bericht persönlich zeigen/, "Per Brief mit Antwort-Link ersetzt");
  await aufgabe(l, "Brief einwerfen: " + wer(l), 3, "Ausgedruckten Brief persönlich in den Briefkasten des Betriebs werfen (kostenlos, keine Briefmarke nötig). Danach nichts weiter tun – die Antwort kommt automatisch in die Zentrale.", "Mittel");
  await aufgabe(l, "Keine Antwort auf Brief? " + wer(l) + " – optional kurz vorbeischauen", 14, "Nur wenn bis dahin keine Antwort kam: einmal persönlich vorbeischauen oder den Betrieb ruhen lassen. Keine Werbe-Mail, kein Werbeanruf.", "Niedrig");
  await writeAudit({ action: "pilot.brief", entityType: "lead", entityId: leadId, details: { brief: true } });
  return { lead, token, neu: true };
}

async function perToken(token) {
  if (!TOKEN_MUSTER.test(String(token || ""))) return null;
  return (await listLeads()).find(l => l.pilot_crm?.antwort_token === token) || null;
}

// Oeffentliche Ansicht: nur Firma/Branche/Ort + Profil-Check (aus dem oeffentlichen Google-Profil). Keine Notizen,
// keine Telefonnummern, keine internen Bewertungen.
export async function antwortSeite(token) {
  const l = await perToken(token);
  if (!l?.profil_analyse) return null;
  const a = l.profil_analyse;
  return { firma: wer(l), branche: l.branche || "", ort: l.ort || "", punkte: a.punkte, datum: a.datum, werte: a.werte || {}, verbesserungen: (a.verbesserungen || []).map(v => ({ id: v.id, text: v.text, dringend: Boolean(v.dringend) })),
    beantwortet: (l.pilot_crm?.antworten || []).length > 0, gesperrt: l.status === "GESPERRT" };
}

// Antwort des Betriebs (oeffentlich, ohne Anmeldung). wahl: "gespraech" | "kein-interesse".
export async function briefAntwortErfassen(token, input = {}) {
  if (input.fax) throw new Error("Ungültige Eingabe"); // Honigtopf-Feld gegen Bots
  const l = await perToken(token);
  if (!l) throw new Error("Link nicht gefunden");
  const antworten = l.pilot_crm?.antworten || [];
  if (antworten.length >= MAX_ANTWORTEN) throw new Error("Ihre Antwort liegt uns bereits vor. Vielen Dank!");
  const wahl = input.wahl;
  const kurz = (v, n) => String(v ?? "").replace(/[\u0000-\u001f]+/g, " ").trim().slice(0, n);
  const jetzt = new Date().toISOString();
  if (wahl === "kein-interesse") {
    await leadFeldSetzen(l.id, { pilot_crm: { ...l.pilot_crm, antworten: [...antworten, { wahl, datum: jetzt }] } });
    await leadStatusSetzen(l.id, "GESPERRT");
    // Gleicher Inhaber (pilot_crm.zusammen_mit): der Widerspruch gilt auch fuer die zugeordneten Betriebe.
    for (const x of (await listLeads()).filter(x => x.pilot_crm?.zusammen_mit === l.id && x.status !== "GESPERRT")) await leadStatusSetzen(x.id, "GESPERRT");
    await writeAudit({ action: "pilot.antwort", entityType: "lead", entityId: l.id, details: { wahl } });
    return { ok: true, wahl };
  }
  if (wahl !== "gespraech") throw new Error("Bitte eine Antwort wählen");
  const name = kurz(input.name, 80), telefon = kurz(input.telefon, 40), email = kurz(input.email, 120), wunsch = kurz(input.wunsch, 300);
  if (!name) throw new Error("Bitte Ihren Namen angeben");
  if (!telefon && !email) throw new Error("Bitte Telefon oder E-Mail angeben");
  if (telefon && !/^[+\d][\d ()/-]{5,}$/.test(telefon)) throw new Error("Telefonnummer prüfen");
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("E-Mail-Adresse prüfen");
  if (input.einwilligung !== true) throw new Error("Bitte bestätigen, dass wir Sie kontaktieren dürfen");
  const antwort = { wahl, datum: jetzt, name, telefon, email, wunsch, einwilligung_text: "Ich möchte zu meinem Profil-Check kontaktiert werden (per Telefon/E-Mail wie angegeben)." };
  await leadFeldSetzen(l.id, { pilot_crm: { ...l.pilot_crm, kontakt_freigegeben: true, antworten: [...antworten, antwort] } });
  await leadAendern(l.id, { selbst_angefragt: true, einwilligung: true });
  await schliesse(l.id, /^(Brief einwerfen|Keine Antwort auf Brief)/, "Betrieb hat über den Antwort-Link geantwortet");
  await createTask({ title: "📞 Interessent meldet sich: " + wer(l) + " – " + name + " zurückrufen", area: "Pilot Google-Profil", business_id: "master", priority: "Hoch", owner: "Adnan", status: "Wartet auf Benutzer", einnahmequelle_id: l.einnahmequelle_id || undefined, due_at: plusTage(1),
    beschreibung: `Antwort über den Brief-Link am ${new Date(jetzt).toLocaleString("de-DE", { timeZone: "Europe/Berlin" })}.`, naechste_aktion: [telefon && "Tel. " + telefon, email && "E-Mail " + email, wunsch && "Wunsch: " + wunsch].filter(Boolean).join(" · ") + " – Termin vereinbaren (Einwilligung liegt vor).", quelle: "lead:" + l.id });
  if (l.status !== "INTERESSENT") await leadStatusSetzen(l.id, "INTERESSENT");
  await writeAudit({ action: "pilot.antwort", entityType: "lead", entityId: l.id, details: { wahl, kontaktweg: telefon ? "telefon" : "email" } });
  return { ok: true, wahl };
}
