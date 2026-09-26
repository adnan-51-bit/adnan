"use client";

// Client-Helfer fuer geschuetzte Aufrufe gegen die eigene API (Phase 4, Quality Gate). Haengt das
// lokal gespeicherte Admin-Secret als Bearer-Token an; fragt einmalig danach (window.prompt), wenn
// keins gespeichert ist oder der Server 401 liefert, und wiederholt den Aufruf danach genau einmal.
// Rein clientseitige Bequemlichkeit wie bei Werknetz24s eigenem ADMIN_SECRET-Muster - kein Ersatz
// fuer eine echte Benutzerverwaltung.
//
// Full-System-Audit Phase 2 (26.09.2026): seit auch LESEZUGRIFFE auf Werknetz24-Daten das Secret
// brauchen, fragte eine Seite ohne gespeichertes Secret bei jedem einzelnen Aufruf erneut nach
// (live gemessen: 46 Abfragen bei einem Rundgang nach "Abbrechen"). Jetzt: wer die Abfrage
// abbricht, wird fuer reine Lesezugriffe in diesem Browser-Tab nicht erneut gefragt (die Seiten
// zeigen dann ehrlich "Anmeldung erforderlich"). Schreibaktionen fragen weiterhin jedes Mal.
const STORAGE_KEY = "master_api_secret";
const DECLINED_KEY = "master_api_secret_declined";

function getStoredSecret() {
  try { return localStorage.getItem(STORAGE_KEY) || ""; } catch { return ""; }
}

function readDeclined() {
  try { return sessionStorage.getItem(DECLINED_KEY) === "1"; } catch { return false; }
}

function writeDeclined(value) {
  try { if (value) sessionStorage.setItem(DECLINED_KEY, "1"); else sessionStorage.removeItem(DECLINED_KEY); } catch { /* ignore */ }
}

function promptForSecret() {
  if (typeof window === "undefined") return "";
  const value = window.prompt("Admin-Secret für diese Aktion eingeben:");
  if (value) {
    try { localStorage.setItem(STORAGE_KEY, value); } catch { /* ignore */ }
    writeDeclined(false);
  } else {
    writeDeclined(true);
  }
  return value || "";
}

function isReadOnly(options) {
  return !options.method || String(options.method).toUpperCase() === "GET";
}

export async function adminFetch(url, options = {}) {
  const mayPrompt = !(isReadOnly(options) && readDeclined());
  let secret = getStoredSecret();
  if (!secret && mayPrompt) secret = promptForSecret();
  const doFetch = token => fetch(url, { ...options, headers: { ...(options.headers || {}), ...(token ? { Authorization: "Bearer " + token } : {}) } });
  let response = await doFetch(secret);
  if (response.status === 401 && (!isReadOnly(options) || !readDeclined())) {
    secret = promptForSecret();
    if (secret) response = await doFetch(secret);
  }
  return response;
}

// 26.09.2026: Abmelden (vorher fehlte das - das Secret blieb dauerhaft im Browser, auch auf fremden
// Geraeten). Entfernt das gespeicherte Secret und die "abgelehnt"-Markierung; Gegenstueck zu
// logoutAdmin() in der Werknetz24-Admin-Zentrale.
export function hasStoredSecret() {
  return Boolean(getStoredSecret());
}

export function logoutMaster() {
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  writeDeclined(false);
}
