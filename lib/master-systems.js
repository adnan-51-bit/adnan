import {writeAudit} from "./audit.js";
import {providerStatus} from "./providers.js";

// Echtes Systemmonitoring statt reiner manueller Notizen (22.09.2026, "Kommandozentrale"-
// Folgeauftrag Teil B). Fuer Systeme, bei denen ein echtes, kostenloses Signal existiert (gesetzte
// Env-Var, GitHub-API, "diese Funktion laeuft gerade auf Vercel"), wird der gespeicherte manuelle
// Status bei jedem Abruf durch einen frisch berechneten ueberschrieben - Quelle der Wahrheit ist
// dann der echte Zustand, nicht eine womoeglich veraltete manuelle Notiz. Systeme ohne
// server-seitiges Signal (Famulor/Easybell/PayPal - keine hier hinterlegten API-Schluessel, s.
// docs/MASTER-CONTROL-ARCHITECTURE.md im werknetz24-landing-Repo) bleiben bewusst manuell
// editierbar, statt einen erfundenen Live-Status vorzutaeuschen.
const AUTO_CHECKED_IDS = ["vercel","supabase","stripe","shopify","email","slack","github"];

async function checkGithub(){
  try{
    const controller = new AbortController();
    const timeout = setTimeout(()=>controller.abort(), 4000);
    const r = await fetch("https://api.github.com/repos/adnan-51-bit/adnan/commits/main/status", { signal: controller.signal, headers:{Accept:"application/vnd.github+json"} });
    clearTimeout(timeout);
    if(!r.ok) return { status:"🟡", note:`GitHub-API antwortete mit HTTP ${r.status}` };
    const data = await r.json();
    if (data.state === "success") return { status:"🟢", note:"Letzter Commit/Deployment-Status: success" };
    if (data.state === "pending") return { status:"🟡", note:"Deployment läuft gerade" };
    if (data.state === "failure" || data.state === "error") return { status:"🔴", note:`Letzter Commit-Status: ${data.state}` };
    return { status:"⚪", note:"Kein Status verfügbar" };
  }catch(error){
    return { status:"🟡", note:"GitHub nicht erreichbar: "+(error?.name==="AbortError"?"Zeitüberschreitung":error.message) };
  }
}

// Echte Leseprobe gegen Supabase (26.09.2026, seit Supabase Free verbunden ist) statt der vorher
// festen Aussage "Verbindungstest steht noch aus". 🟢 nur, wenn die Datenbank in diesem Moment
// tatsächlich antwortet; Fehler werden mit HTTP-Status gemeldet, nie mit Zugangsdaten.
async function checkSupabase(){
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);
  try{
    const r = await fetch(`${process.env.SUPABASE_URL}/rest/v1/businesses?select=id&limit=1`, { headers:{ apikey:process.env.SUPABASE_SECRET_KEY, Authorization:`Bearer ${process.env.SUPABASE_SECRET_KEY}` }, signal:controller.signal, cache:"no-store" });
    if(!r.ok) return { status:"🔴", note:`Supabase antwortet mit HTTP ${r.status}`, next_action:"Supabase-Verbindung/Migrationen prüfen" };
    return { status:"🟢", note:"Supabase Free (Frankfurt) erreichbar - Leseprobe bei jedem Aufruf erfolgreich", next_action:"—" };
  }catch(error){
    return { status:"🔴", note:"Supabase nicht erreichbar: "+(error?.name==="AbortError"?"Zeitüberschreitung":error.message), next_action:"Supabase-Status prüfen" };
  }finally{ clearTimeout(timeout); }
}

