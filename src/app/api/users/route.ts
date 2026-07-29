import { NextResponse } from "next/server";
import { db, type UserRole } from "@/lib/db";
import { authorize } from "@/lib/auth";

const VALID_ROLES: UserRole[] = ["admin", "operator", "viewer"];

// GET /api/users - List all users (admin only)
export async function GET(request: Request) {
  try {
    const auth = await authorize(request, "admin");
    if ("response" in auth) return auth.response;

    const users = await db.getUsers();
    return NextResponse.json({ success: true, users });
  } catch (error: any) {
    console.error("GET /api/users failed:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to retrieve users" },
      { status: 500 }
    );
  }
}

// POST /api/users - Create a new user (admin only)
export async function POST(request: Request) {
  try {
    const auth = await authorize(request, "admin");
    if ("response" in auth) return auth.response;

    const body = await request.json();
    const { username, email, password, role } = body;

    if (!username || !email || !password || !role) {
      return NextResponse.json(
        { success: false, error: "Missing required fields (username, email, password, role)" },
        { status: 400 }
      );
    }

    if (!VALID_ROLES.includes(role)) {
      return NextResponse.json(
        { success: false, error: "Invalid role" },
        { status: 400 }
      );
    }

    const created = await db.createUser({ username, email, password, role });
    return NextResponse.json({ success: true, user: created }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/users failed:", error);
    if (error?.code === "23505" || /unique/i.test(error?.message || "")) {
      return NextResponse.json(
        { success: false, error: "A user with that username or email already exists" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create user" },
      { status: 500 }
    );
  }
}
