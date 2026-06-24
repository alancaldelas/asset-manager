import { NextResponse } from "next/server";
import { deleteSession } from "@/lib/session";

// POST /api/auth/logout - Clear the current session
export async function POST() {
  await deleteSession();
  return NextResponse.json({ success: true });
}
