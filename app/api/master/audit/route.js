import { NextResponse } from "next/server";
import { listAudit, writeAudit, auditMode } from "../../../../lib/audit";
import { checkAdminSecret } from "../../../../lib/auth.js";
export const runtime="nodejs";
// Seit Supabase-Persistenz (26.09.2026): das Audit-Log enthaelt echte Aenderungsdetails (z. B.
// Kundennamen bei customer.created) und ist nur noch mit MASTER_API_SECRET lesbar.
export async function GET(request){const authError=checkAdminSecret(request);if(authError)return NextResponse.json({ok:false,error:authError.error},{status:authError.status});return NextResponse.json({ok:true,storage:auditMode(),entries:await listAudit(100)})}
export async function POST(request){const authError=checkAdminSecret(request);if(authError)return NextResponse.json({ok:false,error:authError.error},{status:authError.status});try{const body=await request.json();if(!body?.action||!body?.entityType)return NextResponse.json({ok:false,error:"action and entityType are required"},{status:400});return NextResponse.json({ok:true,storage:auditMode(),entry:await writeAudit(body)})}catch(error){return NextResponse.json({ok:false,error:error.message},{status:500})}}
