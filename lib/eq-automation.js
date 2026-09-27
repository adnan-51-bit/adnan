// Kostenlose Automatisierungen der Einnahmequellen (27.09.2026, Teil 3A).
// Bewusst OHNE kostenpflichtige KI-/API-Dienste: alles entsteht aus Vorlagen + den gespeicherten Daten der
// Einnahmequelle. Ergebnis sind ENTWUERFE zum Pruefen - nichts wird gesendet, veroeffentlicht oder gebucht.
// Unbekanntes bleibt als [Platzhalter] bzw. "noch zu prüfen" sichtbar; es werden keine Fakten erfunden.
import { EQ_LABEL, pruefstand, kundenAnzahl, leadsAnzahl, gewinnCent, naechsteStufe } from "./einnahmequellen-regeln.js";
import { istOffen, istWartend } from "./aufgaben-status.js";

const eur = c => ((c || 0) / 100).toLocaleString("de-DE", { style: "currency", currency: "EUR" });
const t = (v, platzhalter) => String(v || "").trim() || `[${platzhalter}]`;
const offenZuPruefen = v => !String(v || "").trim() || /noch zu prüfen/i.test(String(v));
const suche = q => "https://www.google.com/search?q=" + encodeURIComponent(q);
export const ENTWURF_ARTEN = { recherche: "Recherche-Checkliste", ideen: "Content-Ideen", texte: "Texte", emails: "E-Mail-Entwürfe", status: "Statusmeldung" };
export const ENTWURF_HINWEIS = "Automatisch aus Vorlagen erzeugt (kostenlos, ohne KI) – Entwurf, vor Verwendung prüfen. Nichts wurde gesendet oder veröffentlicht.";

// Recherche: offene Pruefpunkte als konkrete Fragen mit kostenlosen Such-Links (Suchmaschine, Gesetze, Statistik).
export function rechercheCheckliste(q) {
  const thema = t(q.angebot || q.name, "Angebot");
  const ziel = t(q.zielgruppe, "Zielkunden");
  const fragen = [
    ["markt", `Gibt es Anbieter für „${thema}“ in Deutschland? Wer, wo, welche Leistungen?`, [["Suche", suche(`${thema} Anbieter`)]]],
    ["nachfrage", `Suchen ${ziel} aktiv nach „${thema}“? Belege: Anfragen, Foren, Kleinanzeigen, Kommentare (mit Datum notieren).`, [["Suche", suche(`${thema} gesucht`)], ["Kleinanzeigen", "https://www.kleinanzeigen.de/s-" + encodeURIComponent(thema) + "/k0"]]],
    ["konkurrenz", `Welche Preise nennen Konkurrenten öffentlich? Nur mit Link + Datum eintragen.`, [["Suche", suche(`${thema} Preis`)]]],
    ["kosten_pruefung", "Welche Werkzeuge sind nötig, und gibt es kostenlose Varianten? Jede Kostenangabe mit Quelle.", [["Suche", suche(`${t(q.werkzeuge, "Werkzeug")} kostenlos`)]]],
    ["rechtliches", "Welche Gesetze betreffen das Angebot (Gewerbe, Datenschutz, Werbung, Urheberrecht)? Gesetzestext verlinken.", [["Gesetze im Internet", "https://www.gesetze-im-internet.de/"], ["DSGVO-Text", "https://dsgvo-gesetz.de/"]]],
    ["kostenloser_test", "Wie lässt sich die Idee ohne Geld testen (Muster, Übung, Gespräch mit 3 möglichen Kunden)?", []],
  ];
  const stand = Object.fromEntries(pruefstand(q).map(x => [x.id, x.ok]));
  const offen = fragen.filter(([k]) => !stand[k] || offenZuPruefen(q[k]));
  const zeilen = offen.length ? offen.map(([, frage, links], i) => `${i + 1}. ${frage}${links.length ? "\n   " + links.map(([n, u]) => `${n}: ${u}`).join("\n   ") : ""}`) : ["Alle Prüfpunkte sind ausgefüllt – nur noch Quellen aktuell halten."];
  return { titel: `Recherche-Checkliste: ${q.name}`, text: zeilen.join("\n") + "\n\nJede gefundene Aussage mit „Quelle hinzufügen“ (URL + Datum + belegte Aussage) speichern." };
}

