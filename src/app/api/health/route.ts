import { NextResponse } from "next/server";

// GET /api/health - Public liveness/readiness probe endpoint (no auth)
export async function GET() {
  return NextResponse.json({ status: "ok" });
}
