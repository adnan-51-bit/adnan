"use client";

import { useEffect, useState } from "react";
import { SHOP_NAME } from "../../../lib/shop-marke.js";
import { LADEN_CSS } from "../../../lib/laden-stil.js";

// Rueckkehr nach der Stripe-Bezahlung. Die Zahlung gilt erst als bestaetigt, wenn Stripe den
// signierten Webhook geschickt hat - diese Seite behauptet deshalb nichts Endgueltiges.
export default function Danke() {
  const [nr, setNr] = useState("");
  useEffect(() => { setNr(new URLSearchParams(window.location.search).get("bestellung") || ""); }, []);
  return <main className="laden">
    <header><h1>{SHOP_NAME}</h1></header>
    <section className="karte"><h2>Vielen Dank für Ihre Bestellung!</h2>
      <p>Sobald Ihre Zahlung bestätigt ist, erhalten Sie eine Bestätigung per E-Mail.</p>
      {nr && <p><small>Bestellnummer: {nr}</small></p>}
      <p><a href="/laden">Zurück zum Shop</a></p></section>
    <style dangerouslySetInnerHTML={{ __html: LADEN_CSS }} />
  </main>;
}
