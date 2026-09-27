// Zentrale Aktionslogik der Master-Zentrale (27.09.2026). Jede Aktion hat genau eine Kategorie:
//   AUTOMATISCH  🟢 sicher ohne Benutzer ausfuehrbar (kostenlos, aendert keine Kunden-/Zahlungsdaten)
//   FREIGABE     🟡 nur nach ausdruecklicher Bestaetigung (Geld, Veroeffentlichung, Zahlung)
//   NICHT_MOEGLICH 🔴 keine Schnittstelle oder bewusst verboten (z. B. Secrets anzeigen)
// "ausfuehrung" sagt ehrlich, WER sie ausfuehrt: server (Knopf in der Zentrale), ci (GitHub bei jedem
// Push), claude (Code-Assistent in der Sitzung), extern (nur beim Anbieter selbst).
// Reine Daten + Pruefung, kein Netzwerk - dadurch vollstaendig testbar.

export const KATEGORIE = { AUTOMATISCH: "AUTOMATISCH", FREIGABE: "FREIGABE", NICHT_MOEGLICH: "NICHT_MOEGLICH" };
export const KATEGORIE_LABEL = { AUTOMATISCH: "🟢 AUTOMATISCH", FREIGABE: "🟡 FREIGABE", NICHT_MOEGLICH: "🔴 NICHT MÖGLICH" };

