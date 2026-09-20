# Claude Arbeitsanweisung – Master-Zentrale

## Grundregel

Vor jeder Änderung:
1. Repository vollständig prüfen.
2. README.md und alle relevanten Dateien unter docs/ lesen.
3. Aktuellen Git-Stand prüfen.
4. Bestehende Funktionen nicht unnötig überschreiben.
5. Nach Änderungen bauen/testen.
6. docs/STATUS.md aktualisieren.
7. Änderungen committen und den Commit dokumentieren.

## Architektur

Dieses Repository ist die technische Basis der Master-Zentrale.

Geschäftsbereiche:
- Werknetz24: technisch/operativ separat
- E-Commerce: eigener modularer Bereich
- weitere Geschäftsbereiche später

Die Master-Zentrale darf gemeinsame Übersicht und Steuerung liefern, aber keine produktiven Datenbereiche unkontrolliert vermischen.

## Arbeitsweise

Plan -> Implementieren -> Testen -> Quality Gate -> Dokumentieren -> Commit -> STOP.

Status:
- 🟢 VERIFIED = getestet/verifiziert
- 🟡 CODE EXISTS = vorhanden, aber noch nicht vollständig verifiziert
- 🔴 ERROR = Fehler, zuerst beheben
- ⚪ OPEN = noch nicht umgesetzt
- 🔵 EXTERNAL = externer Dienst/Abhängigkeit

## E-Commerce-Regeln

Vor Produktfreigabe müssen Lieferant, Einkaufspreis, Versand, Lieferzeit, MOQ, Retouren, Produktinformationen/Konformität, Verkaufspreis und variable Kosten geprüft werden.

Keine Kaufentscheidung auf Basis von Modellannahmen.

## Kostenregeln

- Keine kostenpflichtigen Dienste aktivieren oder kaufen ohne ausdrückliche Freigabe.
- Keine Domain kaufen ohne Produktfreigabe.
- Keine Werbung starten ohne Produktfreigabe und rechtliche Prüfung.
- Keine Secrets committen.
- Keine echten Kundendaten in Testsysteme übernehmen.

## Automatisierung

Automatisierung ist erwünscht, aber erst nach stabiler Kernfunktion:
- Lead-Erfassung
- Klassifizierung
- Priorisierung
- Benachrichtigung
- Follow-up
- Reporting
- E-Commerce-Recherche und Kostenprüfung

Automatisierte Massenansprache bleibt bis zur rechtlichen Prüfung deaktiviert.

## Fehlerregel

Fehler beheben, nicht nur dokumentieren. Wenn eine benötigte Funktion fehlt:
1. vorhandene kostenlose/integrierte Möglichkeit prüfen,
2. vorhandene Bibliotheken/Provider prüfen,
3. erst danach eine neue Abhängigkeit vorschlagen,
4. kostenpflichtige Optionen nur mit Freigabe.

## Abschluss

Nach jeder abgeschlossenen Arbeitsphase:
- Tests ausführen
- Status dokumentieren
- relevante Architektur-/Entscheidungsdokumente aktualisieren
- GitHub Commit erstellen
- Ergebnis mit 🟢/🟡/🔴 kennzeichnen

Danach STOP und auf den nächsten Quality Gate warten.
