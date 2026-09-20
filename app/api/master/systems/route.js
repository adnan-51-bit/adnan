import {listSystems,updateSystem} from "@/lib/master-systems.js";
import {checkAdminSecret} from "@/lib/auth.js";
export const dynamic="force-dynamic";

export async function GET(){
  try { const data=await listSystems(); return Response.json({ok:true,...data}); }
  catch(error){ return Response.json({ok:false,error:error.message},{status:500}); }
}
export async function PATCH(request){
  const authError=checkAdminSecret(request);
  if(authError) return Response.json({ok:false,error:authError.error},{status:authError.status});
  try{
    const body=await request.json();
    if(!body?.id) return Response.json({ok:false,error:"id fehlt"},{status:400});
    const allowedStatus=["🟢","🟡","🔴","⚪"];
    if(body.status && !allowedStatus.includes(body.status)) return Response.json({ok:false,error:"Ungültiger Status"},{status:400});
    const data=await updateSystem(body.id,body);
    return Response.json({ok:true,...data});
  }catch(error){return Response.json({ok:false,error:error.message},{status:500});}
}
