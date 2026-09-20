import { NextResponse } from "next/server";
import { listBusinesses, updateBusiness, storageMode } from "../../../../lib/master-store";
import { checkAdminSecret } from "../../../../lib/auth.js";

export const runtime = "nodejs";

export async function GET(){
  try{
    return NextResponse.json({ok:true,storage:storageMode(),businesses:await listBusinesses()});
  }catch(error){
    return NextResponse.json({ok:false,error:error.message},{status:500});
  }
}

export async function PATCH(request){
  const authError = checkAdminSecret(request);
  if (authError) return NextResponse.json({ ok: false, error: authError.error }, { status: authError.status });
  try{
    const body=await request.json();
    if(!body?.id) return NextResponse.json({ok:false,error:"id is required"},{status:400});
    const {id,...patch}=body;
    const allowed=["name","type","status","health","revenue","link","modules"];
    const clean=Object.fromEntries(Object.entries(patch).filter(([key])=>allowed.includes(key)));
    return NextResponse.json({ok:true,storage:storageMode(),business:await updateBusiness(id,clean)});
  }catch(error){
    return NextResponse.json({ok:false,error:error.message},{status:500});
  }
}
