// Schreibschutz fuer die eigene Master-Zentrale-API (Phase 4, Quality Gate, 20.09.2026).
//
// Fund: alle mutierenden Endpunkte (/api/master/*, /api/orders POST/PATCH) hatten bislang KEINE
// Authentifizierung - jeder mit der URL haette Betriebe, Aufgaben, Finanzbuchungen, Produkte,
// Lieferanten und Bestellungen aendern koennen. GET bleibt bewusst offen (interne Dashboard-
// Ansichten, aktuell keine echten Kundendaten live) - nur Schreibzugriffe werden geschuetzt.
//
// Eigenes Secret (MASTER_API_SECRET), getrennt von WERKNETZ24_STATUS_SECRET (das schuetzt die
// ausgehende Verbindung zu Werknetz24). Seit 27.09.2026 darf es auf Adnans Wunsch denselben Wert
// wie sein Werknetz24-Login haben - deshalb die Sperre nach Fehlversuchen unten.
import crypto from "crypto";

export function timingSafeEqualString(a, b) {
  const bufA = Buffer.from(String(a ?? ""));
  const bufB = Buffer.from(String(b ?? ""));
  if (bufA.length !== bufB.length) {
    // Vergleich mit sich selbst, um die Zeitdifferenz durch unterschiedliche Laengen zu
    // verkleinern (kein perfekter Schutz, aber besser als ein sofortiges Kurzschluss-return).
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

// ---- Sperre nach Fehlversuchen (27.09.2026), wie beim Werknetz24-Login ----
// 5 falsche Codes pro IP innerhalb von 15 Minuten -> 15 Minuten gesperrt (429), gezaehlt ab dem ERSTEN
// Fehlversuch. Gezaehlt wird nur ein mitgeschickter, falscher Code - Aufrufe ohne Code (oeffentliche
// Ansicht) zaehlen nicht. Ein richtiger Code setzt den Zaehler zurueck. Speicher: Supabase-Tabelle
// master_login_sperre (nur service_role); ohne Supabase (Tests) ein Zwischenspeicher im Prozess.
export const SPERRE_MAX_FEHLVERSUCHE = 5;
export const SPERRE_DAUER_MS = 15 * 60 * 1000;
const speicher = new Map();

function clientIp(request) {
  const h = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "";
  return String(h).split(",")[0].trim() || "unbekannt";
}

const supabaseAktiv = () => Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SECRET_KEY);
async function sb(pfad, options = {}) {
  const r = await fetch(process.env.SUPABASE_URL + "/rest/v1/" + pfad, { ...options, headers: { apikey: process.env.SUPABASE_SECRET_KEY, Authorization: "Bearer " + process.env.SUPABASE_SECRET_KEY, "Content-Type": "application/json", ...(options.headers || {}) } });
  if (!r.ok) throw new Error("Sperr-Speicher: HTTP " + r.status);
  return r.status === 204 ? null : r.json().catch(() => null);
}

async function leseSperre(ip) {
  if (!supabaseAktiv()) return speicher.get(ip) || null;
  const rows = await sb("master_login_sperre?select=*&ip=eq." + encodeURIComponent(ip));
  return rows?.[0] ? { fehlversuche: rows[0].fehlversuche, erster_fehler: Date.parse(rows[0].erster_fehler) } : null;
}
async function schreibeSperre(ip, eintrag) {
  if (!supabaseAktiv()) { speicher.set(ip, eintrag); return; }
  await sb("master_login_sperre?on_conflict=ip", { method: "POST", headers: { Prefer: "resolution=merge-duplicates" }, body: JSON.stringify({ ip, fehlversuche: eintrag.fehlversuche, erster_fehler: new Date(eintrag.erster_fehler).toISOString() }) });
}
async function loescheSperre(ip) {
  if (!supabaseAktiv()) { speicher.delete(ip); return; }
  await sb("master_login_sperre?ip=eq." + encodeURIComponent(ip), { method: "DELETE" });
}

export function resetLoginSperreFuerTests() { speicher.clear(); }

// Gibt bei Erfolg null zurueck, sonst {status, error} zur direkten Verwendung in einer
// NextResponse/Response.json(...) Antwort des Aufrufers. Seit 27.09.2026 async (Sperre).
export async function checkAdminSecret(request, { jetzt = Date.now() } = {}) {
  const secret = process.env.MASTER_API_SECRET;
  if (!secret) return { status: 503, error: "MASTER_API_SECRET nicht konfiguriert - Schreibzugriff gesperrt." };
  const header = request.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return { status: 401, error: "Unauthorized" };

  const ip = clientIp(request);
  let eintrag = null;
  try { eintrag = await leseSperre(ip); } catch { /* Speicher nicht erreichbar: Code-Pruefung trotzdem, fail-closed bleibt der Code */ }
  if (eintrag && jetzt - eintrag.erster_fehler > SPERRE_DAUER_MS) { eintrag = null; try { await loescheSperre(ip); } catch {} }
  if (eintrag && eintrag.fehlversuche >= SPERRE_MAX_FEHLVERSUCHE) {
    return { status: 429, error: "Zu viele Fehlversuche. Bitte in 15 Minuten erneut versuchen." };
  }
  if (!timingSafeEqualString(token, secret)) {
    try { await schreibeSperre(ip, { fehlversuche: (eintrag?.fehlversuche || 0) + 1, erster_fehler: eintrag?.erster_fehler || jetzt }); } catch {}
    return { status: 401, error: "Unauthorized" };
  }
  if (eintrag) { try { await loescheSperre(ip); } catch {} }
  return null;
}
