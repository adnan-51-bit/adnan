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
