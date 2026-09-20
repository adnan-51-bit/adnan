import { NextResponse } from "next/server";
import { listFinance, createFinance, financeStorage } from "../../../../lib/master-finance";
export const runtime="nodejs";
export async function GET(){try{const entries=await listFinance();return NextResponse.json({ok:true,storage:financeStorage(),entries})}catch(e){return NextResponse.json({ok:false,error:e.message},{status:500})}}
export async function POST(request){try{const body=await request.json();return NextResponse.json({ok:true,storage:financeStorage(),entry:await createFinance(body)},{status:201})}catch(e){return NextResponse.json({ok:false,error:e.message},{status:400})}}
