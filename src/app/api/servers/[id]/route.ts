import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authorize } from "@/lib/auth";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/servers/[id] - Get a single server
export async function GET(request: Request, context: RouteContext) {
  try {
    const auth = await authorize(request, "viewer");
    if ("response" in auth) return auth.response;

    const { id } = await context.params;
    const serverId = parseInt(id, 10);

    if (isNaN(serverId)) {
      return NextResponse.json(
        { success: false, error: "Invalid server ID" },
        { status: 400 }
      );
    }

    const server = await db.getServerById(serverId);
    if (!server) {
      return NextResponse.json(
        { success: false, error: "Server not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, server });
  } catch (error: any) {
    console.error("GET /api/servers/[id] failed:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to retrieve server" },
      { status: 500 }
    );
  }
}

// PUT /api/servers/[id] - Update a server
export async function PUT(request: Request, context: RouteContext) {
  try {
    const auth = await authorize(request, "operator");
    if ("response" in auth) return auth.response;

    const { id } = await context.params;
    const serverId = parseInt(id, 10);

    if (isNaN(serverId)) {
      return NextResponse.json(
        { success: false, error: "Invalid server ID" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const updated = await db.updateServer(serverId, body);

    if (!updated) {
      return NextResponse.json(
        { success: false, error: "Server not found or update failed" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, server: updated });
  } catch (error: any) {
    console.error("PUT /api/servers/[id] failed:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update server" },
      { status: 500 }
    );
  }
}

// DELETE /api/servers/[id] - Delete a server
export async function DELETE(request: Request, context: RouteContext) {
  try {
    const auth = await authorize(request, "operator");
    if ("response" in auth) return auth.response;

    const { id } = await context.params;
    const serverId = parseInt(id, 10);

    if (isNaN(serverId)) {
      return NextResponse.json(
        { success: false, error: "Invalid server ID" },
        { status: 400 }
      );
    }

    const success = await db.deleteServer(serverId);

    if (!success) {
      return NextResponse.json(
        { success: false, error: "Server not found or delete failed" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, message: "Server deleted successfully" });
  } catch (error: any) {
    console.error("DELETE /api/servers/[id] failed:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to delete server" },
      { status: 500 }
    );
  }
}
