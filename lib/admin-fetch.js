"use client";

// Client-Helfer fuer geschuetzte Aufrufe gegen die eigene API. Haengt das lokal gespeicherte
// Master-Secret als Bearer-Token an.
//
// 26.09.2026 (Anmeldeseite statt Browser-Fenster): vorher fragte ein window.prompt nach dem Secret -
// ohne Hinweis "Code falsch", und ein falsch gespeicherter Code blieb dauerhaft haengen (Adnan hatte den
// 13-stelligen Werknetz24-Code gespeichert und kam nicht mehr rein). Jetzt:
// - Lesen ohne gueltige Anmeldung: keine Rueckfrage, die Seiten zeigen "Anmeldung erforderlich".
// - Schreiben ohne gueltige Anmeldung: Weiterleitung zu /anmelden (mit Ruecksprung).
// - Lehnt der Server einen gespeicherten Code ab (401), wird er entfernt - kein Haengenbleiben.
const STORAGE_KEY = "master_api_secret";
const DECLINED_KEY = "master_api_secret_declined"; // Altlast aus dem Prompt-Verfahren, wird nur noch aufgeraeumt

function getStoredSecret() {
  try { return localStorage.getItem(STORAGE_KEY) || ""; } catch { return ""; }
}

function isReadOnly(options) {
  return !options.method || String(options.method).toUpperCase() === "GET";
}

// Nur interne Pfade als Ruecksprungziel (kein offener Redirect auf fremde Seiten).
export function sicheresZiel(ziel) {
  const z = String(ziel || "");
  return z.startsWith("/") && !z.startsWith("//") && !z.startsWith("/\\") ? z : "/master";
}

export function anmeldeUrl() {
  if (typeof window === "undefined") return "/anmelden";
  return "/anmelden?zurueck=" + encodeURIComponent(sicheresZiel(window.location.pathname + window.location.search));
}

export function hasStoredSecret() {
  return Boolean(getStoredSecret());
}

export function speichereSecret(secret) {
  try { localStorage.setItem(STORAGE_KEY, secret); sessionStorage.removeItem(DECLINED_KEY); } catch { /* ignore */ }
}

export function logoutMaster() {
  try { localStorage.removeItem(STORAGE_KEY); sessionStorage.removeItem(DECLINED_KEY); } catch { /* ignore */ }
}

export async function adminFetch(url, options = {}) {
  const secret = getStoredSecret();
  const response = await fetch(url, { ...options, headers: { ...(options.headers || {}), ...(secret ? { Authorization: "Bearer " + secret } : {}) } });
  if (response.status === 401) {
    if (secret) logoutMaster(); // gespeicherter Code ist falsch oder veraltet
    if (!isReadOnly(options) && typeof window !== "undefined" && window.location) window.location.assign(anmeldeUrl());
  }
  return response;
}
