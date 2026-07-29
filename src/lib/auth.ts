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

// Resolve a user from an `Authorization: Bearer <token>` header, if present.
// Returns undefined when no Bearer header is supplied (so callers can fall
// back to cookie auth), or null when a token is supplied but invalid.
async function getUserFromBearer(request: Request): Promise<PublicUser | null | undefined> {
  const header = request.headers.get("authorization");
  if (!header?.toLowerCase().startsWith("bearer ")) return undefined;
  const token = header.slice(7).trim();
  if (!token) return null;
  return db.getUserByApiToken(token);
}

// Resolve the requesting user via API token first, then session cookie.
export async function getRequestUser(request: Request): Promise<PublicUser | null> {
  const bearerUser = await getUserFromBearer(request);
  // A Bearer header was present: trust its result (valid user or null), and do
  // not fall through to cookie auth.
  if (bearerUser !== undefined) return bearerUser;
  return getCurrentUser();
}

type AuthResult = { user: PublicUser } | { response: NextResponse };

// Authorize an API request, requiring at least the given role. Accepts either
// an API token (Authorization: Bearer) or a session cookie.
// Returns the authenticated user, or a ready-to-return error response.
export async function authorize(
  request: Request,
  minimum: UserRole = "viewer"
): Promise<AuthResult> {
  const user = await getRequestUser(request);
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
