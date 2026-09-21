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
const entry={business_id:input.business_id||null,kind:input.kind,amount:Number(input.amount),currency:input.currency||"EUR",category:String(input.category||"").trim(),description:String(input.description||"").trim(),status:input.status||"confirmed",source:input.source||"manual",occurred_at:input.occurred_at||new Date().toISOString()};if(!["income","expense"].includes(entry.kind)||!Number.isFinite(entry.amount)||entry.amount<0||!entry.category)throw new Error("kind, amount and category are required");
if(!["confirmed","pending","cancelled"].includes(entry.status))throw new Error("invalid finance status");
if(!["EUR"].includes(entry.currency))throw new Error("unsupported currency");if(configured()){const rows=await req("master_finance_entries",{method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify(entry)});if(!rows?.[0])throw new Error("Finance entry creation failed");await writeAudit({action:"finance.created",entityType:"finance_entry",entityId:String(rows[0].id),details:rows[0]});return rows[0]}const id=Math.max(0,...[...state.keys()].map(Number))+1;const row={id,...entry,created_at:new Date().toISOString(),updated_at:new Date().toISOString()};state.set(id,row);await writeAudit({action:"finance.created",entityType:"finance_entry",entityId:String(id),details:row});return row}
export const financeStorage=()=>configured()?"supabase":"memory";
export function financeTotals(entries){return entries.reduce((a,e)=>{if(e.status==="cancelled")return a;const n=Number(e.amount)||0;if(e.kind==="income")a.income+=n;else a.expense+=n;a.net=a.income-a.expense;return a},{income:0,expense:0,net:0})}
