"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Server, Lock, User, AlertTriangle } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (data.success) {
        router.push("/");
        router.refresh();
      } else {
        setError(data.error || "Login failed.");
        setSubmitting(false);
      }
    } catch (err) {
      setError("Connection error. Could not reach the authentication API.");
      setSubmitting(false);
    }
  };

  return (
    <div className="flex-1 min-h-screen flex items-center justify-center bg-zinc-950 text-zinc-100 font-sans px-4 selection:bg-cyan-500 selection:text-black">
      {/* Ambient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[400px] h-[200px] bg-cyan-500/10 blur-[80px] rounded-full pointer-events-none"></div>

      <div className="relative w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="p-3 bg-cyan-950/50 border border-cyan-800/50 rounded-2xl shadow-[0_0_25px_rgba(6,182,212,0.2)] text-cyan-400 mb-4">
            <Server className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
            InfraOps Asset Manager
          </h1>
          <p className="text-xs text-zinc-500 mt-1">Sign in to access the inventory platform</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-6 space-y-5 shadow-2xl backdrop-blur"
        >
          {error && (
            <div className="p-3 bg-red-950/40 border border-red-800/50 rounded-lg flex items-start gap-2 text-red-200 text-xs font-semibold">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wide">Username</label>
            <div className="relative">
              <User className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
              <input
                type="text"
                required
                autoFocus
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                className="w-full bg-zinc-950 border border-zinc-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-lg pl-9 pr-3.5 py-2.5 text-sm text-zinc-200 outline-none transition"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wide">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-zinc-950 border border-zinc-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-lg pl-9 pr-3.5 py-2.5 text-sm text-zinc-200 outline-none transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black text-sm font-bold rounded-lg transition duration-200 disabled:opacity-55 shadow-[0_4px_20px_rgba(6,182,212,0.25)]"
          >
            {submitting ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="text-center text-[11px] text-zinc-600 mt-6">
          Enterprise Infrastructure Inventory Platform
        </p>
      </div>
    </div>
  );
}
