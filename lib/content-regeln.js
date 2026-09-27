// Content & Werbung (27.09.2026, Teil 4A) - reine Regeln + kostenlose Vorlagen-Generatoren (ohne KI, ohne Kosten).
// Ablauf: Idee -> Recherche -> Skript -> Content erstellen -> Pruefung -> Veroeffentlichung -> Reichweite -> Leads -> Einnahmen.
// Grundsaetze: nichts wird veroeffentlicht oder gesendet; Kennzahlen nur echt (aus der Plattform-Statistik);
// Werbung wird gekennzeichnet; Bilder nur mit Rechte-Angabe; Veroeffentlichung erst nach Adnans Freigabe.

export const C_STATUS = ["IDEE", "RECHERCHE", "SKRIPT", "ERSTELLT", "PRUEFUNG", "VEROEFFENTLICHT", "REICHWEITE", "LEADS", "EINNAHMEN", "VERWORFEN"];
export const C_LABEL = { IDEE: "Idee", RECHERCHE: "Recherche", SKRIPT: "Skript", ERSTELLT: "Content erstellt", PRUEFUNG: "Prüfung", VEROEFFENTLICHT: "Veröffentlicht", REICHWEITE: "Reichweite", LEADS: "Leads", EINNAHMEN: "Einnahmen", VERWORFEN: "Verworfen" };
export const C_ABLAUF = C_STATUS.filter(s => s !== "VERWORFEN");
export const C_TYPEN = { VIDEO: "Video", BEITRAG: "Social-Media-Beitrag", WERBETEXT: "Werbetext", BILD: "Bild", ARTIKEL: "Artikel" };
export const PLATTFORMEN = { tiktok: "TikTok", instagram: "Instagram", youtube: "YouTube Shorts", facebook: "Facebook", linkedin: "LinkedIn" };
export const C_TEXT = ["titel", "einnahmequelle_id", "thema", "recherche", "skript", "beschreibung", "angebot_info", "werbetext", "ergebnis", "notiz"];
const gefuellt = v => Boolean(String(v || "").trim());
const summe = (c, k) => (Array.isArray(c?.kennzahlen) ? c.kennzahlen : []).reduce((a, x) => a + (Number(x[k]) || 0), 0);
export const kennzahlSumme = summe;

// Voraussetzungen je Stufe (jede Stufe setzt die vorherigen voraus).
const STUFEN = {
  RECHERCHE: c => gefuellt(c.thema) ? null : "„Recherche“ erst mit Thema",
  SKRIPT: c => STUFEN.RECHERCHE(c) || (gefuellt(c.recherche) || (c.quellen_liste || []).length ? null : "„Skript“ erst mit Rechercheergebnis (Notiz oder Quelle)"),
  ERSTELLT: c => STUFEN.SKRIPT(c) || (gefuellt(c.skript) ? null : "„Content erstellt“ erst mit Skript/Text"),
  PRUEFUNG: c => STUFEN.ERSTELLT(c) || (gefuellt(c.beschreibung) && (c.plattformen || []).length ? null : "„Prüfung“ erst mit Beschreibung und mindestens einer Plattform")
    || (c.werbung && !/(werbung|anzeige)/i.test(c.beschreibung) ? "Werbung muss in der Beschreibung als „Werbung“ oder „Anzeige“ gekennzeichnet sein" : null)
    || ((c.bilder || []).some(b => !gefuellt(b.rechte)) ? "Bei jedem Bild fehlt noch die Rechte-Angabe (eigenes Foto / Lizenz)" : null),
  VEROEFFENTLICHT: c => STUFEN.PRUEFUNG(c) || (c.freigegeben ? null : "Veröffentlichung erst nach deiner Freigabe (Bereich „Wartet auf Freigabe“)")
    || ((c.veroeffentlichung || []).length ? null : "Veröffentlichung eintragen (Plattform, Link, Datum) – die Zentrale postet nicht selbst"),
  REICHWEITE: c => STUFEN.VEROEFFENTLICHT(c) || ((c.kennzahlen || []).length ? null : "„Reichweite“ erst mit echten Kennzahlen aus der Plattform-Statistik"),
  LEADS: c => STUFEN.REICHWEITE(c) || (summe(c, "leads") > 0 ? null : "„Leads“ erst mit echten Leads in den Kennzahlen"),
  EINNAHMEN: c => STUFEN.LEADS(c) || (summe(c, "einnahmen_cent") > 0 ? null : "„Einnahmen“ erst mit echten Einnahmen in den Kennzahlen"),
};
export function cStatusPruefung(c, ziel) { if (!C_STATUS.includes(ziel)) return "Unbekannter Status"; return STUFEN[ziel] ? STUFEN[ziel](c) : null; }
export const cNaechsteStufe = c => { const i = C_ABLAUF.indexOf(c?.status); return i >= 0 && i < C_ABLAUF.length - 1 ? C_ABLAUF[i + 1] : null; };

