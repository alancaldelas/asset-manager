import { NextResponse } from "next/server";
import { db, NewServerAsset } from "@/lib/db";
import { authorize } from "@/lib/auth";

// GET /api/servers - Get all servers and storage mode
export async function GET(request: Request) {
  try {
    const auth = await authorize(request, "viewer");
    if ("response" in auth) return auth.response;

    const servers = await db.getServers();
    const storageMode = db.getStorageMode();
    return NextResponse.json({
      success: true,
      storageMode,
      servers,
    });
  } catch (error: any) {
    console.error("GET /api/servers failed:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to retrieve servers" },
      { status: 500 }
    );
  }
}

// POST /api/servers - Create a new server
export async function POST(request: Request) {
  try {
    const auth = await authorize(request, "operator");
    if ("response" in auth) return auth.response;

    const body = await request.json();
    
    // Simple validation
    const {
      hostname,
      ip_address,
      status,
      os_name,
      cpu_cores,
      ram_gb,
      storage_gb,
      datacenter,
      rack,
      rack_unit,
      owner,
      notes,
    } = body;

    if (!hostname || !ip_address || !status || !os_name || !datacenter) {
      return NextResponse.json(
        { success: false, error: "Missing required fields (hostname, ip_address, status, os_name, datacenter)" },
        { status: 400 }
      );
    }

    const newServer: NewServerAsset = {
      hostname,
      ip_address,
      status: status || "Active",
      os_name,
      cpu_cores: Number(cpu_cores) || 1,
      ram_gb: Number(ram_gb) || 1,
      storage_gb: Number(storage_gb) || 10,
      datacenter,
      rack: rack || "",
      rack_unit: rack_unit || "",
      owner: owner || "",
      notes: notes || "",
    };

    const created = await db.createServer(newServer);
    return NextResponse.json({ success: true, server: created }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/servers failed:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create server" },
      { status: 500 }
    );
  }
}