export const AKTIONEN = [
  // 🟢 per Knopf in der Zentrale ausfuehrbar (echte Ausfuehrung in lib/aktion-ausfuehren.js)
  { id: "systempruefung", name: "Systemprüfung", bereich: "master", agent: "Master-Systemmonitor", kategorie: "AUTOMATISCH", ausfuehrung: "server", zweck: "Prüft GitHub, Vercel, Supabase und die Konfiguration der Anbieter neu.", quelle: "/api/master/systems" },
  { id: "werknetz24-systempruefung", name: "Werknetz24-Systemwächter", bereich: "werknetz24", agent: "Werknetz24-Systemwächter", kategorie: "AUTOMATISCH", ausfuehrung: "server", zweck: "Startet die Systemprüfung in Werknetz24 (legt bei Fehlern Störungen an).", quelle: "werknetz24.de /api/customers?type=master-zentrale-systemcheck" },
  { id: "test-status", name: "Tests & Build prüfen", bereich: "master", agent: "GitHub CI", kategorie: "AUTOMATISCH", ausfuehrung: "server", zweck: "Liest das Ergebnis des letzten automatischen Test- und Build-Laufs bei GitHub.", quelle: "api.github.com (Actions)" },
  { id: "git-status", name: "Git-Status prüfen", bereich: "master", agent: "GitHub", kategorie: "AUTOMATISCH", ausfuehrung: "server", zweck: "Letzter veröffentlichter Stand (Commit) beider Projekte.", quelle: "api.github.com (Commits)" },
  { id: "quality-gate", name: "Quality Gate prüfen", bereich: "ecommerce", agent: "Quality Gate", kategorie: "AUTOMATISCH", ausfuehrung: "server", zweck: "Prüft, ob Zahlungen/Verkauf freigegeben werden dürften.", quelle: "lib/quality-gate.js" },
  { id: "tagesbericht", name: "Tagesbericht erstellen", bereich: "master", agent: "Berichts-Agent", kategorie: "AUTOMATISCH", ausfuehrung: "server", zweck: "Fasst den heutigen Tag aus echten Daten zusammen.", quelle: "Master-Daten + Werknetz24-Status" },
  // Teil 3A (27.09.2026): wiederkehrende Pruefungen der Einnahmequellen - kostenlos, nur lesend + Protokoll.
  { id: "quellen-pruefung", name: "Quellen-Links prüfen", bereich: "einnahmequellen", agent: "Quellen-Prüfer", kategorie: "AUTOMATISCH", ausfuehrung: "server", zweck: "Ruft jede gespeicherte Quellen-URL auf und meldet nicht erreichbare Links.", quelle: "Quellenlisten der Einnahmequellen" },
  { id: "faelligkeit", name: "Überfällige Aufgaben prüfen", bereich: "master", agent: "Aufgaben-Prüfer", kategorie: "AUTOMATISCH", ausfuehrung: "server", zweck: "Findet offene Aufgaben, deren Fälligkeitsdatum überschritten ist.", quelle: "zentrale Aufgabenliste" },
  { id: "eq-report", name: "Einnahmequellen-Report", bereich: "einnahmequellen", agent: "Berichts-Agent", kategorie: "AUTOMATISCH", ausfuehrung: "server", zweck: "Statusmeldung aller Einnahmequellen aus den gespeicherten Daten.", quelle: "Einnahmequellen + Aufgaben" },
  { id: "pilot-monatslauf", name: "Pilot Google-Profil: Monatslauf", bereich: "einnahmequellen", agent: "Pilot-Agent", kategorie: "AUTOMATISCH", ausfuehrung: "server", zweck: "Legt je laufendem Kundenvertrag einmal pro Monat die Monatsaufgaben und eine OFFENE Monatsrechnung an.", quelle: "Kundenverträge im Piloten" },
  { id: "optimierung", name: "Optimierung (täglich)", bereich: "master", agent: "Optimierungs-Agent", kategorie: "AUTOMATISCH", ausfuehrung: "server", zweck: "Wertet jede Einnahmequelle aus (funktioniert / in Arbeit / stockt), meldet Befunde und schlägt bei Stillstand das Pausieren vor (Entscheidung unter „Wartet auf mich“).", quelle: "Einnahmequellen, Leads, Aufgaben, Finanzen" },
  { id: "wiederkehrende-pruefungen", name: "Wiederkehrende Prüfungen (täglich)", bereich: "master", agent: "Zeitplan (Vercel Cron, täglich)", kategorie: "AUTOMATISCH", ausfuehrung: "server", zweck: "Systemprüfung, Quellen-Links, überfällige Aufgaben, Report und Tagesbericht in einem Lauf – startet täglich automatisch.", quelle: "vercel.json crons" },
  // 🟢 sicher, aber nicht vom Server ausfuehrbar - ehrlich benannt
  { id: "dokument-aktualisieren", name: "Dokumentation aktualisieren", bereich: "master", agent: "Claude", kategorie: "AUTOMATISCH", ausfuehrung: "claude", zweck: "GitHub-Doku und Obsidian nach jeder Änderung – macht Claude in der Arbeitssitzung.", quelle: "docs/STATUS.md, Obsidian-Vault" },
  { id: "kostenlose-recherche", name: "Kostenlose Recherche", bereich: "einnahmequellen", agent: "Claude", kategorie: "AUTOMATISCH", ausfuehrung: "claude", zweck: "Markt/Preise/Recht mit Quelle + Datum – macht Claude in der Arbeitssitzung und trägt es in Einnahmequellen ein.", quelle: "öffentliche Quellen" },
  // 🟡 nur mit Freigabe - die Zentrale fuehrt sie NICHT selbst aus, sie zeigt Kosten und den Weg
  { id: "kostenpflichtiger-dienst", name: "Kostenpflichtigen Dienst buchen", bereich: "master", kategorie: "FREIGABE", ausfuehrung: "extern", zweck: "Abo/Tarif/Upgrade bei einem Anbieter.", kosten: { was: "Abo oder Tarif", warum: "nur wenn kostenlose Wege ausgeschöpft sind", betrag: "je nach Angebot – vor Freigabe konkret nennen", rhythmus: "meist wiederkehrend", leistung: "vorher schriftlich festhalten" } },
  { id: "geld-ausgeben", name: "Geld ausgeben / Einkauf", bereich: "master", kategorie: "FREIGABE", ausfuehrung: "extern", zweck: "Jede Ausgabe (Ware, Werbung, Domain).", kosten: { was: "Ausgabe", warum: "muss begründet werden", betrag: "vor Freigabe konkret nennen", rhythmus: "einmalig oder wiederkehrend angeben", leistung: "vorher festhalten" } },
  { id: "famulor-testanruf", name: "Famulor-Testanruf", bereich: "werknetz24", kategorie: "FREIGABE", ausfuehrung: "extern", zweck: "Echter Anruf über Lisa zum Prüfen der Telefonie.", ziel: "https://app.famulor.de", kosten: { was: "ein Testanruf", warum: "prüft, ob Lisa Anrufe annimmt", betrag: "Minutenpreis laut Famulor-Tarif (verbraucht Guthaben)", rhythmus: "einmalig", leistung: "Nachweis, dass die Telefonie funktioniert" } },
  { id: "produkt-veroeffentlichen", name: "Produkt veröffentlichen", bereich: "ecommerce", kategorie: "FREIGABE", ausfuehrung: "extern", zweck: "Produkt im Shop sichtbar machen.", gesperrt: "E-Commerce ist pausiert – wird nicht ausgeführt.", ziel: "/e-commerce", kosten: { was: "Verkaufsstart", warum: "erst nach Gewerbe + Rechtstexten", betrag: "Wareneinkauf + Gebühren", rhythmus: "laufend", leistung: "Umsatz – nicht belegt" } },
  { id: "zahlung-ausloesen", name: "Zahlung auslösen", bereich: "ecommerce", kategorie: "FREIGABE", ausfuehrung: "extern", zweck: "Geld überweisen oder einziehen.", gesperrt: "Zahlungen sind gesperrt (Quality Gate).", kosten: { was: "Zahlung", warum: "—", betrag: "Betrag der Zahlung", rhythmus: "einmalig", leistung: "—" } },
  // 🔴 nicht moeglich
  { id: "secret-anzeigen", name: "Secret / API-Schlüssel anzeigen", bereich: "master", kategorie: "NICHT_MOEGLICH", ausfuehrung: "extern", grund: "Bewusst verboten: Geheimnisse werden nie angezeigt, weder in der Zentrale noch im Chat.", ziel: "https://vercel.com/dashboard" },
  { id: "passwort-anzeigen", name: "Passwort anzeigen", bereich: "master", kategorie: "NICHT_MOEGLICH", ausfuehrung: "extern", grund: "Bewusst verboten: Passwörter werden nie gespeichert oder angezeigt." },
  { id: "vercel-variable-setzen", name: "Vercel-Zugangsdaten eintragen", bereich: "master", kategorie: "NICHT_MOEGLICH", ausfuehrung: "extern", grund: "Nur du darfst Zugangsdaten eintragen (Vercel → Projekt → Settings → Environment Variables).", ziel: "https://vercel.com/dashboard" },
  { id: "famulor-sip", name: "Famulor-SIP-Erlaubnisliste ändern", bereich: "werknetz24", kategorie: "NICHT_MOEGLICH", ausfuehrung: "extern", grund: "Famulor bietet dafür keine Schnittstelle – nur in der Famulor-Oberfläche (Easybell-Netz 195.185.187.0/27 fehlt).", ziel: "https://app.famulor.de" },
  { id: "google-anmeldung", name: "Google-Anmeldung erneuern", bereich: "werknetz24", kategorie: "NICHT_MOEGLICH", ausfuehrung: "extern", grund: "Google verlangt deine persönliche Anmeldung (Freigabe im Browser).", ziel: "https://werknetz24.de/admin-zentrale" },
];

