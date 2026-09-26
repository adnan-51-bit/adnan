// Gemeinsamer Stil der Shop-Seiten (/laden, /laden/danke).
export const LADEN_CSS = `.laden{max-width:960px;margin:0 auto;padding:24px 16px;font-family:Inter,ui-sans-serif,system-ui,sans-serif;color:#101828;background:#fff;min-height:100vh}
.laden h1{font-size:28px;margin:0 0 20px}.laden .raster{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px;margin-bottom:20px}
.laden .karte{border:1px solid #e4e7ec;border-radius:12px;padding:18px;display:flex;flex-direction:column;gap:8px}
.laden label{display:flex;flex-direction:column;gap:4px;font-size:14px}.laden input{padding:9px;border:1px solid #d0d5dd;border-radius:8px;font:inherit}
.laden button{padding:12px;border:0;border-radius:10px;background:#101828;color:#fff;font-weight:700;cursor:pointer}.laden button:disabled{opacity:.6}
.laden .fehler{color:#b42318}.laden .hinweis{color:#b54708}.laden footer{display:flex;flex-wrap:wrap;gap:16px;margin-top:32px;padding-top:16px;border-top:1px solid #eaecf0;font-size:14px}
.laden a{color:#175cd3}`;
// Ergaenzung Sortiert24 (26.09.2026): Kopfzeile, Kategorien, Bilder, Warenkorb, Detail-Dialog.
export const LADEN_CSS_2 = `.laden header{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}
.laden .korbLink{font-weight:700;text-decoration:none}.laden .kategorien{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px}
.laden .kategorien button,.laden .zweit{background:#fff;color:#101828;border:1px solid #d0d5dd}.laden .kategorien .aktiv{background:#101828;color:#fff}
.laden .bild{width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:8px;background:#f2f4f7}.laden .zeile{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.laden .zeile button{flex:1}.laden .posten{justify-content:space-between;border-bottom:1px solid #f2f4f7;padding:6px 0}.laden .posten input{width:70px}
.laden .summe{font-size:17px;border-bottom:0}.laden .dialogHintergrund{position:fixed;inset:0;background:rgba(16,24,40,.5);display:flex;align-items:center;justify-content:center;padding:16px;z-index:10}
.laden .dialog{background:#fff;max-width:560px;width:100%;max-height:90vh;overflow:auto;position:relative}.laden .schliessen{position:absolute;top:10px;right:10px;padding:4px 12px}
.laden .galerie{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:8px}.laden .galerie img{width:100%;border-radius:8px}.laden .beschreibung{white-space:pre-wrap;line-height:1.6}`;
