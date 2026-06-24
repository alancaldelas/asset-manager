import { Pool } from "pg";
import fs from "fs/promises";
import path from "path";

export interface ServerAsset {
  id: number;
  hostname: string;
  ip_address: string;
  status: "Active" | "Maintenance" | "Offline" | "Provisioning";
  os_name: string;
  cpu_cores: number;
  ram_gb: number;
  storage_gb: number;
  datacenter: string;
  rack: string;
  rack_unit: string;
  owner: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export type NewServerAsset = Omit<ServerAsset, "id" | "created_at" | "updated_at">;

class DatabaseManager {
  private pool: Pool | null = null;
  private isPostgres = false;
  private fallbackFilePath = path.join(process.cwd(), "data", "servers.json");
  private initialized = false;

  constructor() {
    const dbUrl = process.env.DATABASE_URL;
    if (dbUrl) {
      try {
        this.pool = new Pool({
          connectionString: dbUrl,
          // Add connection timeout and max clients to be production ready
          connectionTimeoutMillis: 5000,
          max: 20,
        });
        this.isPostgres = true;
      } catch (error) {
        console.error("Failed to initialize PostgreSQL pool, falling back to JSON storage:", error);
        this.pool = null;
        this.isPostgres = false;
      }
    } else {
      console.log("No DATABASE_URL found. Running with local JSON file storage.");
    }
  }

