// Schreibschutz fuer die eigene Master-Zentrale-API (Phase 4, Quality Gate, 20.09.2026).
//
// Fund: alle mutierenden Endpunkte (/api/master/*, /api/orders POST/PATCH) hatten bislang KEINE
// Authentifizierung - jeder mit der URL haette Betriebe, Aufgaben, Finanzbuchungen, Produkte,
// Lieferanten und Bestellungen aendern koennen. GET bleibt bewusst offen (interne Dashboard-
// Ansichten, aktuell keine echten Kundendaten live) - nur Schreibzugriffe werden geschuetzt.
//
// Eigenes Secret (MASTER_API_SECRET), getrennt von WERKNETZ24_STATUS_SECRET (das schuetzt die
// ausgehende Verbindung zu Werknetz24) und von Werknetz24s eigenem ADMIN_SECRET.
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

// Gibt bei Erfolg null zurueck, sonst {status, error} zur direkten Verwendung in einer
// NextResponse/Response.json(...) Antwort des Aufrufers.
export function checkAdminSecret(request) {
  const secret = process.env.MASTER_API_SECRET;
  if (!secret) return { status: 503, error: "MASTER_API_SECRET nicht konfiguriert - Schreibzugriff gesperrt." };
  const header = request.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token || !timingSafeEqualString(token, secret)) return { status: 401, error: "Unauthorized" };
  return null;
}
