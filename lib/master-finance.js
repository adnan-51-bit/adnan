import { writeAudit } from "./audit.js";
import { isKnownBusinessId } from "./master-store.js";

const state=globalThis.__MASTER_FINANCE__||new Map();
globalThis.__MASTER_FINANCE__=state;
const configured=()=>Boolean(process.env.SUPABASE_URL&&process.env.SUPABASE_SECRET_KEY);
async function req(path,options={}){const res=await fetch(process.env.SUPABASE_URL+"/rest/v1/"+path,{...options,headers:{apikey:process.env.SUPABASE_SECRET_KEY,Authorization:"Bearer "+process.env.SUPABASE_SECRET_KEY,"Content-Type":"application/json",...(options.headers||{})}});const text=await res.text();if(!res.ok)throw new Error("Supabase request failed: "+res.status+" "+text);return text?JSON.parse(text):null}
export async function listFinance(filter={}){
  const all = !configured()
    ? [...state.values()].sort((a,b)=>new Date(b.occurred_at)-new Date(a.occurred_at))
    : await req("master_finance_entries?select=*&order=occurred_at.desc");
  if(!filter.business_id) return all;
  return all.filter(e=>e.business_id===filter.business_id);
}
export async function createFinance(input){
// business_id ist optional (null = betriebsübergreifende Buchung, z. B. Hosting-Kosten der
// gesamten Master-Zentrale), muss aber bei Angabe ein bekannter, registrierter Betrieb sein -
// verhindert erfundene/vertippte Geschäftsbereiche in der Finanzzentrale.
if(input.business_id!=null && !isKnownBusinessId(input.business_id)) throw new Error("Unbekannte business_id: "+input.business_id);
const entry={business_id:input.business_id||null,kind:input.kind,amount:Number(input.amount),currency:input.currency||"EUR",category:String(input.category||"").trim(),description:String(input.description||"").trim(),status:input.status||"confirmed",source:input.source||"manual",occurred_at:input.occurred_at||new Date().toISOString()};
// Teil 4B (27.09.2026): Bezug zu Einnahmequelle/Lead + Test-Kennzeichen (Testbuchungen zaehlen nie als echte Einnahmen).
if(input.einnahmequelle_id) entry.einnahmequelle_id=String(input.einnahmequelle_id);
if(input.lead_id) entry.lead_id=String(input.lead_id);
if(input.ist_test!==undefined){if(typeof input.ist_test!=="boolean")throw new Error("ist_test muss ja/nein sein");entry.ist_test=input.ist_test}if(!["income","expense"].includes(entry.kind)||!Number.isFinite(entry.amount)||entry.amount<0||!entry.category)throw new Error("kind, amount and category are required");
if(!["confirmed","pending","cancelled"].includes(entry.status))throw new Error("invalid finance status");
if(!["EUR"].includes(entry.currency))throw new Error("unsupported currency");if(configured()){const rows=await req("master_finance_entries",{method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify(entry)});if(!rows?.[0])throw new Error("Finance entry creation failed");await writeAudit({action:"finance.created",entityType:"finance_entry",entityId:String(rows[0].id),details:rows[0]});return rows[0]}const id=Math.max(0,...[...state.keys()].map(Number))+1;const row={id,...entry,created_at:new Date().toISOString(),updated_at:new Date().toISOString()};state.set(id,row);await writeAudit({action:"finance.created",entityType:"finance_entry",entityId:String(id),details:row});return row}
export const financeStorage=()=>configured()?"supabase":"memory";
export function financeTotals(entries){return entries.reduce((a,e)=>{if(e.status==="cancelled"||e.ist_test)return a;const n=Number(e.amount)||0;if(e.kind==="income")a.income+=n;else a.expense+=n;a.net=a.income-a.expense;return a},{income:0,expense:0,net:0})}

// Status einer Buchung aendern (z. B. offene Einnahme -> bezahlt, oder storniert). Betrag/Art bleiben unveraendert.
export async function updateFinanceStatus(id,status,occurred_at,source){
 if(!["confirmed","pending","cancelled"].includes(status))throw new Error("invalid finance status");
 const patch={status,updated_at:new Date().toISOString(),...(occurred_at?{occurred_at}:{}),...(source?{source}:{})};let row;
 if(configured()){const rows=await req("master_finance_entries?id=eq."+encodeURIComponent(id),{method:"PATCH",headers:{Prefer:"return=representation"},body:JSON.stringify(patch)});row=rows?.[0]}
 else{const alt=state.get(Number(id));if(alt){row={...alt,...patch};state.set(Number(id),row)}}
 if(!row)throw new Error("Buchung nicht gefunden");
 await writeAudit({action:"finance.status",entityType:"finance_entry",entityId:String(id),details:{status}});return row}

// Finanzen je Einnahmequelle - nur echte (keine Test-)Buchungen. Betraege in Cent.
export function eqFinanzen(entries,einnahmequelle_id){
 const eigene=entries.filter(e=>e.einnahmequelle_id===einnahmequelle_id&&!e.ist_test&&e.status!=="cancelled");
 const cent=e=>Math.round((Number(e.amount)||0)*100);
 const einnahmen=eigene.filter(e=>e.kind==="income"&&e.status==="confirmed").reduce((a,e)=>a+cent(e),0);
 const kosten=eigene.filter(e=>e.kind==="expense"&&e.status==="confirmed").reduce((a,e)=>a+cent(e),0);
 const offen=eigene.filter(e=>e.kind==="income"&&e.status==="pending").reduce((a,e)=>a+cent(e),0);
 return {einnahmen_cent:einnahmen,kosten_cent:kosten,gewinn_cent:einnahmen-kosten,offen_cent:offen,buchungen:eigene.map(e=>({id:e.id,art:e.kind==="income"?"Einnahme":"Kosten",status:e.status==="pending"?"offen":"bezahlt",betrag_cent:cent(e),quelle:e.source,beschreibung:e.description,datum:e.occurred_at,lead_id:e.lead_id||null}))};
}