  async init() {
    if (this.initialized) return;

    if (this.isPostgres && this.pool) {
      try {
        const client = await this.pool.connect();
        try {
          await client.query(`
            CREATE TABLE IF NOT EXISTS servers (
              id SERIAL PRIMARY KEY,
              hostname VARCHAR(255) UNIQUE NOT NULL,
              ip_address VARCHAR(45) NOT NULL,
              status VARCHAR(50) NOT NULL,
              os_name VARCHAR(100) NOT NULL,
              cpu_cores INTEGER NOT NULL DEFAULT 1,
              ram_gb INTEGER NOT NULL DEFAULT 1,
              storage_gb INTEGER NOT NULL DEFAULT 10,
              datacenter VARCHAR(100) NOT NULL,
              rack VARCHAR(50) DEFAULT '',
              rack_unit VARCHAR(50) DEFAULT '',
              owner VARCHAR(100) DEFAULT '',
              notes TEXT DEFAULT '',
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
          `);
          console.log("PostgreSQL schema validated/created successfully.");
        } finally {
          client.release();
        }
      } catch (error) {
        console.error("Failed to connect to PostgreSQL or run migrations, falling back to JSON storage:", error);
        this.isPostgres = false;
        this.pool = null;
      }
    }

    if (!this.isPostgres) {
      // Ensure local data directory exists
      try {
        await fs.mkdir(path.dirname(this.fallbackFilePath), { recursive: true });
        try {
          await fs.access(this.fallbackFilePath);
        } catch {
          // File does not exist, write seed data
          const seedData: ServerAsset[] = [
            {
              id: 1,
              hostname: "web-prod-01.acme.org",
              ip_address: "10.0.1.10",
              status: "Active",
              os_name: "Ubuntu 22.04 LTS",
              cpu_cores: 8,
              ram_gb: 16,
              storage_gb: 120,
              datacenter: "us-east-1",
              rack: "A-04",
              rack_unit: "12U",
              owner: "Web Dev Team",
              notes: "Main frontend server serving traffic behind load balancer.",
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            {
              id: 2,
              hostname: "db-replica-02.acme.org",
              ip_address: "10.0.2.12",
              status: "Maintenance",
              os_name: "RHEL 9.2",
              cpu_cores: 16,
              ram_gb: 64,
              storage_gb: 1024,
              datacenter: "us-west-2",
              rack: "B-12",
              rack_unit: "02U",
              owner: "DB Admin Team",
              notes: "Read replica DB. Temporarily down for SSD replacement.",
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            {
              id: 3,
              hostname: "k8s-control-plane-01.acme.org",
              ip_address: "192.168.1.100",
              status: "Active",
              os_name: "Ubuntu 20.04 LTS",
              cpu_cores: 4,
              ram_gb: 8,
              storage_gb: 80,
              datacenter: "on-prem-chicago",
              rack: "Rack-A",
              rack_unit: "42U",
              owner: "Platform Eng",
              notes: "Kubernetes control plane node 1.",
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            {
              id: 4,
              hostname: "stg-api-worker-03.acme.org",
              ip_address: "10.10.3.50",
              status: "Offline",
              os_name: "Debian 12",
              cpu_cores: 4,
              ram_gb: 8,
              storage_gb: 60,
              datacenter: "us-east-1",
              rack: "A-09",
              rack_unit: "18U",
              owner: "QA Team",
              notes: "Staging worker node, currently powered down to save costs.",
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }
          ];
          await fs.writeFile(this.fallbackFilePath, JSON.stringify(seedData, null, 2), "utf8");
          console.log("Seed data created in JSON storage at", this.fallbackFilePath);
        }
      } catch (error) {
        console.error("Failed to initialize local JSON storage:", error);
      }
    }

    this.initialized = true;
  }

  getStorageMode(): { type: "PostgreSQL" | "Local JSON File"; details: string } {
    if (this.isPostgres && this.pool) {
      return { type: "PostgreSQL", details: "Connected to PostgreSQL database." };
    }
    return { type: "Local JSON File", details: `Storing data locally at ${this.fallbackFilePath}` };
  }

  // Helper to read from local file
  private async readJsonFile(): Promise<ServerAsset[]> {
    try {
      const data = await fs.readFile(this.fallbackFilePath, "utf8");
      return JSON.parse(data);
    } catch (err) {
      console.error("Error reading JSON file database:", err);
      return [];
    }
  }

  // Helper to write to local file
  private async writeJsonFile(data: ServerAsset[]): Promise<void> {
    try {
      await fs.writeFile(this.fallbackFilePath, JSON.stringify(data, null, 2), "utf8");
    } catch (err) {
      console.error("Error writing JSON file database:", err);
    }
  }

  async getServers(): Promise<ServerAsset[]> {
    await this.init();

    if (this.isPostgres && this.pool) {
      try {
        const res = await this.pool.query(
          "SELECT id, hostname, ip_address, status, os_name, cpu_cores, ram_gb, storage_gb, datacenter, rack, rack_unit, owner, notes, created_at, updated_at FROM servers ORDER BY hostname ASC"
        );
        return res.rows.map((row) => ({
          ...row,
          created_at: row.created_at?.toISOString() || new Date().toISOString(),
          updated_at: row.updated_at?.toISOString() || new Date().toISOString(),
        }));
      } catch (error) {
        console.error("PostgreSQL query error, falling back to JSON:", error);
      }
    }

    return this.readJsonFile();
  }

  async getServerById(id: number): Promise<ServerAsset | null> {
    await this.init();

    if (this.isPostgres && this.pool) {
      try {
        const res = await this.pool.query(
          "SELECT id, hostname, ip_address, status, os_name, cpu_cores, ram_gb, storage_gb, datacenter, rack, rack_unit, owner, notes, created_at, updated_at FROM servers WHERE id = $1",
          [id]
        );
        if (res.rows.length === 0) return null;
        const row = res.rows[0];
        return {
          ...row,
          created_at: row.created_at?.toISOString() || new Date().toISOString(),
          updated_at: row.updated_at?.toISOString() || new Date().toISOString(),
        };
      } catch (error) {
        console.error("PostgreSQL query error, falling back to JSON:", error);
      }
    }

    const servers = await this.readJsonFile();
    return servers.find((s) => s.id === id) || null;
  }

  async createServer(server: NewServerAsset): Promise<ServerAsset> {
    await this.init();

    if (this.isPostgres && this.pool) {
      try {
        const res = await this.pool.query(
          `INSERT INTO servers (
            hostname, ip_address, status, os_name, cpu_cores, ram_gb, storage_gb, datacenter, rack, rack_unit, owner, notes
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          RETURNING id, hostname, ip_address, status, os_name, cpu_cores, ram_gb, storage_gb, datacenter, rack, rack_unit, owner, notes, created_at, updated_at`,
          [
            server.hostname,
            server.ip_address,
            server.status,
            server.os_name,
            server.cpu_cores,
            server.ram_gb,
            server.storage_gb,
            server.datacenter,
            server.rack || "",
            server.rack_unit || "",
            server.owner || "",
            server.notes || "",
          ]
        );
        const row = res.rows[0];
        return {
          ...row,
          created_at: row.created_at?.toISOString() || new Date().toISOString(),
          updated_at: row.updated_at?.toISOString() || new Date().toISOString(),
        };
      } catch (error) {
        console.error("PostgreSQL insert error, falling back to JSON:", error);
      }
    }

    const servers = await this.readJsonFile();
    const newId = servers.length > 0 ? Math.max(...servers.map((s) => s.id)) + 1 : 1;
    const now = new Date().toISOString();
    const createdServer: ServerAsset = {
      ...server,
      id: newId,
      created_at: now,
      updated_at: now,
    };
    servers.push(createdServer);
    await this.writeJsonFile(servers);
    return createdServer;
  }

  async updateServer(id: number, server: Partial<NewServerAsset>): Promise<ServerAsset | null> {
    await this.init();

    if (this.isPostgres && this.pool) {
      try {
        // Build dynamic query
        const keys = Object.keys(server) as Array<keyof NewServerAsset>;
        if (keys.length === 0) {
          return this.getServerById(id);
        }

        const setClause = keys.map((key, i) => `${key} = $${i + 1}`).join(", ");
        const values = keys.map((key) => server[key]);

        // Add updated_at
        const query = `
          UPDATE servers
          SET ${setClause}, updated_at = CURRENT_TIMESTAMP
          WHERE id = $${values.length + 1}
          RETURNING id, hostname, ip_address, status, os_name, cpu_cores, ram_gb, storage_gb, datacenter, rack, rack_unit, owner, notes, created_at, updated_at
        `;

        const res = await this.pool.query(query, [...values, id]);
        if (res.rows.length === 0) return null;
        const row = res.rows[0];
        return {
          ...row,
          created_at: row.created_at?.toISOString() || new Date().toISOString(),
          updated_at: row.updated_at?.toISOString() || new Date().toISOString(),
        };
      } catch (error) {
        console.error("PostgreSQL update error, falling back to JSON:", error);
      }
    }

    const servers = await this.readJsonFile();
    const index = servers.findIndex((s) => s.id === id);
    if (index === -1) return null;

    const existing = servers[index];
    const updated: ServerAsset = {
      ...existing,
      ...server,
      id: existing.id,
      created_at: existing.created_at,
      updated_at: new Date().toISOString(),
    };

    servers[index] = updated;
    await this.writeJsonFile(servers);
    return updated;
  }

  async deleteServer(id: number): Promise<boolean> {
    await this.init();

    if (this.isPostgres && this.pool) {
      try {
        const res = await this.pool.query("DELETE FROM servers WHERE id = $1", [id]);
        return (res.rowCount ?? 0) > 0;
      } catch (error) {
        console.error("PostgreSQL delete error, falling back to JSON:", error);
      }
    }

    const servers = await this.readJsonFile();
    const filtered = servers.filter((s) => s.id !== id);
    if (filtered.length === servers.length) return false;
    await this.writeJsonFile(filtered);
    return true;
  }
}

export const db = new DatabaseManager();
