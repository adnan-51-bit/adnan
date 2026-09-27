// Sortiert24 - zentrale Shop-Einstellungen (26.09.2026, Name von Adnan gewaehlt).
export const SHOP_NAME = "Sortiert24";

// Versandkosten pro Bestellung in Cent. BEWUSST null: wird erst eingetragen, wenn Adnan sie mit
// echten Lieferantenkonditionen festgelegt hat (0 = kostenloser Versand ist eine erlaubte Entscheidung).
// Solange null, bleibt der Shop geschlossen (Start-Checkliste "Versandkosten festgelegt").
export const VERSANDKOSTEN_CENT = null;

// Umsatzsteuersatz fuer die Umrechnung Endpreis (brutto) -> netto in der Kalkulation. 19 % = deutscher
// Regelsatz (§ 12 Abs. 1 UStG). ANNAHME Regelbesteuerung: ob Sortiert24 Kleinunternehmer (§ 19 UStG, dann 0)
// wird, entscheidet sich erst mit der Gewerbeanmeldung - dann hier anpassen.
export const UMSATZSTEUER_SATZ = 19;

// Verkaufsgebuehr TikTok Shop in Prozent vom Verkaufspreis (27.09.2026). Quellen nennen 5–9 % je nach Kategorie,
// seit Januar 2026 9 % (Elektronik 7 %): https://www.office1.cloud/en/guide/tiktok-shop-2026-fees-german-sellers ,
// https://kostenlose-erechnung.de/ratgeber/tiktok-shop-verkaeufer-gewerbe-rechnung/ - vorsichtig mit 9 % gerechnet.
// Vor dem Start im TikTok-Seller-Center fuer die konkrete Kategorie pruefen und hier anpassen.
export const TIKTOK_PROVISION_PROZENT = 9;
