import { NextResponse } from "next/server";
import { listFinance, createFinance, financeStorage } from "../../../../lib/master-finance";
import { checkAdminSecret } from "../../../../lib/auth.js";
export const runtime="nodejs";
export async function GET(request){try{const business_id=new URL(request.url).searchParams.get("business_id")||undefined;const entries=await listFinance({business_id});return NextResponse.json({ok:true,storage:financeStorage(),entries})}catch(e){return NextResponse.json({ok:false,error:e.message},{status:500})}}
export async function POST(request){const authError=checkAdminSecret(request);if(authError)return NextResponse.json({ok:false,error:authError.error},{status:authError.status});try{const body=await request.json();return NextResponse.json({ok:true,storage:financeStorage(),entry:await createFinance(body)},{status:201})}catch(e){return NextResponse.json({ok:false,error:e.message},{status:400})}}
