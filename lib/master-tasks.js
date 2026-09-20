import { writeAudit } from "./audit";

const state=globalThis.__MASTER_TASKS__||new Map();
globalThis.__MASTER_TASKS__=state;
const seed=[
{id:1,title:"Persistenz fertigstellen",area:"System",status:"In Arbeit",priority:"Hoch",owner:"system"},
{id:2,title:"Stripe sicher anbinden",area:"Zahlungen",status:"Blockiert",priority:"Hoch",owner:"system"},
{id:3,title:"Lieferanten-Connector vorbereiten",area:"E-Commerce",status:"Offen",priority:"Mittel",owner:"system"},
{id:4,title:"Master-Zentrale Quality Gate",area:"Master",status:"In Arbeit",priority:"Hoch",owner:"system"}
];
for(const t of seed) if(!state.has(t.id)) state.set(t.id,t);
const configured=()=>Boolean(process.env.SUPABASE_URL&&process.env.SUPABASE_SECRET_KEY);
async function req(path,options={}){const res=await fetch(process.env.SUPABASE_URL+"/rest/v1/"+path,{...options,headers:{apikey:process.env.SUPABASE_SECRET_KEY,Authorization:"Bearer "+process.env.SUPABASE_SECRET_KEY,"Content-Type":"application/json",...(options.headers||{})}});const text=await res.text();if(!res.ok)throw new Error("Supabase request failed: "+res.status+" "+text);return text?JSON.parse(text):null}
export async function listTasks(){if(!configured())return [...state.values()];return req("master_tasks_v2?select=*&order=updated_at.desc")}
export async function createTask(input){
 const now=new Date().toISOString();
 const clean={title:String(input.title||"").trim(),area:String(input.area||"").trim(),status:input.status||"Offen",priority:input.priority||"Mittel",due_at:input.due_at||null,owner:input.owner||"system"};
 if(!clean.title||!clean.area) throw new Error("title and area are required");
 if(configured()){const rows=await req("master_tasks_v2",{method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify({...clean,created_at:now,updated_at:now})});if(!rows?.[0])throw new Error("Task creation failed");const task=rows[0];await writeAudit({action:"task.created",entityType:"master_task",entityId:String(task.id),details:task});return task;}
 const id=Math.max(0,...[...state.keys()].map(Number))+1;const task={id,...clean,created_at:now,updated_at:now};state.set(id,task);await writeAudit({action:"task.created",entityType:"master_task",entityId:String(id),details:task});return task;
}
export async function updateTask(id,patch){const clean={...patch,updated_at:new Date().toISOString()};let task;if(configured()){const rows=await req("master_tasks_v2?id=eq."+encodeURIComponent(id),{method:"PATCH",headers:{Prefer:"return=representation"},body:JSON.stringify(clean)});if(!rows?.[0])throw new Error("Task not found");task=rows[0]}else{task={...state.get(Number(id)),...clean,id:Number(id)};state.set(Number(id),task)}await writeAudit({action:"task.updated",entityType:"master_task",entityId:String(id),details:clean});return task}
export const taskStorage=()=>configured()?"supabase":"memory";