async function computeAutoOverlay(){
  const p = providerStatus();
  const supabaseConfigured = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SECRET_KEY);
  const github = await checkGithub();
  const now = new Date().toISOString();
  return {
    vercel: { status:"🟢", note:"Diese Anfrage wurde gerade erfolgreich von Vercel ausgeliefert", next_action:"—" },
    github: { status:github.status, note:github.note, next_action: github.status==="🔴" ? "github.com/adnan-51-bit/adnan/actions prüfen" : "—" },
    supabase: supabaseConfigured
      ? await checkSupabase()
      : { status:"🔵", note:"Kein Supabase-Konto verbunden (SUPABASE_URL/SUPABASE_SECRET_KEY fehlen) - Daten nur im Arbeitsspeicher", next_action:"Supabase Free über Vercel Marketplace verbinden" },
    stripe: p.stripe.configured
      ? { status:"🟡", note:"STRIPE_WEBHOOK_SECRET gesetzt, Produktion bewusst gesperrt", next_action:"Signaturprüfung + persistenter Webhook-Store vor Aktivierung" }
      : { status:"🔴", note:"STRIPE_WEBHOOK_SECRET nicht gesetzt", next_action:"Signaturprüfung + persistenter Webhook-Store vor Aktivierung" },
    shopify: p.shopify.configured
      ? { status:"🟡", note:"SHOPIFY_WEBHOOK_SECRET gesetzt", next_action:"Echte Shop-Konfiguration und persistente Idempotenz prüfen" }
      : { status:"⚪", note:"SHOPIFY_WEBHOOK_SECRET nicht gesetzt", next_action:"Echte Shop-Konfiguration und persistente Idempotenz prüfen" },
    email: p.notifications.email
      ? { status:"🟢", note:"RESEND_API_KEY gesetzt", next_action:"—" }
      : { status:"⚪", note:"RESEND_API_KEY nicht gesetzt", next_action:"Provider und sichere Versandkonfiguration festlegen" },
    slack: p.notifications.slack
      ? { status:"🟢", note:"SLACK_WEBHOOK_URL gesetzt", next_action:"—" }
      : { status:"⚪", note:"SLACK_WEBHOOK_URL nicht gesetzt", next_action:"Workspace/Channel und Benachrichtigungsregeln festlegen" },
    __checkedAt: now,
  };
}

const memory = globalThis.__masterSystems || new Map();
globalThis.__masterSystems = memory;

const seed = [
  {id:"github",name:"GitHub",status:"🟢",note:"Code & Dokumentation",last_checked_at:null,next_action:"CI/Repository-Status prüfen",source:"manual"},
  {id:"vercel",name:"Vercel",status:"🟡",note:"Deployment",last_checked_at:null,next_action:"Deployment-Status des aktuellen Commits verifizieren",source:"manual"},
  {id:"supabase",name:"Supabase",status:"🟡",note:"Persistente Datenhaltung",last_checked_at:null,next_action:"Projekt/Secrets/Migration/Smoke-Test durchführen",source:"manual"},
  // Audit-Fund F9 (26.09.2026): stand fest auf 🟢, obwohl es keinen serverseitigen Famulor-Zugang gibt
  // (FAMULOR_API_KEY fehlt) und der Telefonweg laut Werknetz24-Systemwaechter nicht bestaetigt ist.
  {id:"famulor",name:"Famulor",status:"🟡",note:"Werknetz24 Telefon (Lisa) - kein Live-Check möglich (FAMULOR_API_KEY fehlt), Status laut Werknetz24: nicht bestätigt",last_checked_at:null,next_action:"Letzten Anruf in der Agenten-Zentrale prüfen; FAMULOR_API_KEY ist Adnans Entscheidung",source:"manual"},
  {id:"easybell",name:"Easybell",status:"🟡",note:"Telefonie / Weiterleitung",last_checked_at:null,next_action:"Weiterleitung und Zielnummer testen",source:"manual"},
  {id:"stripe",name:"Stripe",status:"🔴",note:"Produktiv noch gesperrt",last_checked_at:null,next_action:"Signaturprüfung + persistenter Webhook-Store vor Aktivierung",source:"manual"},
  {id:"paypal",name:"PayPal",status:"🟡",note:"Zahlungsanbieter",last_checked_at:null,next_action:"Integration erst nach sicherem Payment-Gate",source:"manual"},
  {id:"shopify",name:"Shopify",status:"🟡",note:"Webhook-Schicht vorhanden",last_checked_at:null,next_action:"Echte Shop-Konfiguration und persistente Idempotenz prüfen",source:"manual"},
  {id:"email",name:"E-Mail",status:"🟡",note:"Connector offen",last_checked_at:null,next_action:"Provider und sichere Versandkonfiguration festlegen",source:"manual"},
  {id:"slack",name:"Slack",status:"🟡",note:"Connector offen",last_checked_at:null,next_action:"Workspace/Channel und Benachrichtigungsregeln festlegen",source:"manual"}
];

