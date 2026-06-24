"use client";

import { useState, useEffect } from "react";
import {
  Server,
  Database,
  Plus,
  Search,
  Trash2,
  Edit3,
  Cpu,
  Layers,
  HardDrive,
  Activity,
  RefreshCw,
  MapPin,
  User,
  X,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Power,
  ServerCrash,
  FileCode,
  Terminal,
  ExternalLink
} from "lucide-react";
import { ServerAsset, NewServerAsset } from "@/lib/db";

export default function Home() {
  const [servers, setServers] = useState<ServerAsset[]>([]);
  const [storageMode, setStorageMode] = useState<{ type: string; details: string }>({
    type: "Loading...",
    details: ""
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dcFilter, setDcFilter] = useState("all");

  // Form / Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingServer, setEditingServer] = useState<ServerAsset | null>(null);
  const [formData, setFormData] = useState<NewServerAsset>({
    hostname: "",
    ip_address: "",
    status: "Active",
    os_name: "Ubuntu 22.04 LTS",
    cpu_cores: 4,
    ram_gb: 8,
    storage_gb: 80,
    datacenter: "us-east-1",
    rack: "",
    rack_unit: "",
    owner: "",
    notes: ""
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Stats computed from filtered or raw servers
  const stats = {
    total: servers.length,
    active: servers.filter((s) => s.status === "Active").length,
    maintenance: servers.filter((s) => s.status === "Maintenance").length,
    offline: servers.filter((s) => s.status === "Offline").length,
    provisioning: servers.filter((s) => s.status === "Provisioning").length,
    totalCpu: servers.reduce((acc, s) => acc + s.cpu_cores, 0),
    totalRam: servers.reduce((acc, s) => acc + s.ram_gb, 0),
    totalStorage: servers.reduce((acc, s) => acc + s.storage_gb, 0)
  };

  const datacenters = Array.from(new Set(servers.map((s) => s.datacenter)));

  // Fetch servers
  const fetchServers = async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) setRefreshing(true);
    try {
      const res = await fetch("/api/servers");
      const data = await res.json();
      if (data.success) {
        setServers(data.servers);
        setStorageMode(data.storageMode);
        setError(null);
      } else {
        setError(data.error || "Failed to load servers.");
      }
    } catch (err: any) {
      setError("Failed to connect to the server API.");
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchServers();
  }, []);

  // Open drawer to add a server
  const handleAddClick = () => {
    setEditingServer(null);
    setFormData({
      hostname: "",
      ip_address: "",
      status: "Active",
      os_name: "Ubuntu 22.04 LTS",
      cpu_cores: 4,
      ram_gb: 8,
      storage_gb: 80,
      datacenter: "us-east-1",
      rack: "",
      rack_unit: "",
      owner: "",
      notes: ""
    });
    setFormError(null);
    setIsDrawerOpen(true);
  };

  // Open drawer to edit a server
  const handleEditClick = (server: ServerAsset) => {
    setEditingServer(server);
    setFormData({
      hostname: server.hostname,
      ip_address: server.ip_address,
      status: server.status,
      os_name: server.os_name,
      cpu_cores: server.cpu_cores,
      ram_gb: server.ram_gb,
      storage_gb: server.storage_gb,
      datacenter: server.datacenter,
      rack: server.rack || "",
      rack_unit: server.rack_unit || "",
      owner: server.owner || "",
      notes: server.notes || ""
    });
    setFormError(null);
    setIsDrawerOpen(true);
  };

  // Submit Add/Edit form
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);

    // Simple frontend validation
    if (!formData.hostname.trim()) {
      setFormError("Hostname is required.");
      setSubmitting(false);
      return;
    }
    if (!formData.ip_address.trim()) {
      setFormError("IP Address is required.");
      setSubmitting(false);
      return;
    }
    if (!formData.datacenter.trim()) {
      setFormError("Datacenter is required.");
      setSubmitting(false);
      return;
    }

    try {
      const url = editingServer ? `/api/servers/${editingServer.id}` : "/api/servers";
      const method = editingServer ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      const data = await res.json();

      if (data.success) {
        setIsDrawerOpen(false);
        fetchServers();
      } else {
        setFormError(data.error || "An error occurred while saving.");
      }
    } catch (err) {
      setFormError("Connection error. Could not reach server API.");
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Server
  const handleDeleteClick = async (server: ServerAsset) => {
    if (!confirm(`Are you sure you want to delete ${server.hostname}?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/servers/${server.id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        fetchServers();
      } else {
        alert(data.error || "Failed to delete server.");
      }
    } catch (err) {
      alert("Failed to delete server due to a network error.");
    }
  };

  // Filtered servers
  const filteredServers = servers.filter((server) => {
    const matchesSearch =
      server.hostname.toLowerCase().includes(searchTerm.toLowerCase()) ||
      server.ip_address.includes(searchTerm) ||
      (server.owner && server.owner.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === "all" || server.status === statusFilter;
    const matchesDc = dcFilter === "all" || server.datacenter === dcFilter;

    return matchesSearch && matchesStatus && matchesDc;
  });

  return (
    <div className="flex-1 bg-zinc-950 text-zinc-100 min-h-screen font-sans selection:bg-cyan-500 selection:text-black">
      {/* Upper Glowing Banner */}
      <div className="absolute top-0 left-1/4 right-1/4 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent blur-[1px]"></div>
      <div className="absolute top-0 left-1/3 right-1/3 h-[50px] bg-cyan-500/5 blur-[40px] rounded-full"></div>

      {/* Header */}
      <header className="border-b border-zinc-800/80 bg-zinc-900/40 backdrop-blur-md sticky top-0 z-40 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-cyan-950/50 border border-cyan-800/50 rounded-xl shadow-[0_0_15px_rgba(6,182,212,0.15)] text-cyan-400">
              <Server className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
                  InfraOps Asset Manager
                </h1>
                <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 rounded">
                  v1.0.0
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">Enterprise Infrastructure Inventory Platform</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Database status pill */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs">
              <div className={`w-2 h-2 rounded-full ${storageMode.type.includes("PostgreSQL") ? "bg-emerald-500 animate-ping" : "bg-amber-500"}`}></div>
              <Database className="w-3.5 h-3.5 text-zinc-400" />
              <span className="font-semibold text-zinc-300">{storageMode.type}</span>
              <span className="text-zinc-500 hidden lg:inline">| {storageMode.details}</span>
            </div>

            {/* Refresh Button */}
            <button
              onClick={() => fetchServers(true)}
              className="p-2 text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 rounded-lg transition duration-200"
              title="Refresh database status"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-cyan-400" : ""}`} />
            </button>

            {/* Add Server Button */}
            <button
              onClick={handleAddClick}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-semibold text-sm rounded-lg transition duration-300 shadow-[0_4px_20px_rgba(6,182,212,0.25)] hover:shadow-[0_4px_25px_rgba(6,182,212,0.4)]"
            >
              <Plus className="w-4 h-4 stroke-[3px]" />
              Add Server
            </button>
          </div>
        </div>
      </header>

      {/* Main Dashboard Layout */}
      <main className="max-w-7xl mx-auto px-6 py-8 flex-1">
        {/* Error notification */}
        {error && (
          <div className="mb-6 p-4 bg-red-950/30 border border-red-800/50 rounded-xl flex items-start gap-3 text-red-200">
            <ServerCrash className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-sm text-red-300">Database Connection Warning</h4>
              <p className="text-xs text-red-200/80 mt-1">{error}</p>
              <button onClick={() => fetchServers()} className="text-xs underline text-red-400 hover:text-red-300 font-medium mt-2">
                Retry Connection
              </button>
            </div>
          </div>
        )}

        {/* 1. Metrics Grid */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4 lg:gap-6 mb-8">
          {/* Card 1: Total Servers */}
          <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-5 relative overflow-hidden group hover:border-zinc-700/60 transition duration-300">
            <div className="absolute top-0 right-0 p-6 opacity-[0.03] text-white pointer-events-none group-hover:scale-110 transition duration-500">
              <Server className="w-32 h-32" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Total Assets</span>
              <div className="p-1.5 bg-zinc-800 rounded-lg text-zinc-300">
                <Server className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-black">{loading ? "..." : stats.total}</span>
              <span className="text-xs text-zinc-500">physical / VM</span>
            </div>
            <div className="mt-2 text-[10px] text-zinc-500 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              Synchronized with database
            </div>
          </div>

          {/* Card 2: Status Breakdown */}
          <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-5 relative overflow-hidden group hover:border-zinc-700/60 transition duration-300">
            <div className="absolute top-0 right-0 p-6 opacity-[0.03] text-white pointer-events-none group-hover:scale-110 transition duration-500">
              <Activity className="w-32 h-32" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Fleet Status</span>
              <div className="p-1.5 bg-zinc-800 rounded-lg text-zinc-300">
                <Activity className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between gap-1 text-[11px] font-medium">
              <div className="flex flex-col items-center flex-1 py-1 bg-zinc-950/40 rounded border border-zinc-800/50">
                <span className="text-emerald-400 font-bold">{stats.active}</span>
                <span className="text-[9px] text-zinc-500">Active</span>
              </div>
              <div className="flex flex-col items-center flex-1 py-1 bg-zinc-950/40 rounded border border-zinc-800/50">
                <span className="text-amber-400 font-bold">{stats.maintenance}</span>
                <span className="text-[9px] text-zinc-500">Maint</span>
              </div>
              <div className="flex flex-col items-center flex-1 py-1 bg-zinc-950/40 rounded border border-zinc-800/50">
                <span className="text-blue-400 font-bold">{stats.provisioning}</span>
                <span className="text-[9px] text-zinc-500">Prov</span>
              </div>
              <div className="flex flex-col items-center flex-1 py-1 bg-zinc-950/40 rounded border border-zinc-800/50">
                <span className="text-zinc-400 font-bold">{stats.offline}</span>
                <span className="text-[9px] text-zinc-500">Offline</span>
              </div>
            </div>
          </div>

          {/* Card 3: CPU & RAM Capacity */}
          <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-5 relative overflow-hidden group hover:border-zinc-700/60 transition duration-300">
            <div className="absolute top-0 right-0 p-6 opacity-[0.03] text-white pointer-events-none group-hover:scale-110 transition duration-500">
              <Cpu className="w-32 h-32" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Compute Fleet</span>
              <div className="p-1.5 bg-zinc-800 rounded-lg text-zinc-300">
                <Cpu className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex flex-col gap-1.5">
              <div className="flex justify-between items-center">
                <span className="text-xs text-zinc-400">Total CPU Cores:</span>
                <span className="text-sm font-bold text-zinc-200">{stats.totalCpu}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-zinc-400">Total Memory:</span>
                <span className="text-sm font-bold text-zinc-200">{stats.totalRam} GB</span>
              </div>
            </div>
          </div>

          {/* Card 4: Storage Pool */}
          <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-5 relative overflow-hidden group hover:border-zinc-700/60 transition duration-300">
            <div className="absolute top-0 right-0 p-6 opacity-[0.03] text-white pointer-events-none group-hover:scale-110 transition duration-500">
              <HardDrive className="w-32 h-32" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Storage Pool</span>
              <div className="p-1.5 bg-zinc-800 rounded-lg text-zinc-300">
                <HardDrive className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-black">
                {stats.totalStorage >= 1024
                  ? (stats.totalStorage / 1024).toFixed(2)
                  : stats.totalStorage}
              </span>
              <span className="text-xs text-zinc-400">
                {stats.totalStorage >= 1024 ? "TB Managed" : "GB Managed"}
              </span>
            </div>
            <div className="mt-2 text-[10px] text-zinc-500 flex items-center justify-between">
              <span>Across {servers.length} nodes</span>
              <span className="text-cyan-400">RAID/SAN included</span>
            </div>
          </div>
        </section>

        {/* 2. Controls & Search Panel */}
        <section className="bg-zinc-900/40 border border-zinc-800/60 rounded-xl p-4 mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Search bar */}
          <div className="relative w-full md:w-96">
            <Search className="w-4.5 h-4.5 text-zinc-500 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search hostname, IP, or owner..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-zinc-950/80 border border-zinc-800 hover:border-zinc-700 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-lg pl-10 pr-4 py-2 text-sm text-zinc-200 outline-none transition duration-200"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Status filter */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs text-zinc-500 whitespace-nowrap">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-zinc-950/80 border border-zinc-800 hover:border-zinc-700 focus:border-cyan-500 text-xs text-zinc-300 rounded-lg px-3 py-2 outline-none transition duration-200 cursor-pointer min-w-[110px]"
              >
                <option value="all">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Provisioning">Provisioning</option>
                <option value="Offline">Offline</option>
              </select>
            </div>

            {/* Datacenter filter */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs text-zinc-500 whitespace-nowrap">Location:</span>
              <select
                value={dcFilter}
                onChange={(e) => setDcFilter(e.target.value)}
                className="bg-zinc-950/80 border border-zinc-800 hover:border-zinc-700 focus:border-cyan-500 text-xs text-zinc-300 rounded-lg px-3 py-2 outline-none transition duration-200 cursor-pointer min-w-[120px]"
              >
                <option value="all">All Regions</option>
                {datacenters.map((dc) => (
                  <option key={dc} value={dc}>
                    {dc}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* 3. Server List / Table */}
        <section className="bg-zinc-900/30 border border-zinc-800/80 rounded-xl overflow-hidden shadow-xl">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-zinc-400">
              <RefreshCw className="w-8 h-8 animate-spin text-cyan-400" />
              <span className="text-sm font-medium">Fetching infrastructure asset inventory...</span>
            </div>
          ) : filteredServers.length === 0 ? (
            <div className="text-center py-20 px-4">
              <Server className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
              <h3 className="text-base font-bold text-zinc-300">No servers found</h3>
              <p className="text-xs text-zinc-500 mt-1 max-w-md mx-auto">
                No server assets matched your current search parameters. Clear your filters or add a new server to expand the catalog.
              </p>
              {(searchTerm || statusFilter !== "all" || dcFilter !== "all") && (
                <button
                  onClick={() => {
                    setSearchTerm("");
                    setStatusFilter("all");
                    setDcFilter("all");
                  }}
                  className="mt-4 px-4 py-2 bg-zinc-800 hover:bg-zinc-750 text-xs font-semibold rounded-lg border border-zinc-700 transition"
                >
                  Clear Filters
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800/80 bg-zinc-900/40 text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                    <th className="py-4 px-6">Server / Hostname</th>
                    <th className="py-4 px-4">Status</th>
                    <th className="py-4 px-4">Network Info</th>
                    <th className="py-4 px-4">Specifications</th>
                    <th className="py-4 px-4">Location & Rack</th>
                    <th className="py-4 px-4">Owner</th>
                    <th className="py-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/40 text-sm">
                  {filteredServers.map((server) => {
                    // Status Badge Config
                    let statusColor = "text-zinc-400 border-zinc-800 bg-zinc-900/40";
                    let StatusIcon = Power;
                    if (server.status === "Active") {
                      statusColor = "text-emerald-400 border-emerald-500/20 bg-emerald-500/5";
                      StatusIcon = CheckCircle2;
                    } else if (server.status === "Maintenance") {
                      statusColor = "text-amber-400 border-amber-500/20 bg-amber-500/5";
                      StatusIcon = AlertTriangle;
                    } else if (server.status === "Provisioning") {
                      statusColor = "text-cyan-400 border-cyan-500/20 bg-cyan-500/5";
                      StatusIcon = Clock;
                    }

                    return (
                      <tr
                        key={server.id}
                        className="hover:bg-zinc-900/20 group transition duration-150"
                      >
                        {/* Hostname & OS */}
                        <td className="py-4.5 px-6">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-zinc-800/40 border border-zinc-700/50 rounded-lg group-hover:border-cyan-900/30 group-hover:bg-cyan-950/10 text-zinc-400 group-hover:text-cyan-400 transition duration-200">
                              <Terminal className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="font-bold text-zinc-200 group-hover:text-white transition duration-150">
                                {server.hostname}
                              </div>
                              <div className="text-xs text-zinc-500 mt-0.5 flex items-center gap-1">
                                <span className="px-1.5 py-0.2 bg-zinc-800/80 rounded border border-zinc-700/30 text-[10px] text-zinc-400">
                                  {server.os_name}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Status Badge */}
                        <td className="py-4.5 px-4">
                          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 border rounded-full text-xs font-semibold ${statusColor}`}>
                            <StatusIcon className="w-3.5 h-3.5" />
                            {server.status}
                          </div>
                        </td>

                        {/* Network IP */}
                        <td className="py-4.5 px-4 font-mono text-xs text-zinc-300">
                          <div>{server.ip_address}</div>
                          <div className="text-[10px] text-zinc-600 mt-0.5">Static Assignment</div>
                        </td>

                        {/* Specs */}
                        <td className="py-4.5 px-4">
                          <div className="flex items-center gap-4 text-zinc-300 text-xs">
                            <div className="flex items-center gap-1" title="CPU Cores">
                              <Cpu className="w-3.5 h-3.5 text-zinc-500" />
                              <span>{server.cpu_cores} vCPU</span>
                            </div>
                            <div className="flex items-center gap-1" title="Memory Size">
                              <Layers className="w-3.5 h-3.5 text-zinc-500" />
                              <span>{server.ram_gb} GB</span>
                            </div>
                            <div className="flex items-center gap-1" title="Disk Space">
                              <HardDrive className="w-3.5 h-3.5 text-zinc-500" />
                              <span>{server.storage_gb} GB</span>
                            </div>
                          </div>
                        </td>

                        {/* Location / Rack */}
                        <td className="py-4.5 px-4 text-xs text-zinc-300">
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                            <span className="font-semibold text-zinc-400">{server.datacenter}</span>
                          </div>
                          {(server.rack || server.rack_unit) && (
                            <div className="text-[10px] text-zinc-500 mt-1 font-mono">
                              Rack: {server.rack || "-"} / Unit: {server.rack_unit || "-"}
                            </div>
                          )}
                        </td>

                        {/* Owner */}
                        <td className="py-4.5 px-4 text-xs text-zinc-400">
                          {server.owner ? (
                            <div className="flex items-center gap-1">
                              <User className="w-3.5 h-3.5 text-zinc-600" />
                              <span>{server.owner}</span>
                            </div>
                          ) : (
                            <span className="text-zinc-600">Unassigned</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-4.5 px-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {/* SSH mock command */}
                            <button
                              onClick={() => alert(`ssh admin@${server.ip_address}`)}
                              className="p-1.5 text-zinc-400 hover:text-cyan-400 hover:bg-zinc-800 rounded-md border border-transparent hover:border-zinc-700 transition"
                              title="Generate SSH Connection Command"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </button>

                            {/* Edit */}
                            <button
                              onClick={() => handleEditClick(server)}
                              className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-md border border-transparent hover:border-zinc-700 transition"
                              title="Edit asset details"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>

                            {/* Delete */}
                            <button
                              onClick={() => handleDeleteClick(server)}
                              className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-zinc-800 rounded-md border border-transparent hover:border-zinc-700 transition"
                              title="Decommission server"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {/* 4. Side Drawer Modal for Add/Edit */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Overlay backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
            onClick={() => setIsDrawerOpen(false)}
          ></div>

          {/* Drawer container */}
          <div className="relative w-full max-w-lg bg-zinc-900 border-l border-zinc-800 h-full flex flex-col shadow-2xl z-10 transition-transform duration-300">
            {/* Drawer Header */}
            <div className="px-6 py-5 border-b border-zinc-850 bg-zinc-900/60 backdrop-blur flex justify-between items-center">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Server className="w-5 h-5 text-cyan-400" />
                  {editingServer ? `Edit: ${editingServer.hostname}` : "Register Server Asset"}
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  {editingServer
                    ? "Update infrastructure parameters and allocation."
                    : "Add a new host to the datacenter inventory registry."}
                </p>
              </div>
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="p-1.5 text-zinc-400 hover:text-white bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50 rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Drawer Body (Scrollable form) */}
            <form onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
              {formError && (
                <div className="p-3 bg-red-950/40 border border-red-800/50 rounded-lg text-red-200 text-xs font-semibold">
                  {formError}
                </div>
              )}

              {/* Hostname */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wide">Hostname / FQDN *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. node-03.us-west.acme.org"
                  value={formData.hostname}
                  onChange={(e) => setFormData({ ...formData, hostname: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-lg px-3.5 py-2 text-sm text-zinc-200 outline-none"
                />
              </div>

              {/* IP Address & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-wide">IP Address *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 10.0.1.15 or 192.168.1.5"
                    value={formData.ip_address}
                    onChange={(e) => setFormData({ ...formData, ip_address: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-lg px-3.5 py-2 text-sm text-zinc-200 outline-none font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-wide">Lifecycle Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full bg-zinc-950 border border-zinc-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-lg px-3 py-2 text-sm text-zinc-300 outline-none cursor-pointer"
                  >
                    <option value="Active">Active (Serving Traffic)</option>
                    <option value="Maintenance">Maintenance (Offlined)</option>
                    <option value="Provisioning">Provisioning (Setup)</option>
                    <option value="Offline">Offline (De-powered)</option>
                  </select>
                </div>
              </div>

              {/* OS & Datacenter */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-wide">Operating System *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ubuntu 22.04 LTS"
                    value={formData.os_name}
                    onChange={(e) => setFormData({ ...formData, os_name: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-lg px-3.5 py-2 text-sm text-zinc-200 outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-wide">Datacenter / Region *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. us-east-1 or dc-chicago"
                    value={formData.datacenter}
                    onChange={(e) => setFormData({ ...formData, datacenter: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-lg px-3.5 py-2 text-sm text-zinc-200 outline-none"
                  />
                </div>
              </div>

              {/* Hardware Specs: CPU, RAM, Disk */}
              <div className="border-t border-zinc-850 pt-4">
                <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider mb-3">Resource Configuration</h4>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-450 uppercase">CPU Cores</label>
                    <input
                      type="number"
                      min="1"
                      value={formData.cpu_cores}
                      onChange={(e) => setFormData({ ...formData, cpu_cores: parseInt(e.target.value, 10) || 1 })}
                      className="w-full bg-zinc-950 border border-zinc-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-lg px-3 py-2 text-sm text-zinc-200 outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-450 uppercase">RAM (GB)</label>
                    <input
                      type="number"
                      min="1"
                      value={formData.ram_gb}
                      onChange={(e) => setFormData({ ...formData, ram_gb: parseInt(e.target.value, 10) || 1 })}
                      className="w-full bg-zinc-950 border border-zinc-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-lg px-3 py-2 text-sm text-zinc-200 outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-450 uppercase">Disk (GB)</label>
                    <input
                      type="number"
                      min="1"
                      value={formData.storage_gb}
                      onChange={(e) => setFormData({ ...formData, storage_gb: parseInt(e.target.value, 10) || 10 })}
                      className="w-full bg-zinc-950 border border-zinc-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-lg px-3 py-2 text-sm text-zinc-200 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Physical Rack Placement */}
              <div className="border-t border-zinc-850 pt-4">
                <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider mb-3">Physical Rack Allocation (Optional)</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-wide">Rack Identifier</label>
                    <input
                      type="text"
                      placeholder="e.g. A-04"
                      value={formData.rack}
                      onChange={(e) => setFormData({ ...formData, rack: e.target.value })}
                      className="w-full bg-zinc-950 border border-zinc-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-lg px-3.5 py-2 text-sm text-zinc-200 outline-none font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-wide">Rack Unit Position</label>
                    <input
                      type="text"
                      placeholder="e.g. 12U or 42U"
                      value={formData.rack_unit}
                      onChange={(e) => setFormData({ ...formData, rack_unit: e.target.value })}
                      className="w-full bg-zinc-950 border border-zinc-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-lg px-3.5 py-2 text-sm text-zinc-200 outline-none font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Ownership & Notes */}
              <div className="border-t border-zinc-850 pt-4 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-wide">Owner / Cost Center</label>
                  <input
                    type="text"
                    placeholder="e.g. Core Infra Team"
                    value={formData.owner}
                    onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-lg px-3.5 py-2 text-sm text-zinc-200 outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-wide">Operational Notes</label>
                  <textarea
                    rows={3}
                    placeholder="Additional context, links, or provisioning notes..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-lg px-3.5 py-2 text-sm text-zinc-250 outline-none resize-y"
                  />
                </div>
              </div>

              {/* Footer Actions */}
              <div className="border-t border-zinc-850 pt-6 flex items-center justify-end gap-3 bg-zinc-900 sticky bottom-0 pb-2">
                <button
                  type="button"
                  onClick={() => setIsDrawerOpen(false)}
                  className="px-4 py-2 border border-zinc-800 hover:border-zinc-700 bg-zinc-950 hover:bg-zinc-900 text-zinc-450 hover:text-zinc-300 text-xs font-bold rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black text-xs font-bold rounded-lg transition duration-200 disabled:opacity-55"
                >
                  {submitting ? "Saving Asset..." : editingServer ? "Save Changes" : "Register Server"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-zinc-900 bg-zinc-950 py-8 px-6 mt-12 text-center text-xs text-zinc-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-cyan-500" />
            <span>InfraOps Asset Manager Server Dashboard</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-zinc-650">Deployable on Kubernetes with PostgreSQL support.</span>
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="hover:text-cyan-400 transition flex items-center gap-1">
              Documentation <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
