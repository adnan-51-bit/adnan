// Read-only Verbindung zum separaten Werknetz24-System (adnan-51-bit/werknetz24-landing).
//
// Phase 2 ("Werknetz24 mit Master-Zentrale verbinden", 20.09.2026). Bewusst NUR lesend und
// bewusst mit einem EIGENEN, engen Secret (WERKNETZ24_STATUS_SECRET) - dieses System bekommt
// niemals das echte Werknetz24-ADMIN_SECRET und damit niemals Schreib-/Vollzugriff auf
// Kundendaten, Rechnungen o.ae. Der Gegenendpunkt (?type=master-zentrale-status in
// werknetz24-landing/api/customers.js) liefert ebenfalls bewusst nur aggregierte Kennzahlen,
// keine Rohdaten.
//
// Ehrlichkeitsprinzip: ohne konfiguriertes Secret wird { configured: false } zurueckgegeben,
// niemals erfundene Daten. Kein neuer API-Route-Slot noetig - dieses Modul wird direkt aus
// lib/master-store.js aufgerufen (das Repo hat mit 12 Routen bereits das Vercel-Hobby-Limit
// erreicht, s. docs/PROJECT-AUDIT.md im Schwester-Repo).

const DEFAULT_URL = "https://werknetz24.de/api/customers?type=master-zentrale-status";
const TIMEOUT_MS = 5000;

export function werknetz24ConnectorConfigured() {
  return Boolean(process.env.WERKNETZ24_STATUS_SECRET);
}

export async function fetchWerknetz24Status(fetchImpl = fetch) {
  if (!werknetz24ConnectorConfigured()) {
    return { configured: false, reason: "WERKNETZ24_STATUS_SECRET nicht gesetzt" };
  }
  const url = process.env.WERKNETZ24_STATUS_URL || DEFAULT_URL;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetchImpl(url, {
      headers: { Authorization: `Bearer ${process.env.WERKNETZ24_STATUS_SECRET}` },
      signal: controller.signal,
      cache: "no-store",
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.ok) {
      return { configured: true, ok: false, error: (data && data.error) || `HTTP ${response.status}` };
    }
    return { configured: true, ok: true, data, fetchedAt: new Date().toISOString() };
  } catch (error) {
    const message = error && error.name === "AbortError" ? "Zeitüberschreitung (Werknetz24 hat nicht rechtzeitig geantwortet)" : error.message;
    return { configured: true, ok: false, error: message };
  } finally {
    clearTimeout(timeout);
  }
}

// Kalender-Baustein (22.09.2026, "Kommandozentrale"-Folgeauftrag, erster echter Schreibzugriff
// der Master-Zentrale auf Werknetz24). GET nutzt weiterhin WERKNETZ24_STATUS_SECRET (dasselbe
// bereits etablierte, rein lesende Secret wie fetchWerknetz24Status). POST (Termin anlegen)
// verlangt ein NEUES, separates WERKNETZ24_WRITE_SECRET - Gegenstueck zu
// MASTER_ZENTRALE_WRITE_SECRET in werknetz24-landing. Ein kompromittiertes Lese-Secret darf
// dadurch nie einen echten Kalendertermin anlegen koennen. Gleiches Ehrlichkeitsprinzip wie oben:
// ohne Secret { configured:false }, nie erfundene Termine.

const KALENDER_URL = "https://werknetz24.de/api/customers?type=master-zentrale-kalender";

export function werknetz24WriteConfigured() {
  return Boolean(process.env.WERKNETZ24_WRITE_SECRET);
}

export async function fetchWerknetz24Kalender(fetchImpl = fetch) {
  if (!werknetz24ConnectorConfigured()) {
    return { configured: false, reason: "WERKNETZ24_STATUS_SECRET nicht gesetzt" };
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetchImpl(KALENDER_URL, {
      headers: { Authorization: `Bearer ${process.env.WERKNETZ24_STATUS_SECRET}` },
      signal: controller.signal,
      cache: "no-store",
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.ok) {
      return { configured: true, ok: false, error: (data && data.error) || `HTTP ${response.status}` };
    }
    return { configured: true, ok: true, termine: data.termine || [], fetchedAt: new Date().toISOString() };
  } catch (error) {
    const message = error && error.name === "AbortError" ? "Zeitüberschreitung (Werknetz24 hat nicht rechtzeitig geantwortet)" : error.message;
    return { configured: true, ok: false, error: message };
  } finally {
    clearTimeout(timeout);
  }
}

// Aufgaben + Rechnungen (22.09.2026, "alles fertig machen, was ohne mich geht"-Folgeauftrag).
// Beide rein lesend, nutzen bewusst dasselbe bereits etablierte WERKNETZ24_STATUS_SECRET (kein
// neues Secret). Gehören NUR auf die eigene, dedizierte /werknetz24-Seite - nirgendwo sonst in
// diesem Repo (Adnans ausdrücklicher Wunsch, Bereiche nicht zu vermischen).

const AUFGABEN_URL = "https://werknetz24.de/api/customers?type=master-zentrale-aufgaben";
const RECHNUNGEN_URL = "https://werknetz24.de/api/customers?type=master-zentrale-rechnungen";

async function fetchWerknetz24Read(url, fetchImpl) {
  if (!werknetz24ConnectorConfigured()) {
    return { configured: false, reason: "WERKNETZ24_STATUS_SECRET nicht gesetzt" };
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetchImpl(url, {
      headers: { Authorization: `Bearer ${process.env.WERKNETZ24_STATUS_SECRET}` },
      signal: controller.signal,
      cache: "no-store",
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.ok) {
      return { configured: true, ok: false, error: (data && data.error) || `HTTP ${response.status}` };
    }
    return { configured: true, ok: true, data, fetchedAt: new Date().toISOString() };
  } catch (error) {
    const message = error && error.name === "AbortError" ? "Zeitüberschreitung (Werknetz24 hat nicht rechtzeitig geantwortet)" : error.message;
    return { configured: true, ok: false, error: message };
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchWerknetz24Aufgaben(fetchImpl = fetch) {
  const result = await fetchWerknetz24Read(AUFGABEN_URL, fetchImpl);
  if (result.ok) return { ...result, aufgaben: result.data.aufgaben || [] };
  return result;
}

export async function fetchWerknetz24Rechnungen(fetchImpl = fetch) {
  const result = await fetchWerknetz24Read(RECHNUNGEN_URL, fetchImpl);
  if (result.ok) return { ...result, rechnungen: result.data.rechnungen || [] };
  return result;
}

export async function createWerknetz24KalenderTermin({ summary, description, startISO, endISO }, fetchImpl = fetch) {
  if (!werknetz24WriteConfigured()) {
    return { configured: false, reason: "WERKNETZ24_WRITE_SECRET nicht gesetzt" };
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetchImpl(KALENDER_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.WERKNETZ24_WRITE_SECRET}`, "Content-Type": "application/json" },
      body: JSON.stringify({ summary, description, startISO, endISO }),
      signal: controller.signal,
      cache: "no-store",
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.ok) {
      return { configured: true, ok: false, error: (data && data.error) || `HTTP ${response.status}` };
    }
    return { configured: true, ok: true, termin: data.termin };
  } catch (error) {
    const message = error && error.name === "AbortError" ? "Zeitüberschreitung (Werknetz24 hat nicht rechtzeitig geantwortet)" : error.message;
    return { configured: true, ok: false, error: message };
  } finally {
    clearTimeout(timeout);
  }
}
