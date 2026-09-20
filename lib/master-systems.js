import {writeAudit} from "./audit.js";

const memory = globalThis.__masterSystems || new Map();
globalThis.__masterSystems = memory;

const seed = [
  {id:"github",name:"GitHub",status:"🟢",note:"Code & Dokumentation",last_checked_at:null,next_action:"CI/Repository-Status prüfen",source:"manual"},
  {id:"vercel",name:"Vercel",status:"🟡",note:"Deployment",last_checked_at:null,next_action:"Deployment-Status des aktuellen Commits verifizieren",source:"manual"},
  {id:"supabase",name:"Supabase",status:"🟡",note:"Persistente Datenhaltung",last_checked_at:null,next_action:"Projekt/Secrets/Migration/Smoke-Test durchführen",source:"manual"},
  {id:"famulor",name:"Famulor",status:"🟢",note:"Werknetz24 Telefon",last_checked_at:null,next_action:"Konfiguration bei Bedarf prüfen",source:"manual"},
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

export async function listSystems(){
  if(!configured()) { const merged=new Map(seed.map(s=>[s.id,{...s}])); for(const s of memory.values()) merged.set(s.id,s); return {storage:"memory",systems:Array.from(merged.values())}; }
  const rows=await req("master_systems?select=*&order=id.asc");
  return {storage:"supabase",systems:rows};
}
export async function updateSystem(id,patch){
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
