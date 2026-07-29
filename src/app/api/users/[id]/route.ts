import { NextResponse } from "next/server";
import { db, type UserRole } from "@/lib/db";
import { authorize } from "@/lib/auth";

const VALID_ROLES: UserRole[] = ["admin", "operator", "viewer"];

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/users/[id] - Get a single user (admin only)
export async function GET(request: Request, context: RouteContext) {
  try {
    const auth = await authorize(request, "admin");
    if ("response" in auth) return auth.response;

    const { id } = await context.params;
    const userId = parseInt(id, 10);
    if (isNaN(userId)) {
      return NextResponse.json({ success: false, error: "Invalid user ID" }, { status: 400 });
    }

    const user = await db.getUserById(userId);
    if (!user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, user });
  } catch (error: any) {
    console.error("GET /api/users/[id] failed:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to retrieve user" },
      { status: 500 }
    );
  }
}

// PUT /api/users/[id] - Update a user (admin only)
export async function PUT(request: Request, context: RouteContext) {
  try {
    const auth = await authorize(request, "admin");
    if ("response" in auth) return auth.response;

    const { id } = await context.params;
    const userId = parseInt(id, 10);
    if (isNaN(userId)) {
      return NextResponse.json({ success: false, error: "Invalid user ID" }, { status: 400 });
    }

    const body = await request.json();
    const { username, email, password, role } = body;

    if (role !== undefined && !VALID_ROLES.includes(role)) {
      return NextResponse.json({ success: false, error: "Invalid role" }, { status: 400 });
    }

    const target = await db.getUserById(userId);
    if (!target) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    // Prevent demoting the last remaining admin.
    if (target.role === "admin" && role !== undefined && role !== "admin") {
      const adminCount = await db.countAdmins();
      if (adminCount <= 1) {
        return NextResponse.json(
          { success: false, error: "Cannot change role of the last admin" },
          { status: 400 }
        );
      }
    }

    const updates: { username?: string; email?: string; role?: UserRole; password?: string } = {};
    if (username !== undefined) updates.username = username;
    if (email !== undefined) updates.email = email;
    if (role !== undefined) updates.role = role;
    if (password) updates.password = password;

    const updated = await db.updateUser(userId, updates);
    if (!updated) {
      return NextResponse.json(
        { success: false, error: "User not found or update failed" },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, user: updated });
  } catch (error: any) {
    console.error("PUT /api/users/[id] failed:", error);
    if (error?.code === "23505" || /unique/i.test(error?.message || "")) {
      return NextResponse.json(
        { success: false, error: "A user with that username or email already exists" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update user" },
      { status: 500 }
    );
  }
}

// DELETE /api/users/[id] - Delete a user (admin only)
export async function DELETE(request: Request, context: RouteContext) {
  try {
    const auth = await authorize(request, "admin");
    if ("response" in auth) return auth.response;

    const { id } = await context.params;
    const userId = parseInt(id, 10);
    if (isNaN(userId)) {
      return NextResponse.json({ success: false, error: "Invalid user ID" }, { status: 400 });
    }

    // Prevent deleting your own account.
    if (auth.user.id === userId) {
      return NextResponse.json(
        { success: false, error: "You cannot delete your own account" },
        { status: 400 }
      );
    }

    const target = await db.getUserById(userId);
    if (!target) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    // Prevent deleting the last remaining admin.
    if (target.role === "admin") {
      const adminCount = await db.countAdmins();
      if (adminCount <= 1) {
        return NextResponse.json(
          { success: false, error: "Cannot delete the last admin" },
          { status: 400 }
        );
      }
    }

    const success = await db.deleteUser(userId);
    if (!success) {
      return NextResponse.json(
        { success: false, error: "User not found or delete failed" },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, message: "User deleted successfully" });
  } catch (error: any) {
    console.error("DELETE /api/users/[id] failed:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to delete user" },
      { status: 500 }
    );
  }
}