// Content-Ideen: Vorlagen x Zielgruppe x Thema. Keine Zahlen, keine Versprechen.
export function contentIdeen(q) {
  const thema = t(q.angebot || q.name, "Thema");
  const ziel = t(q.zielgruppe, "Zielgruppe");
  const ideen = [
    `3 häufige Fehler bei „${thema}“ – und wie ${ziel} sie vermeiden`,
    `Checkliste: Was ${ziel} bei „${thema}“ zuerst prüfen sollten`,
    `Vorher/Nachher: ein Beispiel aus der Praxis (nur echtes Beispiel verwenden)`,
    `Die 5 häufigsten Fragen von ${ziel} – kurz beantwortet`,
    `So läuft „${thema}“ Schritt für Schritt ab`,
    `Ehrlich: Wann „${thema}“ sich NICHT lohnt`,
    `Werkzeuge, die ich dafür benutze: ${t(q.werkzeuge, "Werkzeuge")}`,
  ];
  return { titel: `Content-Ideen: ${q.name}`, text: ideen.map((x, i) => `${i + 1}. ${x}`).join("\n") + "\n\nWerbung/Partnerlinks immer kennzeichnen. Keine Ergebnisse versprechen." };
}

// Texte: Angebots-Kurztext + Kurzprofil aus den gespeicherten Feldern.
export function texte(q) {
  const angebot = t(q.angebot || q.beschreibung, "Angebot beschreiben");
  const ziel = t(q.zielgruppe, "Zielkunden");
  const preis = q.preis && !offenZuPruefen(q.preis) ? q.preis : "[Preis – noch zu prüfen]";
  return { titel: `Texte: ${q.name}`, text:
`ANGEBOT (kurz)
Für ${ziel}: ${angebot}
Preis: ${preis}
Ablauf: ${t(q.schritte, "Ablauf in 3 Schritten beschreiben").split("\n").slice(0, 3).join(" → ")}

KURZPROFIL
${t(q.beschreibung, "Beschreibung")}
Werkzeuge: ${t(q.werkzeuge, "Werkzeuge")}

HINWEIS
Rechtliches vor Veröffentlichung klären: ${t(q.rechtliches, "rechtliche Voraussetzungen")}` };
}

// E-Mail-Entwuerfe: nur fuer bestehende Kontakte (Antwort, Nachfassen mit Einwilligung, Angebot nach Gespraech).
// Keine Kaltakquise-Mails: Werbung per E-Mail braucht vorherige Einwilligung (UWG § 7 Abs. 2 Nr. 2).
export function emailEntwuerfe(q) {
  const angebot = t(q.angebot || q.name, "Angebot");
  return { titel: `E-Mail-Entwürfe: ${q.name}`, text:
`⚠️ Nur an Personen senden, die selbst angefragt oder ausdrücklich eingewilligt haben (UWG § 7). Keine Werbe-Mails an fremde Adressen.

1) ANTWORT AUF EINE ANFRAGE
Betreff: Ihre Anfrage zu ${angebot}
Hallo [Name],
vielen Dank für Ihre Nachricht. Gern erkläre ich Ihnen, wie ${angebot} abläuft: [2–3 Sätze Ablauf].
Passt Ihnen ein kurzes Telefonat am [Tag/Uhrzeit]?
Viele Grüße
Adnan

2) NACHFASSEN (nur mit Einwilligung / nach Gespräch)
Betreff: Kurze Rückfrage zu ${angebot}
Hallo [Name],
ich wollte kurz nachfragen, ob noch Fragen zu unserem Gespräch vom [Datum] offen sind.
Viele Grüße
Adnan

3) ANGEBOT NACH GESPRÄCH
Betreff: Ihr Angebot – ${angebot}
Hallo [Name],
wie besprochen: [Leistung], Umfang [Umfang], Preis [Preis – noch zu prüfen], Start [Datum].
Viele Grüße
Adnan` };
}

