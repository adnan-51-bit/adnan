import { SHOP_NAME } from "../../lib/shop-marke.js";

// Eigener Titel fuer die E-Commerce-Zentrale (26.09.2026) - vorher "Werknetz24 Master-Zentrale" im Browser-Tab,
// obwohl E-Commerce ein eigenes, von Werknetz24 getrenntes Projekt ist. Interne Seite: nicht indexieren.
export const metadata = { title: SHOP_NAME + " – E-Commerce-Zentrale", robots: { index: false, follow: false } };

export default function ECommerceLayout({ children }) { return children; }
