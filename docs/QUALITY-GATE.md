# Master-Zentrale Quality Gate

Stand: 2026-09-20

## Zweck

Der Quality Gate ist die Readiness-Prüfung vor einem echten Produktivbetrieb. Er darf keine Secrets ausgeben und markiert ungesicherte externe Zahlungsprozesse ausdrücklich als blockiert.

## Prüfungen

- Automation-Modul geladen
- Automation stoppt ohne bestätigte Zahlung
- System-Registry vollständig
- Persistenz: Supabase oder Fallback-Speicher
- Secret-Exposure: nur Namen/Anzahl, niemals Werte
- Payments: bis zur sicheren Integration gesperrt

## Interpretation

- 200: alle statischen Prüfungen bestehen.
- 503: Produktionsfreigabe nicht erreicht; mindestens Persistenz oder ein anderer Gate-Punkt ist noch offen.

Der Endpoint ist eine Readiness-Prüfung, kein Beweis dafür, dass externe Anbieter wie Vercel, Famulor, Easybell, Stripe oder PayPal tatsächlich erreichbar oder korrekt konfiguriert sind. Diese externen Systeme müssen separat verifiziert werden.
