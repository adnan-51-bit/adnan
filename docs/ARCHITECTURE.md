# Architektur – Master-Zentrale

## Zielarchitektur

Die Anwendung wird als zentrale Steuerung für mehrere getrennte Geschäftsbereiche aufgebaut:

Master-Zentrale
- Werknetz24
  - Lisa / Telefon
  - Kunden
  - Leads
  - Aufträge
  - Angebote
  - Rechnungen
  - Finanzen
  - Integrationen
- E-Commerce
  - Produktrecherche
  - Lieferanten
  - Produkte
  - Bestellungen
  - Kunden
  - Marketing
  - Finanzen
- weitere Geschäftsbereiche später

## Technische Trennung

Werknetz24 bleibt technisch und operativ separat. Die Master-Zentrale darf Status, Kennzahlen und Verweise aggregieren, aber keine unkontrollierte Vermischung produktiver Daten erzeugen.

Der E-Commerce-Bereich bleibt ebenfalls modular und providerunabhängig.

## E-Commerce-Prozess

Recherche -> Lieferantenprüfung -> Kostenprüfung -> Produktfreigabe -> Shop -> Bestellung -> Versand -> Retouren -> Reporting

## Anfrage-/Lead-Prozess

Input -> Normalisierung -> Lead Store -> Klassifizierung -> Priorisierung -> Benachrichtigung -> Follow-up -> Reporting

## Zentrale Steuerung

Die Route /zentral dient als zentrale Übersicht für:
- Geschäftsbereiche
- Projektstatus
- offene Quality Gates
- Tool-/Integrationsstatus
- Kostenregeln
- nächste Arbeitsschritte

## Sicherheitsregeln

- Secrets nur über Umgebungsvariablen
- keine API-Schlüssel im Frontend
- produktive personenbezogene Daten erst nach Datenschutzprüfung
- keine echten Kundendaten in Demo/Test
- keine kostenpflichtigen Dienste ohne Freigabe
- keine produktive Massenansprache ohne rechtliche Prüfung
- externe Anbieter als Integrationen kapseln, damit ein Provider später austauschbar bleibt
