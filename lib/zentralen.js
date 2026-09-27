// Zentrale Sichten (Teil 5, 27.09.2026): Aufgaben-Manager, E-Mail-Zentrale, Content-Zentrale.
// Reine Auswertung gespeicherter Daten - hier wird nichts gesendet, veroeffentlicht oder geschaetzt.
import { istOffen, istWartend, sortiereAufgaben } from "./aufgaben-status.js";
import { EMAIL_ARTEN, kontaktErlaubt, LEAD_LABEL } from "./leads-regeln.js";

const tag = t => t ? new Date(t).toLocaleDateString("sv-SE", { timeZone: "Europe/Berlin" }) : "";

// Aufgaben-Manager: Heute / Automatisch erledigt / Wartet auf mich / Fehler / Erfolgreich / naechste Aktion.
// Lesbarkeit (27.09.2026): "text" ist die kurze Zeile, "details" die vollstaendigen Angaben (nichts geht verloren).
// Gleiche automatische Laeufe werden zusammengefasst ("Tagesbericht erstellen ×6"), jeder Lauf bleibt in den Details.
export function aufgabenZentrale({ tasks = [], audit = [], freigaben = [], jetzt = new Date() } = {}) {
  const heute = tag(jetzt);
  const offen = sortiereAufgaben(tasks.filter(t => istOffen(t.status)));
  const zuTun = offen.filter(t => !istWartend(t.status));
  const laeufeHeute = audit.filter(e => e.action === "automation.lauf" && tag(e.created_at) === heute);
  const erledigtHeute = tasks.filter(t => t.status === "Erledigt" && tag(t.updated_at) === heute);
  const uhr = t => t ? new Date(t).toLocaleTimeString("de-DE", { timeZone: "Europe/Berlin", hour: "2-digit", minute: "2-digit" }) : "";
  const eintrag = (text, ziel, details = [], extra = {}) => ({ text, ziel, details: details.filter(d => String(d ?? "").trim()), ...extra });
  const taskDetails = t => [t.title, t.naechste_aktion && "Nächste Aktion: " + t.naechste_aktion, t.beschreibung, t.ergebnis && "Ergebnis: " + t.ergebnis, t.due_at && "Fällig: " + new Date(t.due_at).toLocaleDateString("de-DE")];
  const gruppiere = (laeufe, text) => {
    const g = new Map();
    for (const e of laeufe) { const k = e.details?.name || e.details?.aktion || "Lauf"; if (!g.has(k)) g.set(k, []); g.get(k).push(e); }
    return [...g].map(([name, l]) => eintrag(`${name}${l.length > 1 ? " ×" + l.length : ""}${text ? " – " + text : ""}`, "automation", l.map(e => `${uhr(e.created_at)} · ${e.details?.zusammenfassung || e.details?.fehler || e.details?.ergebnis || "—"}`), { anzahl: l.length }));
  };
  return {
    heute: zuTun.filter(t => !t.due_at || tag(t.due_at) <= heute).map(t => eintrag(`${t.title}${t.due_at && tag(t.due_at) < heute ? " · überfällig" : ""}`, "tasks", taskDetails(t), { id: t.id })),
    automatischErledigt: [
      ...gruppiere(laeufeHeute.filter(e => e.details?.ergebnis === "ok")),
      ...erledigtHeute.filter(t => /Claude|Zentrale|Automatik/i.test(t.owner || "")).map(t => eintrag(t.title, "tasks", taskDetails(t))),
    ],
    wartetAufMich: [
      ...freigaben.filter(f => f.status === "OFFEN").map(f => eintrag(f.titel, "freigaben", [f.beschreibung, f.kosten && "Kosten: " + f.kosten])),
      ...offen.filter(t => istWartend(t.status)).map(t => eintrag(t.title, "tasks", taskDetails(t), { id: t.id })),
    ],
    fehler: [
      ...gruppiere(laeufeHeute.filter(e => e.details?.ergebnis === "fehler"), "fehlgeschlagen"),
      ...zuTun.filter(t => t.due_at && tag(t.due_at) < heute).map(t => eintrag(`Überfällig: ${t.title}`, "tasks", taskDetails(t), { id: t.id })),
    ],
    erfolgreich: erledigtHeute.map(t => eintrag(t.title, "tasks", taskDetails(t))),
    naechsteAktion: freigaben.some(f => f.status === "OFFEN") ? eintrag("Entscheidung treffen: " + freigaben.find(f => f.status === "OFFEN").titel, "freigaben")
      : zuTun[0] ? eintrag(zuTun[0].title, "tasks", taskDetails(zuTun[0])) : null,
  };
}

