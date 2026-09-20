import { NextResponse } from "next/server";
import { listAudit, writeAudit, auditMode } from "../../../../lib/audit";
export const runtime="nodejs";
export async function GET(){return NextResponse.json({ok:true,storage:auditMode(),entries:await listAudit(100)})}
export async function POST(request){try{const body=await request.json();if(!body?.action||!body?.entityType)return NextResponse.json({ok:false,error:"action and entityType are required"},{status:400});return NextResponse.json({ok:true,storage:auditMode(),entry:await writeAudit(body)})}catch(error){return NextResponse.json({ok:false,error:error.message},{status:500})}}
