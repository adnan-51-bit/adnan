# Master-Zentrale – Systeme & Integrationen

Stand: 2026-09-20

## Zweck
Die Systeme-Seite ist ein zentrales Betriebsregister. Sie zeigt dokumentierte Zustände, letzte Prüfung und nächste Aktion, ohne externe Aktionen automatisch auszuführen.

## Statusregeln
- 🟢 bestätigt / betriebsbereit für den dokumentierten Umfang
- 🟡 vorhanden, aber Prüfung oder Konfiguration offen
- 🔴 bewusst gesperrt oder kritischer Produktions-Gate
- ⚪ noch nicht eingerichtet

Ein manueller Status ist keine Live-API-Prüfung. Ein System darf erst nach einem reproduzierbaren Smoke-Test als produktiv markiert werden.

## Systeme
- GitHub: Repository und Dokumentation
- Vercel: Deployment
- Supabase: persistente Datenhaltung
- Famulor: Telefonie
- Easybell: Telefonie/Weiterleitung
- Stripe: Payment, aktuell gesperrt
- PayPal: Payment, noch nicht aktiviert
- Shopify: Shop/Webhooks
- E-Mail: Versand-Connector
- Slack: Benachrichtigungs-Connector

## Sicherheitsregel
Keine API-Schlüssel oder Secrets im Repository. Externe Payment-, Telefonie- oder Messaging-Aktionen bleiben deaktiviert, bis die jeweilige Signatur-/Authentifizierungs-, Persistenz- und Smoke-Test-Prüfung bestanden ist.
