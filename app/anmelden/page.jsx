"use client";

// Anmeldeseite der Master-Zentrale (26.09.2026) - ersetzt das fruehere Browser-Fenster (window.prompt).
// Prueft den Code gegen eine geschuetzte Schnittstelle und sagt klar, wenn er falsch ist.
import { useEffect, useState } from "react";
import { speichereSecret, sicheresZiel, hasStoredSecret } from "../../lib/admin-fetch.js";

const S = {
  seite: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f5f7fa", padding: 16, fontFamily: "Inter,ui-sans-serif,system-ui,sans-serif", color: "#101828" },
  karte: { background: "#fff", border: "1px solid #e4e7ec", borderRadius: 14, padding: 24, width: "min(400px,100%)", display: "flex", flexDirection: "column", gap: 12 },
  feld: { padding: 11, border: "1px solid #d0d5dd", borderRadius: 8, font: "inherit" },
  knopf: { padding: 12, border: 0, borderRadius: 10, background: "#101828", color: "#fff", fontWeight: 700, cursor: "pointer" },
};

export default function Anmelden() {
  const [code, setCode] = useState("");
  const [meldung, setMeldung] = useState("");
  const [prueft, setPrueft] = useState(false);
  const [ziel, setZiel] = useState("/master");
  const [schonAngemeldet, setSchonAngemeldet] = useState(false);

  useEffect(() => {
    setZiel(sicheresZiel(new URLSearchParams(window.location.search).get("zurueck") || "/master"));
    setSchonAngemeldet(hasStoredSecret());
  }, []);

  async function absenden(e) {
    e.preventDefault(); setMeldung(""); setPrueft(true);
    const c = code.trim();
    try {
      const r = await fetch("/api/master/tasks", { headers: { Authorization: "Bearer " + c }, cache: "no-store" });
      if (r.ok) { speichereSecret(c); window.location.assign(ziel); return; }
      await new Promise(res => setTimeout(res, 800)); // bremst schnelles Durchprobieren etwas
      if (r.status === 401) setMeldung("Code falsch. Bitte den Master-Code verwenden – nicht den Werknetz24-Admin-Code.");
      else if (r.status === 429) setMeldung("Zu viele Fehlversuche. Die Anmeldung ist für 15 Minuten gesperrt – bitte später erneut versuchen.");
      else if (r.status === 503) setMeldung("Auf dem Server ist noch kein Master-Code eingerichtet (MASTER_API_SECRET in Vercel).");
      else setMeldung("Anmeldung gerade nicht möglich (Fehler " + r.status + ").");
    } catch { setMeldung("Keine Verbindung. Bitte später erneut versuchen."); }
    setPrueft(false);
  }

  return <main style={S.seite}>
    <form onSubmit={absenden} style={S.karte}>
      <h1 style={{ fontSize: 22, margin: 0 }}>Master-Zentrale anmelden</h1>
      <p style={{ margin: 0, color: "#475467", fontSize: 14 }}>Gilt für die Master-Zentrale und E-Commerce (Sortiert24). Die Werknetz24-Verwaltung hat einen eigenen Code.</p>
      {schonAngemeldet && <p style={{ margin: 0, fontSize: 13, color: "#067647" }}>In diesem Browser ist bereits ein Code gespeichert.</p>}
      <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 14, fontWeight: 600 }}>Master-Code
        <input type="password" name="master-code" autoComplete="current-password" autoFocus required value={code} onChange={e => setCode(e.target.value)} style={S.feld} />
      </label>
      {meldung && <p role="alert" style={{ margin: 0, color: "#b42318", fontSize: 14 }}>{meldung}</p>}
      <button disabled={prueft || !code.trim()} style={S.knopf}>{prueft ? "Wird geprüft …" : "Anmelden"}</button>
      <a href="/master" style={{ fontSize: 13, color: "#175cd3" }}>Ohne Anmeldung weiter (nur öffentliche Ansicht)</a>
    </form>
  </main>;
}
