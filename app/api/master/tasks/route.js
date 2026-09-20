import { NextResponse } from "next/server";
import { listTasks, createTask, updateTask, taskStorage } from "../../../../lib/master-tasks";
export const runtime="nodejs";
export async function GET(){try{return NextResponse.json({ok:true,storage:taskStorage(),tasks:await listTasks()})}catch(e){return NextResponse.json({ok:false,error:e.message},{status:500})}}
export async function POST(request){try{const b=await request.json();return NextResponse.json({ok:true,storage:taskStorage(),task:await createTask(b)},{status:201})}catch(e){return NextResponse.json({ok:false,error:e.message},{status:400})}}
export async function PATCH(request){try{const b=await request.json();if(!b?.id)return NextResponse.json({ok:false,error:"id is required"},{status:400});const {id,...patch}=b;const allowed=["title","area","status","priority","due_at","owner"];const clean=Object.fromEntries(Object.entries(patch).filter(([k])=>allowed.includes(k)));return NextResponse.json({ok:true,storage:taskStorage(),task:await updateTask(id,clean)})}catch(e){return NextResponse.json({ok:false,error:e.message},{status:500})}}
