import { writeAudit } from "./audit.js";
import { isKnownBusinessId } from "./master-store.js";

// "master" ist kein Betrieb, sondern kennzeichnet betriebsübergreifende Master-Zentrale-Aufgaben
// (z. B. interne Infrastruktur/Quality Gate), die keinem einzelnen Geschäftsbereich gehören.
const CROSS_BUSINESS_ID="master";
function validateBusinessId(business_id){
  if(business_id===CROSS_BUSINESS_ID) return;
  if(!isKnownBusinessId(business_id)) throw new Error("Unbekannte business_id: "+business_id);
}

const state=globalThis.__MASTER_TASKS__||new Map();
globalThis.__MASTER_TASKS__=state;
const seed=[
{id:1,title:"Persistenz fertigstellen",area:"System",business_id:"master",status:"In Arbeit",priority:"Hoch",owner:"system"},
{id:2,title:"Stripe sicher anbinden",area:"Zahlungen",business_id:"ecommerce",status:"Blockiert",priority:"Hoch",owner:"system"},
{id:3,title:"Lieferanten-Connector vorbereiten",area:"E-Commerce",business_id:"ecommerce",status:"Offen",priority:"Mittel",owner:"system"},
{id:4,title:"Master-Zentrale Quality Gate",area:"Master",business_id:"master",status:"In Arbeit",priority:"Hoch",owner:"system"}
];
for(const t of seed) if(!state.has(t.id)) state.set(t.id,t);
const configured=()=>Boolean(process.env.SUPABASE_URL&&process.env.SUPABASE_SECRET_KEY);
async function req(path,options={}){const res=await fetch(process.env.SUPABASE_URL+"/rest/v1/"+path,{...options,headers:{apikey:process.env.SUPABASE_SECRET_KEY,Authorization:"Bearer "+process.env.SUPABASE_SECRET_KEY,"Content-Type":"application/json",...(options.headers||{})}});const text=await res.text();if(!res.ok)throw new Error("Supabase request failed: "+res.status+" "+text);return text?JSON.parse(text):null}
export async function listTasks(filter={}){
  const all = !configured()
    ? [...state.values()]
    : await req("master_tasks_v2?select=*&order=updated_at.desc");
  if(!filter.business_id) return all;
  return all.filter(t=>t.business_id===filter.business_id);
}
export async function createTask(input){
 const now=new Date().toISOString();
 const business_id=String(input.business_id||CROSS_BUSINESS_ID).trim();
 validateBusinessId(business_id);
 const clean={title:String(input.title||"").trim(),area:String(input.area||"").trim(),business_id,status:input.status||"Offen",priority:input.priority||"Mittel",due_at:input.due_at||null,owner:input.owner||"system"};
 if(!clean.title||!clean.area) throw new Error("title and area are required");
 if(configured()){const rows=await req("master_tasks_v2",{method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify({...clean,created_at:now,updated_at:now})});if(!rows?.[0])throw new Error("Task creation failed");const task=rows[0];await writeAudit({action:"task.created",entityType:"master_task",entityId:String(task.id),details:task});return task;}
 const id=Math.max(0,...[...state.keys()].map(Number))+1;const task={id,...clean,created_at:now,updated_at:now};state.set(id,task);await writeAudit({action:"task.created",entityType:"master_task",entityId:String(id),details:task});return task;
}
export async function updateTask(id,patch){
 if(patch.business_id!==undefined) validateBusinessId(patch.business_id);
 const clean={...patch,updated_at:new Date().toISOString()};let task;if(configured()){const rows=await req("master_tasks_v2?id=eq."+encodeURIComponent(id),{method:"PATCH",headers:{Prefer:"return=representation"},body:JSON.stringify(clean)});if(!rows?.[0])throw new Error("Task not found");task=rows[0]}else{if(!state.has(Number(id)))throw new Error("Task not found");task={...state.get(Number(id)),...clean,id:Number(id)};state.set(Number(id),task)}await writeAudit({action:"task.updated",entityType:"master_task",entityId:String(id),details:clean});return task}
export const taskStorage=()=>configured()?"supabase":"memory";