// Kennzahl (Ergebnis dokumentieren): nur ganze Zahlen >= 0, Datum + Quelle Pflicht.
export const KENNZAHLEN = [["aufrufe", "Aufrufe"], ["likes", "Likes"], ["kommentare", "Kommentare"], ["geteilt", "Geteilt"], ["gespeichert", "Gespeichert"], ["klicks", "Link-Klicks"], ["leads", "Leads"], ["einnahmen_cent", "Einnahmen (Cent)"]];
export function pruefeKennzahl(x) {
  const k = { datum: String(x?.datum || "").trim(), plattform: String(x?.plattform || "").trim(), quelle: String(x?.quelle || "").trim() };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(k.datum)) throw new Error("Kennzahl: Datum (JJJJ-MM-TT) ist Pflicht");
  if (!PLATTFORMEN[k.plattform]) throw new Error("Kennzahl: Plattform ungültig");
  if (!k.quelle) throw new Error("Kennzahl: Quelle ist Pflicht (z. B. „TikTok-Analysen, Screenshot vom …“)");
  for (const [f] of KENNZAHLEN) { const v = x?.[f] ?? 0; if (!Number.isInteger(v) || v < 0) throw new Error(`Kennzahl ${f} muss eine ganze Zahl ≥ 0 sein`); k[f] = v; }
  return k;
}
export function pruefeVeroeffentlichung(x) {
  const v = { plattform: String(x?.plattform || "").trim(), url: String(x?.url || "").trim(), datum: String(x?.datum || "").trim() };
  if (!PLATTFORMEN[v.plattform]) throw new Error("Veröffentlichung: Plattform ungültig");
  if (!/^https?:\/\/\S+$/.test(v.url)) throw new Error("Veröffentlichung: Link (http/https) ist Pflicht");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v.datum)) throw new Error("Veröffentlichung: Datum ist Pflicht");
  return v;
}
export function pruefeBild(x) {
  const b = { beschreibung: String(x?.beschreibung || "").trim(), url: String(x?.url || "").trim(), rechte: String(x?.rechte || "").trim() };
  if (!b.beschreibung) throw new Error("Bild: Beschreibung ist Pflicht");
  if (b.url && !/^https?:\/\/\S+$/.test(b.url)) throw new Error("Bild: Link ungültig");
  return b;
}

// "Erfolgreiche Inhalte erkennen": Vergleich NUR mit den eigenen Inhalten (keine Branchenzahlen).
// Interaktionsrate = (Likes + Kommentare + Geteilt + Gespeichert) / Aufrufe. Top = mind. 3 bewertbare Inhalte
// und oberhalb des eigenen Medians.
export function interaktionsrate(c) { const a = summe(c, "aufrufe"); return a > 0 ? (summe(c, "likes") + summe(c, "kommentare") + summe(c, "geteilt") + summe(c, "gespeichert")) / a : null; }
export function erfolgsAuswertung(liste) {
  const bewertet = liste.map(c => ({ id: c.id, titel: c.titel, aufrufe: summe(c, "aufrufe"), rate: interaktionsrate(c), leads: summe(c, "leads") })).filter(x => x.rate !== null);
  if (bewertet.length < 3) return { genug: false, hinweis: `Erst ab 3 Inhalten mit echten Kennzahlen vergleichbar (bisher ${bewertet.length}).`, top: [], alle: bewertet };
  const raten = bewertet.map(x => x.rate).sort((a, b) => a - b);
  const median = raten.length % 2 ? raten[(raten.length - 1) / 2] : (raten[raten.length / 2 - 1] + raten[raten.length / 2]) / 2;
  const top = bewertet.filter(x => x.rate > median).sort((a, b) => b.rate - a.rate);
  return { genug: true, median, hinweis: "Vergleich nur mit deinen eigenen Inhalten – keine Aussage über Branchenwerte.", top, alle: bewertet.sort((a, b) => b.rate - a.rate) };
}

// ---------- Kostenlose Generatoren (Vorlagen, ohne KI) ----------
export const C_HINWEIS = "Automatisch aus Vorlagen erzeugt (kostenlos, ohne KI) – Entwurf, bitte prüfen. Nichts wurde veröffentlicht.";
const tt = (v, p) => String(v || "").trim() || `[${p}]`;
const worte = s => String(s || "").toLowerCase().replace(/[^a-zäöüß0-9 ]/gi, " ").split(/\s+/).filter(w => w.length > 3);
const hashtags = c => [...new Set(worte(c.thema + " " + c.titel))].slice(0, 5).map(w => "#" + w);
const suche = (basis, q) => basis + encodeURIComponent(q);

