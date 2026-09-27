// Kleiner Supabase-Tabellenzugriff mit Speicher-Fallback (fuer Tests/ohne DB) - 27.09.2026.
// Gleiches Muster wie lib/einnahmequellen.js, hier wiederverwendbar fuer Content und Freigaben.
const speicher = globalThis.__MASTER_TABELLEN__ || (globalThis.__MASTER_TABELLEN__ = new Map());
const aktiv = () => Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SECRET_KEY);
async function sb(pfad, options = {}) {
  const r = await fetch(process.env.SUPABASE_URL + "/rest/v1/" + pfad, { ...options, headers: { apikey: process.env.SUPABASE_SECRET_KEY, Authorization: "Bearer " + process.env.SUPABASE_SECRET_KEY, "Content-Type": "application/json", Prefer: "return=representation", ...(options.headers || {}) } });
  if (!r.ok) throw new Error(pfad.split("?")[0] + ": HTTP " + r.status + " " + (await r.text()).slice(0, 200));
  return r.status === 204 ? null : r.json();
}
export function tabelle(name, sortierung = "erstellt_am.asc") {
  const mem = () => { if (!speicher.has(name)) speicher.set(name, new Map()); return speicher.get(name); };
  return {
    async liste() { return aktiv() ? sb(`${name}?select=*&order=${sortierung}`) : [...mem().values()]; },
    async hole(id) { const r = aktiv() ? (await sb(`${name}?select=*&id=eq.${encodeURIComponent(id)}`))[0] : mem().get(id); return r || null; },
    async neu(zeile) { if (aktiv()) return (await sb(name, { method: "POST", body: JSON.stringify(zeile) }))[0]; mem().set(zeile.id, zeile); return zeile; },
    async aendere(id, patch) {
      if (aktiv()) { const r = await sb(`${name}?id=eq.${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(patch) }); if (!r?.[0]) throw new Error("nicht gefunden"); return r[0]; }
      const alt = mem().get(id); if (!alt) throw new Error("nicht gefunden"); const n = { ...alt, ...patch }; mem().set(id, n); return n;
    },
    leeren() { mem().clear(); },
  };
}
export const neueId = praefix => praefix + "_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