// E-Mail-Zentrale: Vorlagen, eingehende Anfragen, Antwort-Entwuerfe, Follow-ups, Status.
// Versand: die Zentrale versendet nie selbst - jeder Entwurf wartet auf Adnan (Senden im eigenen Postfach).
export function emailZentrale({ leads = [], tasks = [], jetzt = new Date() } = {}) {
  const heute = tag(jetzt);
  const alle = leads.flatMap(l => (l.nachrichten || []).map((n, index) => ({ ...n, index, lead_id: l.id, lead: l.firma || l.name })));
  return {
    vorlagen: Object.entries(EMAIL_ARTEN).map(([id, name]) => ({ id, name })),
    eingang: alle.filter(n => n.richtung === "rein" && !n.bearbeitet).map(n => ({ lead_id: n.lead_id, lead: n.lead, datum: n.datum, kategorie: n.kategorie, text: String(n.text || "").slice(0, 160) })),
    entwuerfe: alle.filter(n => n.richtung === "raus" && n.typ === "entwurf").map(n => ({ lead_id: n.lead_id, lead: n.lead, art: EMAIL_ARTEN[n.art] || n.art, betreff: n.betreff, datum: n.datum, senden_erlaubt: Boolean(n.senden_erlaubt), hinweis: n.hinweis || "" })),
    followups: sortiereAufgaben(tasks.filter(t => istOffen(t.status) && /nachfassen/i.test(t.title || ""))).map(t => ({ id: t.id, text: t.title, faellig: t.due_at || null, ueberfaellig: Boolean(t.due_at && tag(t.due_at) < heute) })),
    status: { gesendet: alle.filter(n => n.richtung === "raus" && n.typ !== "entwurf").length, entwuerfe: alle.filter(n => n.richtung === "raus" && n.typ === "entwurf").length, offeneAntworten: alle.filter(n => n.richtung === "rein" && !n.bearbeitet).length,
      kontaktGesperrt: leads.filter(l => !kontaktErlaubt(l).erlaubt).length },
    versand: "Kein automatischer Versand: Entwürfe prüfst und sendest du selbst aus deinem Postfach (WARTET AUF FREIGABE). Keine Massenmails, keine Werbung ohne Einwilligung.",
  };
}

// Lead-Manager-Zeile: alle Pflichtfelder aus Teil 5 aus dem gespeicherten Lead.
export function leadZeile(l) {
  const k = kontaktErlaubt(l);
  const rein = (l.nachrichten || []).filter(n => n.richtung === "rein");
  return { id: l.id, wer: l.firma || l.name, quelle: l.quelle || "—", kontakt: [l.email, l.telefon, l.website].filter(Boolean).join(" · ") || "—", kontakt_erlaubt: k.erlaubt,
    interesse: rein.length ? (rein.at(-1).kategorie || "Antwort erhalten") : ["INTERESSENT", "ANGEBOT", "KUNDE"].includes(l.status) ? "ja" : "noch unbekannt",
    status: LEAD_LABEL[l.status] || l.status, naechste_aktion: l.naechster_schritt || "—", notiz: l.notiz || "", datum: l.erstellt_am,
    ergebnis: l.status === "KUNDE" ? "Kunde" : l.status === "VERLOREN" ? "verloren" : l.status === "GESPERRT" ? "Widerspruch – kein Kontakt" : l.angebot ? "Angebot: " + (l.angebot.status || "Entwurf") : "offen" };
}

// Content-Zentrale: Ideen, fertige Texte, Video-Ideen, Skripte, Titel, Beschreibungen, Affiliate-Hinweise, Status, Ergebnisse.
export function contentZentrale(content = []) {
  const aktiv = content.filter(c => c.status !== "VERWORFEN");
  const gefuellt = v => Boolean(String(v ?? "").trim());
  const summe = (c, k) => (c.kennzahlen || []).reduce((a, x) => a + (Number(x[k]) || 0), 0);
  const kurz = c => ({ id: c.id, titel: c.titel || "(ohne Titel)", status: c.status, typ: c.typ });
  return {
    ideen: aktiv.filter(c => ["IDEE", "RECHERCHE"].includes(c.status) && c.typ !== "VIDEO").map(kurz),
    videoIdeen: aktiv.filter(c => c.typ === "VIDEO" && ["IDEE", "RECHERCHE", "SKRIPT"].includes(c.status)).map(kurz),
    skripte: aktiv.filter(c => gefuellt(c.skript)).map(kurz),
    fertigeTexte: aktiv.filter(c => ["ERSTELLT", "PRUEFUNG"].includes(c.status) && (gefuellt(c.werbetext) || gefuellt(c.skript))).map(kurz),
    titel: aktiv.filter(c => gefuellt(c.titel)).map(c => c.titel),
    beschreibungen: aktiv.filter(c => gefuellt(c.beschreibung)).map(kurz),
    affiliate: aktiv.filter(c => c.werbung).map(c => ({ ...kurz(c), gekennzeichnet: /(werbung|anzeige)/i.test(c.beschreibung || "") })),
    veroeffentlichung: { wartetAufFreigabe: aktiv.filter(c => c.status === "PRUEFUNG" && !c.freigegeben).length, freigegeben: aktiv.filter(c => c.freigegeben && !(c.veroeffentlichung || []).length).length, veroeffentlicht: aktiv.filter(c => (c.veroeffentlichung || []).length).length },
    ergebnisse: aktiv.filter(c => (c.kennzahlen || []).length).map(c => ({ ...kurz(c), aufrufe: summe(c, "aufrufe"), klicks: summe(c, "klicks"), leads: summe(c, "leads"), einnahmen_cent: summe(c, "einnahmen_cent") })),
    hinweis: "Veröffentlichen, Konten anlegen und API-Zugänge: nur nach deiner Freigabe (WARTET AUF FREIGABE). Die Zentrale postet nicht selbst.",
  };
}
