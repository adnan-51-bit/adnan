"use client";

// Client-Helfer fuer schreibende Aufrufe (POST/PATCH) gegen die eigene, jetzt geschuetzte API
// (Phase 4, Quality Gate). Haengt das lokal gespeicherte Admin-Secret als Bearer-Token an; fragt
// einmalig danach (window.prompt), wenn keins gespeichert ist oder der Server 401 liefert, und
// wiederholt den Aufruf danach genau einmal. Rein clientseitige Bequemlichkeit wie bei
// Werknetz24s eigenem ADMIN_SECRET-Muster - kein Ersatz fuer eine echte Benutzerverwaltung.
const STORAGE_KEY = "master_api_secret";

function getStoredSecret() {
  try { return localStorage.getItem(STORAGE_KEY) || ""; } catch { return ""; }
}

function promptForSecret() {
  if (typeof window === "undefined") return "";
  const value = window.prompt("Admin-Secret für diese Aktion eingeben:");
  if (value) { try { localStorage.setItem(STORAGE_KEY, value); } catch { /* ignore */ } }
  return value || "";
}

export async function adminFetch(url, options = {}) {
  let secret = getStoredSecret();
  if (!secret) secret = promptForSecret();
  const doFetch = token => fetch(url, { ...options, headers: { ...(options.headers || {}), Authorization: "Bearer " + token } });
  let response = await doFetch(secret);
  if (response.status === 401) {
    secret = promptForSecret();
    if (secret) response = await doFetch(secret);
  }
  return response;
}
