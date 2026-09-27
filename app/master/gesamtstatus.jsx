"use client";

// Startseite der Master-Zentrale: Gesamtstatus aller Geschaeftsbereiche (27.09.2026).
// Rechnet nur mit echten, geladenen Daten (lib/gesamtstatus.js); jede Zahl zeigt ihren Rechenweg.
import { useEffect, useState } from "react";
import { adminFetch } from "../../lib/admin-fetch.js";
import { berechneGesamtstatus } from "../../lib/gesamtstatus.js";

const eur = c => (c / 100).toLocaleString("de-DE", { style: "currency", currency: "EUR" });

export function Gesamtstatus({ businesses, tasks, tasksLocked, systems, finance, qualityGate, goTo }) {
  const [eq, setEq] = useState(null);
  const [ecKunden, setEcKunden] = useState(null);
  useEffect(() => {
    adminFetch("/api/master/businesses?einnahmequellen=1").then(r => r.ok ? r.json() : null).then(d => setEq(d?.einnahmequellen || null)).catch(() => {});
    adminFetch("/api/orders?type=customers").then(r => r.ok ? r.json() : null).then(d => setEcKunden(d?.customers || null)).catch(() => {});
  }, []);
  const g = berechneGesamtstatus({ businesses, tasks, tasksLocked, systems, finance, einnahmequellen: eq, ecKunden, qualityGate });
  const oeffne = ziel => ziel.startsWith("/") ? window.location.assign(ziel) : goTo?.(ziel);
  const kacheln = [
    ["Systemstatus", g.system.ampel, g.system, "alerts"],
    ["Aktive Projekte", g.projekteAktiv.wert, g.projekteAktiv, "bereiche"],
    ["Pausierte Projekte", g.projektePausiert.wert, g.projektePausiert, "bereiche"],
    ["Fehler", g.fehler.wert, g.fehler, "alerts"],
    ["Offene Aufgaben", g.aufgaben.wert ?? "—", g.aufgaben, "tasks"],
    ["Laufende Automatisierungen", g.automationen.wert ?? "—", g.automationen, "automation"],
    ["Einnahmen", eur(g.einnahmen.cent), g.einnahmen, "finance"],
    ["Kosten", eur(g.kosten.cent), g.kosten, "finance"],
    ["Gewinn", eur(g.gewinn.cent), g.gewinn, "finance"],
    ["Kunden", g.kunden.wert, g.kunden, "/werknetz24"],
    ["Leads", g.leads.wert ?? "—", g.leads, "/werknetz24"],
    ["Warnungen", g.warnungen.length, { rechenweg: ["Details in der Liste darunter"] }, null],
  ];
  return <section className="gs" aria-label="Gesamtstatus">
    <div className="gsGrid">{kacheln.map(([titel, wert, info, ziel]) =>
      <button type="button" className="gsKachel" key={titel} onClick={() => ziel && oeffne(ziel)} disabled={!ziel}>
        <span>{titel}</span><strong>{wert}</strong>
        {info.vollstaendig === false && <em>unvollständig</em>}
        <small>{info.rechenweg.join(" · ")}</small>
      </button>)}
    </div>
    <div className="gsWarn"><h3>Wichtige Warnungen ({g.warnungen.length})</h3>
      {!g.warnungen.length && <p>Keine Warnungen.</p>}
      {g.warnungen.map((w, i) => <button type="button" key={i} className={"gsW " + w.stufe} onClick={() => oeffne(w.ziel)}>{w.stufe === "rot" ? "🔴" : "🟡"} {w.text}</button>)}
    </div>
    <style dangerouslySetInnerHTML={{ __html: GS_CSS }} />
  </section>;
}

const GS_CSS = `.gs{margin:0 0 18px}.gsGrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px}
.gsKachel{text-align:left;background:#fff;border:1px solid #eaecf0;border-radius:12px;padding:12px;display:flex;flex-direction:column;gap:4px;cursor:pointer;font:inherit;color:inherit;min-width:0}
.gsKachel:hover:not(:disabled){border-color:#98a2b3}.gsKachel:disabled{cursor:default}.gsKachel span{font-size:12px;color:#667085;font-weight:700}
.gsKachel strong{font-size:22px}.gsKachel em{font-style:normal;font-size:11px;color:#b54708;font-weight:700}.gsKachel small{font-size:11px;color:#667085;overflow-wrap:anywhere}
.gsWarn{background:#fff;border:1px solid #eaecf0;border-radius:12px;padding:12px;margin-top:10px}.gsWarn h3{margin:0 0 8px;font-size:15px}.gsWarn p{margin:0;color:#667085;font-size:13px}
.gsW{display:block;width:100%;text-align:left;border:0;background:none;padding:6px 4px;font:inherit;font-size:13px;cursor:pointer;border-top:1px solid #f2f4f7;overflow-wrap:anywhere}.gsW:hover{background:#f9fafb}.gsW.rot{color:#b42318}`;