export const findeAktion = id => AKTIONEN.find(a => a.id === id) || null;

// Kostenschutz: entscheidet VOR jeder Ausfuehrung. Gibt { erlaubt, status, fehler, kosten } zurueck.
export function pruefeAusfuehrung(id, freigabe) {
  const a = findeAktion(id);
  if (!a) return { erlaubt: false, status: 404, fehler: "Unbekannte Aktion" };
  if (a.kategorie === "NICHT_MOEGLICH") return { erlaubt: false, status: 403, fehler: a.grund, ziel: a.ziel || null };
  if (a.kategorie === "FREIGABE") {
    if (!freigabe || freigabe.bestaetigt !== true || freigabe.aktion !== id) return { erlaubt: false, status: 409, fehler: "Freigabe erforderlich – Kosten und Zweck vorher bestätigen.", kosten: a.kosten || null };
    if (a.gesperrt) return { erlaubt: false, status: 423, fehler: a.gesperrt, ziel: a.ziel || null };
    // Freigegeben, aber die Zentrale hat bewusst keinen Ausfuehrungsweg fuer Geld-Aktionen.
    return { erlaubt: false, status: 501, fehler: "Freigabe notiert – ausführen musst du selbst beim Anbieter (keine automatische Geld-Aktion).", ziel: a.ziel || null };
  }
  if (a.ausfuehrung !== "server") return { erlaubt: false, status: 501, fehler: a.ausfuehrung === "claude" ? "Wird von Claude in der Arbeitssitzung erledigt, nicht per Knopf." : "Keine Ausführung über die Zentrale." };
  return { erlaubt: true, status: 200 };
}
