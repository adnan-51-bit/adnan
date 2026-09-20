# Architektur

Input -> Normalisierung -> Lead Store -> Klassifizierung -> Benachrichtigung -> Follow-up -> Reporting

Module:
- Lead Store
- Classifier
- Notification
- Follow-up
- Reporting
- optionaler AI Adapter

Sicherheit:
- Secrets nur über Umgebungsvariablen
- keine API-Schlüssel im Frontend
- produktive personenbezogene Daten erst nach Datenschutzprüfung
- keine echten Kundendaten in Demo/Test
