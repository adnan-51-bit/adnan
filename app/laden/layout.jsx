import { SHOP_NAME } from "../../lib/shop-marke.js";

// Eigener Seitentitel fuer den Shop (26.09.2026): vorher erbte /laden den Titel "Werknetz24 Master-Zentrale"
// aus app/layout - Kunden haetten im Browser-Tab den Namen der internen Zentrale gesehen.
export const metadata = { title: SHOP_NAME, description: SHOP_NAME + " – Online-Shop", robots: { index: false, follow: false } };

export default function LadenLayout({ children }) { return children; }
