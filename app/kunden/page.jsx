"use client";

// Phase 2 (Multi-Business-Struktur, 21.09.2026): s. app/e-commerce/page.jsx, Tab "kunden".
import { useEffect } from "react";

export default function KundenRedirect() {
  useEffect(() => { window.location.replace("/e-commerce?tab=kunden"); }, []);
  return <p style={{ fontFamily: "Inter,system-ui,sans-serif", padding: 24 }}>Weiterleitung zum E-Commerce-Dashboard (Kunden) …</p>;
}