// Statusmeldung einer Einnahmequelle - reine Zusammenfassung gespeicherter Daten.
export function statusMeldung(q, aufgaben = []) {
  const eig = aufgaben.filter(a => a.einnahmequelle_id === q.id);
  const offen = eig.filter(a => istOffen(a.status));
  const wartend = offen.filter(a => istWartend(a.status));
  const ps = pruefstand(q); const ok = ps.filter(x => x.ok).length;
  const naechste = naechsteStufe(q);
  return { titel: `Statusmeldung: ${q.name}`, text: [
    `Stand: ${EQ_LABEL[q.status] || q.status}${naechste ? " (nächste Stufe: " + EQ_LABEL[naechste] + ")" : ""}`,
    `Prüfstand: ${ok}/${ps.length}${ok < ps.length ? " – offen: " + ps.filter(x => !x.ok).map(x => x.text).join(", ") : ""}`,
    `Nächste Aufgabe: ${q.naechste_aufgabe || "—"}`,
    `Aufgaben: ${offen.length} offen, davon ${wartend.length} warten auf dich`,
    `Leads: ${leadsAnzahl(q)} · Kunden: ${kundenAnzahl(q)}`,
    `Einnahmen ${eur(q.einnahmen_cent)} · Ausgaben ${eur(q.kosten_cent)} · Gewinn ${eur(gewinnCent(q))}`,
    q.benutzeraktion ? `Benutzeraktion: ${q.benutzeraktion}` : "Benutzeraktion: keine",
  ].join("\n") };
}

// Report ueber alle Einnahmequellen (fuer "Reports" und den taeglichen Lauf).
export function eqReport(liste, aufgaben = [], jetzt = new Date()) {
  const summe = k => liste.reduce((a, q) => a + (q[k] || 0), 0);
  const nachStatus = liste.reduce((a, q) => ({ ...a, [EQ_LABEL[q.status] || q.status]: (a[EQ_LABEL[q.status] || q.status] || 0) + 1 }), {});
  const kopf = [
    `EINNAHMEQUELLEN-REPORT ${jetzt.toLocaleDateString("de-DE", { timeZone: "Europe/Berlin" })}`,
    `${liste.length} Einnahmequellen: ${Object.entries(nachStatus).map(([s, n]) => `${n} × ${s}`).join(", ") || "keine"}`,
    `Leads ${liste.reduce((a, q) => a + leadsAnzahl(q), 0)} · Kunden ${liste.reduce((a, q) => a + kundenAnzahl(q), 0)} · Einnahmen ${eur(summe("einnahmen_cent"))} · Ausgaben ${eur(summe("kosten_cent"))}`,
    `Überfällige Aufgaben: ${faelligkeit(aufgaben, jetzt).length}`,
  ];
  return { titel: "Einnahmequellen-Report", text: kopf.join("\n") + "\n\n" + liste.map(q => statusMeldung(q, aufgaben).text.replace(/^/, `■ ${q.name}\n`)).join("\n\n") };
}

// Wiederkehrende Pruefung: offene Aufgaben mit Faelligkeit in der Vergangenheit.
export function faelligkeit(aufgaben, jetzt = new Date()) {
  return aufgaben.filter(a => istOffen(a.status) && a.due_at && Date.parse(a.due_at) < jetzt.getTime());
}

// Aufgaben aus dem Feld "Benoetigte Schritte" (eine Zeile = eine Aufgabe; Aufzaehlungszeichen werden entfernt).
export function schritteAlsAufgaben(q) {
  return String(q.schritte || "").split(/\r?\n/).map(z => z.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, "").trim()).filter(z => z.length >= 3).slice(0, 20);
}

export function erzeugeEntwurf(art, q, aufgaben = []) {
  const f = { recherche: rechercheCheckliste, ideen: contentIdeen, texte, emails: emailEntwuerfe, status: x => statusMeldung(x, aufgaben) }[art];
  if (!f) throw new Error("Unbekannte Entwurfsart: " + art);
  return { art, ...f(q), hinweis: ENTWURF_HINWEIS };
}