export function themenRecherche(c) {
  const t = tt(c.thema || c.titel, "Thema");
  return `THEMEN-RECHERCHE: ${t}\nKostenlose Quellen zum Prüfen, ob das Thema gefragt ist (Ergebnisse mit Datum notieren):\n` + [
    ["Google Trends", suche("https://trends.google.de/trends/explore?geo=DE&q=", t)],
    ["TikTok-Suche", suche("https://www.tiktok.com/search?q=", t)],
    ["YouTube-Suche", suche("https://www.youtube.com/results?search_query=", t)],
    ["Google-Suche „Fragen“", suche("https://www.google.com/search?q=", t + " Frage")],
  ].map(([n, u]) => `- ${n}: ${u}`).join("\n") + "\n\nWorauf achten: Welche Fragen stellen Leute? Welche Videos haben viele Kommentare? Keine Zahlen übernehmen, die du nicht selbst siehst.";
}
export function ideenAusThema(thema, zielgruppe) {
  const t = tt(thema, "Thema"), z = tt(zielgruppe, "Zuschauer");
  return [`So mache ich ${t} – Schritt für Schritt`, `3 Fehler bei ${t}, die ${z} vermeiden sollten`, `Ehrliche Meinung: lohnt sich ${t}?`, `Die häufigste Frage zu ${t} – beantwortet`, `Vorher/Nachher: ${t} im Alltag`];
}
export function skriptVorlage(c) {
  const t = tt(c.thema || c.titel, "Thema");
  return `SKRIPT (20–45 Sekunden) – ${tt(c.titel, "Titel")}
1. EINSTIEG (2 s): „${tt(c.titel, "Satz, der sofort neugierig macht")}“ – direkt in die Kamera, keine Begrüßung.
2. ZEIGEN (15–30 s): ${t} zeigen/benutzen, nah ranzoomen. Stichpunkte aus der Recherche:
${String(c.recherche || "").split(/\r?\n/).filter(Boolean).slice(0, 4).map(z => "   - " + z).join("\n") || "   - [3 Punkte aus der Recherche]"}
3. MEINUNG (5 s): „Ich nutze das seit [Zeitraum], weil …“ – ehrlich, auch Nachteile.
4. FRAGE (3 s): „Was ist eure Erfahrung damit?“${c.werbung ? "\n\nWERBUNG: im Video und in der Beschreibung als „Werbung“/„Anzeige“ kennzeichnen." : ""}`;
}
export function titelVarianten(c) {
  const t = tt(c.thema || c.titel, "Thema");
  return [`${t}: so mache ich es`, `Das hätte ich früher über ${t} wissen sollen`, `${t} – ehrlich getestet`, `3 Tipps zu ${t}`, `Lohnt sich ${t}? Meine Meinung`];
}
export function beschreibungVorlage(c) {
  return `${tt(c.titel, "Titel")} – ${tt(c.thema, "Thema")}. ${c.angebot_info ? tt(c.angebot_info, "") + " " : ""}Was ist eure Erfahrung? ${hashtags(c).join(" ")}${c.werbung ? "\nWerbung" : ""}`.trim();
}
export function plattformVarianten(c) {
  const basis = beschreibungVorlage(c), tags = hashtags(c).join(" "), w = c.werbung ? " (Werbung)" : "";
  const v = {
    tiktok: `${tt(c.titel, "Titel")}${w}\n${tags}`,
    instagram: `${tt(c.titel, "Titel")}${w}\n\n${tt(c.thema, "Thema")} – mehr Infos in den Kommentaren.\n${tags}`,
    youtube: `Titel: ${tt(c.titel, "Titel")}${w}\nBeschreibung: ${basis}`,
    facebook: `${tt(c.titel, "Titel")}${w}\n${tt(c.thema, "Thema")} – kurz erklärt im Video.`,
    linkedin: `${tt(c.titel, "Titel")}${w}\nPraxis-Einblick zum Thema ${tt(c.thema, "Thema")}.`,
  };
  return Object.fromEntries((c.plattformen?.length ? c.plattformen : Object.keys(PLATTFORMEN)).filter(p => v[p]).map(p => [p, v[p]]));
}
export function werbetextVorlage(c) {
  return `${tt(c.titel, "Überschrift")}\n${tt(c.angebot_info, "Angebot in einem Satz – nur echte Leistungen, keine Versprechen")}\nPreis: [nur mit Quelle/Kalkulation]\nKontakt: [nur einsetzen, wenn ein Kontaktweg rechtlich freigegeben ist]\nWerbung`;
}
export function socialPosts(c) {
  return titelVarianten(c).slice(0, 3).map((t, i) => ({ nr: i + 1, text: `${t}${c.werbung ? " (Werbung)" : ""} ${hashtags(c).join(" ")}`.trim() }));
}
// Alles auf einmal (fuer "Automatisch vorbereiten"): liefert nur Felder, die noch LEER sind - vorhandene Texte bleiben.
export function vorbereiten(c) {
  const out = {};
  if (!gefuellt(c.recherche)) out.recherche = themenRecherche(c);
  if (!gefuellt(c.skript)) out.skript = skriptVorlage({ ...c, recherche: c.recherche });
  if (!(c.titel_varianten || []).length) out.titel_varianten = titelVarianten(c);
  if (!gefuellt(c.beschreibung)) out.beschreibung = beschreibungVorlage(c);
  if (!Object.keys(c.varianten || {}).length) out.varianten = plattformVarianten(c);
  if (!(c.social_posts || []).length) out.social_posts = socialPosts(c);
  if (c.typ === "WERBETEXT" && !gefuellt(c.werbetext)) out.werbetext = werbetextVorlage(c);
  return out;
}
