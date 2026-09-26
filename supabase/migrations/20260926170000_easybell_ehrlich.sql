-- Reparaturphase Easybell (26.09.2026): Easybell hat keine Schnittstelle (nur SIP-Trunk). Der Eintrag
-- vom 20.09. suggerierte eine pruefbare Integration. Nur aktualisieren, wenn noch der alte Text steht.
update public.master_systems set status = '🔵',
  note = 'Externe Integration ohne Schnittstelle: nur SIP-Trunk (Easybell → Famulor), kein API-Zugriff, kein Live-Status möglich',
  next_action = 'Weiterleitung nur per echtem Testanruf prüfbar (Easybell-Kundenportal)'
where id = 'easybell' and note = 'Telefonie / Weiterleitung';
