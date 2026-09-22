"use client";

// Phase 2 (Multi-Business-Struktur, 21.09.2026): diese Funktion lebt jetzt als Tab im
// konsolidierten E-Commerce-Dashboard (s. app/e-commerce/page.jsx, Tab "pipeline"). Diese Route
// bleibt als Weiterleitung bestehen, damit kein bestehender Link (z. B. aus der Master-Zentrale
// oder Lesezeichen) ins Leere läuft - keine Funktion wurde entfernt, nur konsolidiert.
import { useEffect } from "react";

export default function ProduktPipelineRedirect() {
  useEffect(() => { window.location.replace("/e-commerce?tab=pipeline"); }, []);
  return <p style={{ fontFamily: "Inter,system-ui,sans-serif", padding: 24 }}>Weiterleitung zum E-Commerce-Dashboard (Produkt-Pipeline) …</p>;
}
