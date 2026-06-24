"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users as UsersIcon,
  Plus,
  Edit3,
  Trash2,
  X,
  ArrowLeft,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import type { PublicUser, UserRole } from "@/lib/db";

interface UserFormData {
  username: string;
  email: string;
  password: string;
  role: UserRole;
}

const ROLE_BADGES: Record<UserRole, string> = {
  admin: "text-cyan-400 border-cyan-500/30 bg-cyan-500/10",
  operator: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
  viewer: "text-zinc-400 border-zinc-700 bg-zinc-800/40",
};

export default function UsersPage() {
  const [currentUser, setCurrentUser] = useState<PublicUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<PublicUser | null>(null);
  const [formData, setFormData] = useState<UserFormData>({
    username: "",
    email: "",
    password: "",
    role: "viewer",
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchCurrentUser = async () => {
    try {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      if (data.success) setCurrentUser(data.user);
    } catch (err) {
      console.error("Failed to load current user", err);
    } finally {
      setAuthChecked(true);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/users");
      const data = await res.json();
      if (data.success) {
        setUsers(data.users);
        setError(null);
      } else {
        setError(data.error || "Failed to load users.");
      }
    } catch (err) {
      setError("Failed to connect to the users API.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
    fetchUsers();
  }, []);

  const handleAddClick = () => {
    setEditingUser(null);
    setFormData({ username: "", email: "", password: "", role: "viewer" });
    setFormError(null);
    setIsDrawerOpen(true);
  };

  const handleEditClick = (user: PublicUser) => {
    setEditingUser(user);
    setFormData({ username: user.username, email: user.email, password: "", role: user.role });
    setFormError(null);
    setIsDrawerOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);

    if (!formData.username.trim() || !formData.email.trim()) {
      setFormError("Username and email are required.");
      setSubmitting(false);
      return;
    }
    if (!editingUser && !formData.password.trim()) {
      setFormError("Password is required for new users.");
      setSubmitting(false);
      return;
    }

    try {
      const url = editingUser ? `/api/users/${editingUser.id}` : "/api/users";
      const method = editingUser ? "PUT" : "POST";
      const payload: Partial<UserFormData> = {
        username: formData.username,
        email: formData.email,
        role: formData.role,
      };
      if (formData.password.trim()) payload.password = formData.password;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setIsDrawerOpen(false);
        fetchUsers();
      } else {
        setFormError(data.error || "An error occurred while saving.");
      }
    } catch (err) {
      setFormError("Connection error. Could not reach the users API.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClick = async (user: PublicUser) => {
    if (!confirm(`Delete user "${user.username}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/users/${user.id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        fetchUsers();
      } else {
        alert(data.error || "Failed to delete user.");
      }
    } catch (err) {
      alert("Failed to delete user due to a network error.");
    }
  };

  // Gate the page to admins only.
  if (authChecked && currentUser && currentUser.role !== "admin") {
    return (
      <div className="flex-1 min-h-screen flex items-center justify-center bg-zinc-950 text-zinc-100 px-4">
        <div className="text-center max-w-md">
          <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
          <h2 className="text-lg font-bold">Access Restricted</h2>
          <p className="text-sm text-zinc-400 mt-2">
            User management is only available to administrators.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 mt-6 px-4 py-2 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-lg text-sm font-semibold transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-zinc-950 text-zinc-100 min-h-screen font-sans selection:bg-cyan-500 selection:text-black">
      <div className="absolute top-0 left-1/4 right-1/4 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent blur-[1px]"></div>

      {/* Header */}
      <header className="border-b border-zinc-800/80 bg-zinc-900/40 backdrop-blur-md sticky top-0 z-40 px-6 py-4">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-cyan-950/50 border border-cyan-800/50 rounded-xl shadow-[0_0_15px_rgba(6,182,212,0.15)] text-cyan-400">
              <UsersIcon className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
                User Management
              </h1>
              <p className="text-xs text-zinc-400 mt-0.5">Manage accounts, roles, and access</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-2 px-3 py-2 text-zinc-300 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 rounded-lg text-sm font-semibold transition"
            >
              <ArrowLeft className="w-4 h-4" />
              Dashboard
            </Link>
            <button
              onClick={handleAddClick}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-semibold text-sm rounded-lg transition shadow-[0_4px_20px_rgba(6,182,212,0.25)]"
            >
              <Plus className="w-4 h-4 stroke-[3px]" />
              Add User
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 flex-1">
        {error && (
          <div className="mb-6 p-4 bg-red-950/30 border border-red-800/50 rounded-xl flex items-start gap-3 text-red-200">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <p className="text-xs text-red-200/80">{error}</p>
          </div>
        )}

        <section className="bg-zinc-900/30 border border-zinc-800/80 rounded-xl overflow-hidden shadow-xl">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-zinc-400">
              <RefreshCw className="w-8 h-8 animate-spin text-cyan-400" />
              <span className="text-sm font-medium">Loading users...</span>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-20 px-4">
              <UsersIcon className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
              <h3 className="text-base font-bold text-zinc-300">No users found</h3>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800/80 bg-zinc-900/40 text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                    <th className="py-4 px-6">Username</th>
                    <th className="py-4 px-4">Email</th>
                    <th className="py-4 px-4">Role</th>
                    <th className="py-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/40 text-sm">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-zinc-900/20 group transition">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-zinc-800/40 border border-zinc-700/50 rounded-lg text-zinc-400 group-hover:text-cyan-400 transition">
                            <ShieldCheck className="w-4 h-4" />
                          </div>
                          <span className="font-bold text-zinc-200">{user.username}</span>
                          {currentUser?.id === user.id && (
                            <span className="text-[10px] text-zinc-500">(you)</span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4 text-zinc-300 text-xs">{user.email}</td>
                      <td className="py-4 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 border rounded-full text-xs font-semibold ${ROLE_BADGES[user.role]}`}
                        >
                          {user.role}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEditClick(user)}
                            className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-md border border-transparent hover:border-zinc-700 transition"
                            title="Edit user"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(user)}
                            disabled={currentUser?.id === user.id}
                            className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-zinc-800 rounded-md border border-transparent hover:border-zinc-700 transition disabled:opacity-30 disabled:hover:text-zinc-500 disabled:cursor-not-allowed"
                            title={currentUser?.id === user.id ? "You cannot delete yourself" : "Delete user"}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {/* Add/Edit Drawer */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsDrawerOpen(false)}
          ></div>
          <div className="relative w-full max-w-md bg-zinc-900 border-l border-zinc-800 h-full flex flex-col shadow-2xl z-10">
            <div className="px-6 py-5 border-b border-zinc-800 bg-zinc-900/60 backdrop-blur flex justify-between items-center">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <UsersIcon className="w-5 h-5 text-cyan-400" />
                  {editingUser ? `Edit: ${editingUser.username}` : "Create User"}
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  {editingUser ? "Update account details and role." : "Add a new account to the platform."}
                </p>
              </div>
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="p-1.5 text-zinc-400 hover:text-white bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50 rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
              {formError && (
                <div className="p-3 bg-red-950/40 border border-red-800/50 rounded-lg text-red-200 text-xs font-semibold">
                  {formError}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wide">Username *</label>
                <input
                  type="text"
                  required
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-lg px-3.5 py-2 text-sm text-zinc-200 outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wide">Email *</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-lg px-3.5 py-2 text-sm text-zinc-200 outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wide">
                  {editingUser ? "New Password (leave blank to keep)" : "Password *"}
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder={editingUser ? "••••••••" : "Set an initial password"}
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-lg px-3.5 py-2 text-sm text-zinc-200 outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wide">Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-lg px-3 py-2 text-sm text-zinc-300 outline-none cursor-pointer"
                >
                  <option value="viewer">Viewer (read-only)</option>
                  <option value="operator">Operator (manage servers)</option>
                  <option value="admin">Admin (full access)</option>
                </select>
              </div>

              <div className="border-t border-zinc-800 pt-6 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsDrawerOpen(false)}
                  className="px-4 py-2 border border-zinc-800 hover:border-zinc-700 bg-zinc-950 hover:bg-zinc-900 text-zinc-400 hover:text-zinc-300 text-xs font-bold rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black text-xs font-bold rounded-lg transition disabled:opacity-55"
                >
                  {submitting ? "Saving..." : editingUser ? "Save Changes" : "Create User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
