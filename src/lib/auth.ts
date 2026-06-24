import "server-only";
import { cache } from "react";
import { NextResponse } from "next/server";
import { db, type PublicUser, type UserRole } from "@/lib/db";
import { getSession } from "@/lib/session";

// Role hierarchy used for permission checks. Higher number = more privileges.
const ROLE_RANK: Record<UserRole, number> = {
  viewer: 1,
  operator: 2,
  admin: 3,
};

// True when `role` meets or exceeds the `minimum` required role.
export function roleAtLeast(role: UserRole, minimum: UserRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[minimum];
}

// Resolve the currently authenticated user from the session cookie.
// Cached per-request so repeated calls don't re-query the database.
export const getCurrentUser = cache(async (): Promise<PublicUser | null> => {
  const session = await getSession();
  if (!session) return null;
  return db.getUserById(session.userId);
});

type AuthResult = { user: PublicUser } | { response: NextResponse };

// Authorize an API request, requiring at least the given role.
// Returns the authenticated user, or a ready-to-return error response.
export async function authorize(minimum: UserRole = "viewer"): Promise<AuthResult> {
  const user = await getCurrentUser();
  if (!user) {
    return {
      response: NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      ),
    };
  }
  if (!roleAtLeast(user.role, minimum)) {
    return {
      response: NextResponse.json(
        { success: false, error: "Insufficient permissions" },
        { status: 403 }
      ),
    };
  }
  return { user };
}
