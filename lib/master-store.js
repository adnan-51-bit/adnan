import { writeAudit } from "./audit.js";
import { fetchWerknetz24Status } from "./werknetz24-connector.js";
const memory = globalThis.__MASTER_DASHBOARD_MEMORY__ || {
  businesses: new Map(),
  tasks: new Map()
};
globalThis.__MASTER_DASHBOARD_MEMORY__ = memory;

// Jeder Betrieb ist ein eigenständiger Geschäftsbereich mit eigener ID (business_id = b.id),
// eigenem Dashboard (b.link) und eigenen Daten/Funktionen. Werknetz24 und E-Commerce dürfen NIE
// vermischt werden: Werknetz24 bleibt vollständig extern (eigenes Repo/Deployment, hier nur
// read-only liveStatus, s. werknetz24-connector.js), E-Commerce hat seine eigene Datenschicht
// (lib/ecommerce-store.js, jeder Datensatz dort trägt business_id "ecommerce"). "master" ist kein
// Betrieb, sondern die Kennzeichnung für betriebsübergreifende Master-Zentrale-Aufgaben (s.
// lib/master-tasks.js, lib/master-finance.js).
const seedBusinesses = [
  // link zeigt bewusst auf die eigene, dedizierte /werknetz24-Seite in DIESEM Repo (22.09.2026,
  // Adnans Wunsch "eigene Seite pro Betrieb, nichts vermischen") statt direkt auf die externe
  // werknetz24.de/admin-zentrale - von /werknetz24 aus gibt es einen klaren Link dorthin fuer
  // alles, was noch nicht ueber die sichere Bruecke verfuegbar ist.
  {id:"werknetz24",name:"Werknetz24",type:"Bestehender Betrieb",status:"EXTERNAL",health:"🟡",revenue:"—",link:"/werknetz24",modules:["Lisa / Telefon","Kunden","Leads","Aufträge","Rechnungen","Finanzen","Integrationen"]},
  {id:"ecommerce",name:"E-Commerce",type:"Geschäftsbereich",status:"CODE EXISTS",health:"🟡",revenue:"0 €",link:"/e-commerce",modules:["Produkte","Lieferanten","Bestellungen","Shop","Marketing","Retouren","Finanzen"]},
  {id:"future",name:"Weiterer Betrieb",type:"Vorbereitet",status:"OPEN",health:"⚪",revenue:"—",link:"#",modules:["Kunden","Aufgaben","Finanzen","Reports"]}
];

for (const b of seedBusinesses) if (!memory.businesses.has(b.id)) memory.businesses.set(b.id,b);

// Registry aller bekannten business_id-Werte, exportiert zur Validierung in anderen Modulen
// (master-tasks.js, master-finance.js) - verhindert Tippfehler/erfundene Betriebs-IDs.
export const BUSINESS_IDS = seedBusinesses.map(b => b.id);

export function isKnownBusinessId(id){
  return BUSINESS_IDS.includes(id);
}

export function getBusiness(id){
  return memory.businesses.get(id) || null;
}

function supabaseConfigured(){
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SECRET_KEY);
}

async function supabaseRequest(path, options={}){
  const response = await fetch(process.env.SUPABASE_URL + "/rest/v1/" + path,{
    ...options,
    headers:{
      apikey:process.env.SUPABASE_SECRET_KEY,
      Authorization:"Bearer " + process.env.SUPABASE_SECRET_KEY,
      "Content-Type":"application/json",
      ...(options.headers||{})
    }
  });
  const text=await response.text();
  if(!response.ok) throw new Error("Supabase request failed: "+response.status+" "+text);
  return text ? JSON.parse(text) : null;
}

export async function listBusinesses(){
  // Feste Reihenfolge wie im Seed (Werknetz24, E-Commerce, weitere) statt alphabetisch aus der DB -
  // seit Supabase (26.09.2026) stand Werknetz24 sonst zuletzt. Unbekannte IDs hinten, stabil.
  const raw = !supabaseConfigured()
    ? [...memory.businesses.values()]
    : await supabaseRequest("businesses?select=*&order=name.asc");
  const rang = id => { const i = BUSINESS_IDS.indexOf(id); return i === -1 ? BUSINESS_IDS.length : i; };
  const list = [...raw].sort((x, y) => rang(x.id) - rang(y.id));
  // Werknetz24 ist ein separates, bereits produktives System (adnan-51-bit/werknetz24-landing) -
  // hier wird nur sein aggregierter Status live abgefragt (s. lib/werknetz24-connector.js), nie
  // Kundendaten oder Rechnungen. Ohne konfiguriertes Secret bleibt liveStatus ehrlich
  // {configured:false} statt erfundener Werte.
  const werknetz24 = list.find(b => b.id === "werknetz24");
  if (werknetz24) {
    werknetz24.liveStatus = await fetchWerknetz24Status();
  }
  return list;
}

export async function updateBusiness(id, patch){
  if(!supabaseConfigured()){
    const current=memory.businesses.get(id);
    if(!current) throw new Error("Business not found");
    const updated={...current,...patch,id};
    memory.businesses.set(id,updated);
    await writeAudit({action:"business.updated",entityType:"business",entityId:String(id),details:patch});
    return updated;
  }
  const rows=await supabaseRequest("businesses?id=eq."+encodeURIComponent(id),{
    method:"PATCH",
    headers:{Prefer:"return=representation"},
    body:JSON.stringify({...patch,updated_at:new Date().toISOString()})
  });
  if(!rows?.[0]) throw new Error("Business not found");
  await writeAudit({action:"business.updated",entityType:"business",entityId:String(id),details:patch});
  return rows[0];
}

export function storageMode(){
  return supabaseConfigured() ? "supabase" : "memory";
}
