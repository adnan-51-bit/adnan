"use client";

// Phase 2 (Multi-Business-Struktur, 21.09.2026): s. app/e-commerce/page.jsx, Tab "retouren".
import { useEffect } from "react";

export default function RetourenRedirect() {
  useEffect(() => { window.location.replace("/e-commerce?tab=retouren"); }, []);
  return <p style={{ fontFamily: "Inter,system-ui,sans-serif", padding: 24 }}>Weiterleitung zum E-Commerce-Dashboard (Retouren) …</p>;
}
