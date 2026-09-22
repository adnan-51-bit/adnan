"use client";

// Phase 2 (Multi-Business-Struktur, 21.09.2026): s. app/e-commerce/page.jsx, Tab "automation".
// Die Automations-Engine (lib/automation.js, /api/automation) war bereits explizit als
// E-Commerce-Funktion gekennzeichnet ("E-COMMERCE · AUTOMATION") - gehört deshalb strukturell
// korrekt ins E-Commerce-Dashboard statt als eigenständige, lose Seite zu existieren.
import { useEffect } from "react";

export default function AutomationRedirect() {
  useEffect(() => { window.location.replace("/e-commerce?tab=automation"); }, []);
  return <p style={{ fontFamily: "Inter,system-ui,sans-serif", padding: 24 }}>Weiterleitung zum E-Commerce-Dashboard (Automationen) …</p>;
}
