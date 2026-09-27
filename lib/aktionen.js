// Zentrale Aktionslogik der Master-Zentrale (27.09.2026). Ampel (Adnans Freigabesystem):
//   AUTOMATISCH    🟢 GRUEN: kostenlos, technisch erlaubt, keine persoenliche Entscheidung -> automatisch
//   FREIGABE       🟡 GELB : braucht Adnans Entscheidung -> "Wartet auf mich"
//   NICHT_MOEGLICH 🔴 ROT  : Kosten, rechtliches Risiko, Vertrag, externe Berechtigung oder keine Schnittstelle -> blockiert
// Geld-Schutz: alles, was Geld kostet, ist ROT (blockiert). Nach der ersten echten Einnahme duerfen Kosten
// nur VORGESCHLAGEN werden (Freigabe KOSTEN unter "Wartet auf mich") - ausgefuehrt wird nie automatisch.
// "ausfuehrung" sagt ehrlich, WER sie ausfuehrt: server (Knopf in der Zentrale), ci (GitHub bei jedem
// Push), claude (Code-Assistent in der Sitzung), extern (nur beim Anbieter selbst).
// Reine Daten + Pruefung, kein Netzwerk - dadurch vollstaendig testbar.

export const KATEGORIE = { AUTOMATISCH: "AUTOMATISCH", FREIGABE: "FREIGABE", NICHT_MOEGLICH: "NICHT_MOEGLICH" };
export const KATEGORIE_LABEL = { AUTOMATISCH: "🟢 GRÜN – läuft automatisch", FREIGABE: "🟡 GELB – deine Entscheidung (Wartet auf mich)", NICHT_MOEGLICH: "🔴 ROT – blockiert" };

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
  // 🟡 GELB - persoenliche Entscheidungen; entschieden wird unter "Wartet auf mich" (nichts laeuft automatisch)
  { id: "kontakt-freigeben", name: "Kontakt zu einem Betrieb freigeben", bereich: "einnahmequellen", kategorie: "FREIGABE", ausfuehrung: "wartet-auf-mich", zweck: "Nach jeder Profil-Analyse: ob du den Betrieb persönlich ansprechen willst.", ziel: "/master?tab=freigaben" },
  { id: "preis-festlegen", name: "Preis festlegen", bereich: "einnahmequellen", kategorie: "FREIGABE", ausfuehrung: "wartet-auf-mich", zweck: "Monatspreis eines Angebots – nie automatisch.", ziel: "/master?tab=pilot" },
  { id: "einnahmequelle-pausieren", name: "Einnahmequelle pausieren", bereich: "einnahmequellen", kategorie: "FREIGABE", ausfuehrung: "wartet-auf-mich", zweck: "Vorschlag des Optimierungslaufs bei Stillstand.", ziel: "/master?tab=freigaben" },
  { id: "kosten-vorschlag", name: "Kostenvorschlag entscheiden", bereich: "einnahmequellen", kategorie: "FREIGABE", ausfuehrung: "wartet-auf-mich", zweck: "Erst nach der ersten echten Einnahme möglich; Ausgabe nur nach deiner Freigabe.", ziel: "/master?tab=freigaben" },
  { id: "veroeffentlichung-freigeben", name: "Veröffentlichung freigeben", bereich: "content", kategorie: "FREIGABE", ausfuehrung: "wartet-auf-mich", zweck: "Content geht nur nach deiner Prüfung raus – du postest selbst.", ziel: "/master?tab=freigaben" },
  // 🔴 ROT - Geld-Schutz: blockiert (die Zentrale gibt nie Geld aus)
  { id: "kostenpflichtiger-dienst", name: "Kostenpflichtigen Dienst/Abo buchen", bereich: "master", kategorie: "NICHT_MOEGLICH", ausfuehrung: "extern", grund: "Blockiert (Geld-Schutz, 0-Euro-Modus). Nach der ersten echten Einnahme nur als Kostenvorschlag unter „Wartet auf mich“." },
  { id: "geld-ausgeben", name: "Geld ausgeben / Einkauf / Domain", bereich: "master", kategorie: "NICHT_MOEGLICH", ausfuehrung: "extern", grund: "Blockiert (Geld-Schutz). Die Zentrale gibt nie selbst Geld aus." },
  { id: "werbung-bezahlen", name: "Bezahlte Werbung", bereich: "master", kategorie: "NICHT_MOEGLICH", ausfuehrung: "extern", grund: "Blockiert (Geld-Schutz, 0-Euro-Modus)." },
  { id: "zahlung-ausloesen", name: "Zahlung auslösen / Bank- oder Zahlungsdaten ändern", bereich: "master", kategorie: "NICHT_MOEGLICH", ausfuehrung: "extern", grund: "Blockiert (Geld-Schutz). Zahlungen und Bankdaten nur durch dich selbst." },
  { id: "vertrag-abschliessen", name: "Vertrag abschließen", bereich: "einnahmequellen", kategorie: "NICHT_MOEGLICH", ausfuehrung: "extern", grund: "Blockiert: Verträge schließt nur du ab (schriftliche Zustimmung des Kunden wird dann dokumentiert)." },
  { id: "famulor-testanruf", name: "Famulor-Testanruf", bereich: "werknetz24", kategorie: "NICHT_MOEGLICH", ausfuehrung: "extern", grund: "Blockiert: Werknetz24 ist pausiert, und der Anruf verbraucht Guthaben." },
  { id: "produkt-veroeffentlichen", name: "Produkt im Shop veröffentlichen", bereich: "ecommerce", kategorie: "NICHT_MOEGLICH", ausfuehrung: "extern", grund: "Blockiert: E-Commerce ist pausiert (kein Einkauf, kein Shop)." },
  { id: "server-recherche", name: "Automatische Web-Recherche durch den Server", bereich: "einnahmequellen", kategorie: "NICHT_MOEGLICH", ausfuehrung: "extern", grund: "OFFEN: Der Server kann ohne Such-Schnittstelle (kostenpflichtig) nicht selbst im Internet recherchieren. Recherche macht Claude in den Arbeitssitzungen mit Quelle + Datum." },
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
