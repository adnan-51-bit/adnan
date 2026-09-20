# Deployment Gate

Stand: 2026-09-20

## Regel
Produktivstatus wird erst auf 🟢 gesetzt, wenn:
1. GitHub CI erfolgreich ist.
2. Vercel Deployment erfolgreich ist.
3. Master-Zentrale /master lädt.
4. /api/master/systems antwortet.
5. keine Secrets im Client-Bundle landen.
6. Produktions- und Fehlerpfade getestet wurden.

## Aktueller Befund
Der aktuelle Commit meldete über GitHub einen Vercel-Status failure. Der konkrete Vercel-Log ist über die verfügbaren GitHub-Schnittstellen nicht einsehbar.

## Technische Absicherung
- Root Error Boundary vorhanden.
- Custom 404 vorhanden.
- API-Route-Handler bleiben serverseitig.
- Deployment bleibt bis zur erfolgreichen Prüfung gesperrt.
