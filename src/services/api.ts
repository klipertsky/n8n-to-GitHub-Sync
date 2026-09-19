import { AppConfig, DiffResult, SyncLogEntry, TestResult, WorkflowItem } from "../types";

export const api = {
  async getConfig(): Promise<AppConfig> {
    const res = await fetch("/api/config");
    if (!res.ok) throw new Error("Failed to load settings");
    return res.json();
  },

  async updateConfig(config: Partial<AppConfig>): Promise<{ success: boolean; message: string }> {
    const res = await fetch("/api/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to save configuration");
    }
    return res.json();
  },

  async testN8n(n8nUrl: string, n8nApiKey: string): Promise<TestResult> {
    const res = await fetch("/api/test/n8n", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ n8nUrl, n8nApiKey }),
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || "Failed to test n8n connection" };
    }
    return data;
  },

  async testGithub(token: string, repo: string, branch: string): Promise<TestResult> {
    const res = await fetch("/api/test/github", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ githubToken: token, githubRepo: repo, githubBranch: branch }),
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || "Failed to test GitHub connection" };
    }
    return data;
  },

  async getWorkflows(): Promise<{ configured: boolean; workflows: WorkflowItem[]; error?: string }> {
    const res = await fetch("/api/workflows");
    if (!res.ok) throw new Error("Failed to fetch workflows");
    return res.json();
  },

  async syncAll(): Promise<SyncLogEntry> {
    const res = await fetch("/api/sync/all", { method: "POST" });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Failed to trigger sync");
    }
    return res.json();
  },

  async syncWorkflow(id: string): Promise<SyncLogEntry> {
    const res = await fetch(`/api/sync/workflow/${id}`, { method: "POST" });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Failed to sync workflow");
    }
    return res.json();
  },

  async getDiff(id: string): Promise<DiffResult> {
    const res = await fetch(`/api/diff/${id}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to retrieve workflow diff");
    }
    return res.json();
  },

  async getHistory(): Promise<{ history: SyncLogEntry[]; isSyncing: boolean }> {
    const res = await fetch("/api/history");
    if (!res.ok) throw new Error("Failed to load history");
    return res.json();
  },

  async clearHistory(): Promise<void> {
    const res = await fetch("/api/history", { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to clear history");
  },
};
