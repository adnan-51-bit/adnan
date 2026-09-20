const memory = globalThis.__MASTER_DASHBOARD_MEMORY__ || {
  businesses: new Map(),
  tasks: new Map()
};
globalThis.__MASTER_DASHBOARD_MEMORY__ = memory;

const seedBusinesses = [
  {id:"werknetz24",name:"Werknetz24",type:"Bestehender Betrieb",status:"EXTERNAL",health:"🟡",revenue:"—",link:"https://werknetz24.de/admin-zentrale",modules:["Lisa / Telefon","Kunden","Leads","Aufträge","Rechnungen","Finanzen","Integrationen"]},
  {id:"ecommerce",name:"E-Commerce",type:"Geschäftsbereich",status:"CODE EXISTS",health:"🟡",revenue:"0 €",link:"/e-commerce",modules:["Produkte","Lieferanten","Bestellungen","Shop","Marketing","Retouren","Finanzen"]},
  {id:"future",name:"Weiterer Betrieb",type:"Vorbereitet",status:"OPEN",health:"⚪",revenue:"—",link:"#",modules:["Kunden","Aufgaben","Finanzen","Reports"]}
];

for (const b of seedBusinesses) if (!memory.businesses.has(b.id)) memory.businesses.set(b.id,b);

function supabaseConfigured(){
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

async function supabaseRequest(path, options={}){
  const response = await fetch(process.env.SUPABASE_URL + "/rest/v1/" + path,{
    ...options,
    headers:{
      apikey:process.env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization:"Bearer " + process.env.SUPABASE_SERVICE_ROLE_KEY,
      "Content-Type":"application/json",
      ...(options.headers||{})
    }
  });
  const text=await response.text();
  if(!response.ok) throw new Error("Supabase request failed: "+response.status+" "+text);
  return text ? JSON.parse(text) : null;
}

export async function listBusinesses(){
  if(!supabaseConfigured()) return [...memory.businesses.values()];
  return supabaseRequest("businesses?select=*&order=name.asc");
}

export async function updateBusiness(id, patch){
  if(!supabaseConfigured()){
    const current=memory.businesses.get(id);
    if(!current) throw new Error("Business not found");
    const updated={...current,...patch,id};
    memory.businesses.set(id,updated);
    return updated;
  }
  const rows=await supabaseRequest("businesses?id=eq."+encodeURIComponent(id),{
    method:"PATCH",
    headers:{Prefer:"return=representation"},
    body:JSON.stringify({...patch,updated_at:new Date().toISOString()})
  });
  if(!rows?.[0]) throw new Error("Business not found");
  return rows[0];
}

export function storageMode(){
  return supabaseConfigured() ? "supabase" : "memory";
}