function configured(){return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SECRET_KEY)}
function headers(){return {apikey:process.env.SUPABASE_SECRET_KEY,Authorization:`Bearer ${process.env.SUPABASE_SECRET_KEY}`,"Content-Type":"application/json"}}
async function req(path,options={}){const r=await fetch(`${process.env.SUPABASE_URL}/rest/v1/${path}`,{...options,headers:{...headers(),...(options.headers||{})},cache:"no-store"});if(!r.ok)throw new Error(`Supabase ${r.status}: ${await r.text()}`);return r.status===204?null:r.json()}

function applyAutoOverlay(systems, overlay){
  return systems.map(s => {
    if (!AUTO_CHECKED_IDS.includes(s.id) || !overlay[s.id]) return s;
    const live = overlay[s.id];
    return { ...s, status: live.status, note: live.note, next_action: live.next_action, last_checked_at: overlay.__checkedAt, source: "auto" };
  });
}

export async function listSystems(){
  const overlay = await computeAutoOverlay();
  if(!configured()) { const merged=new Map(seed.map(s=>[s.id,{...s}])); for(const s of memory.values()) merged.set(s.id,s); return {storage:"memory",systems:applyAutoOverlay(Array.from(merged.values()), overlay)}; }
  const rows=await req("master_systems?select=*&order=id.asc");
  return {storage:"supabase",systems:applyAutoOverlay(rows, overlay)};
}
export async function updateSystem(id,patch){
  // Automatisch geprüfte Systeme (AUTO_CHECKED_IDS) werden bei jedem GET ueberschrieben - eine
  // manuelle Bearbeitung wuerde nur den Anschein einer Speicherung erwecken, ohne echte Wirkung
  // zu haben (naechster Abruf zeigt sofort wieder den echten Live-Status). Statt das vorzutaeuschen,
  // wird die Bearbeitung hier klar abgelehnt.
  if (AUTO_CHECKED_IDS.includes(id)) throw new Error(`${id} wird automatisch geprüft - manuelle Bearbeitung ist hier nicht möglich`);
  const current=(await listSystems()).systems.find(s=>s.id===id);
  if(!current) throw new Error("System nicht gefunden");
  const allowed={status:patch.status,note:patch.note,next_action:patch.next_action,last_checked_at:patch.last_checked_at,source:patch.source};
  const clean=Object.fromEntries(Object.entries(allowed).filter(([,v])=>v!==undefined));
  clean.updated_at=new Date().toISOString();
  if(configured()){
    const rows=await req(`master_systems?id=eq.${encodeURIComponent(id)}&select=*`,{method:"PATCH",headers:{"Prefer":"return=representation"},body:JSON.stringify(clean)});
    if(!rows?.[0]) throw new Error("Systemstatus konnte nicht gespeichert werden");
    await writeAudit({action:"system.updated",entityType:"master_system",entityId:id,details:{status:rows[0].status,next_action:rows[0].next_action}});
    return {storage:"supabase",system:rows[0]};
  }
  const updated={...current,...clean};memory.set(id,updated);await writeAudit({action:"system.updated",entityType:"master_system",entityId:id,details:{status:updated.status,next_action:updated.next_action}});return {storage:"memory",system:updated};
}
export function systemStorage(){return configured()?"supabase":"memory"}
