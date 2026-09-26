"use client";

// Anmelden/Abmelden-Knopf fuer die Kopfzeilen (Master, E-Commerce, Werknetz24-Uebersicht), 26.09.2026.
import { useEffect, useState } from "react";
import { hasStoredSecret, logoutMaster, anmeldeUrl } from "../../lib/admin-fetch.js";

export function AnmeldeKnopf() {
  const [angemeldet, setAngemeldet] = useState(null);
  const [ziel, setZiel] = useState("/anmelden");
  useEffect(() => { setAngemeldet(hasStoredSecret()); setZiel(anmeldeUrl()); }, []);
  if (angemeldet === null) return null;
  if (!angemeldet) return <a href={ziel} data-testid="anmelden">⎆ Anmelden</a>;
  return <a href="/master" data-testid="abmelden" onClick={e => {
    e.preventDefault();
    if (!window.confirm("Wirklich abmelden? Der gespeicherte Code wird aus diesem Browser entfernt.")) return;
    logoutMaster(); window.location.reload();
  }}>⎋ Abmelden</a>;
}
