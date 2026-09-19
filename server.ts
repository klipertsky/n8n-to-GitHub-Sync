import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = 3000;

// Enable JSON body parsing with large payload limit for workflow JSONs
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

// Persistent storage directory for app config and logs
const DATA_DIR = path.join(process.cwd(), "data");
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const CONFIG_FILE = path.join(DATA_DIR, "config.json");
const HISTORY_FILE = path.join(DATA_DIR, "history.json");
const WORKFLOW_CACHE_FILE = path.join(DATA_DIR, "workflows_cache.json");

interface AppConfig {
  n8nUrl: string;
  n8nApiKey: string;
  githubToken: string;
  githubRepo: string; // "owner/repo"
  githubBranch: string;
  githubPath: string; // e.g. "workflows"
  commitAuthorName: string;
  commitAuthorEmail: string;
  commitMessageTemplate: string;
  pollingEnabled: boolean;
  pollingIntervalMinutes: number;
  webhookSecret: string;
  backupFormatting: "pretty" | "compact";
  deleteDeletedWorkflows: boolean;
}

const DEFAULT_CONFIG: AppConfig = {
  n8nUrl: process.env.N8N_URL || "",
  n8nApiKey: process.env.N8N_API_KEY || "",
  githubToken: process.env.GITHUB_TOKEN || "",
  githubRepo: process.env.GITHUB_REPO || "",
  githubBranch: process.env.GITHUB_BRANCH || "main",
  githubPath: "workflows",
  commitAuthorName: "n8n Sync Bot",
  commitAuthorEmail: "n8n-sync@local.internal",
  commitMessageTemplate: "chore(n8n): sync {name} [auto-sync]",
  pollingEnabled: true,
  pollingIntervalMinutes: 5,
  webhookSecret: crypto.randomBytes(16).toString("hex"),
  backupFormatting: "pretty",
  deleteDeletedWorkflows: false,
};

function readConfig(): AppConfig {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf-8"));
      return { ...DEFAULT_CONFIG, ...data };
    }
  } catch (err) {
    console.error("Error reading config file:", err);
  }
  return { ...DEFAULT_CONFIG };
}

function writeConfig(config: AppConfig) {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), "utf-8");
}

export interface SyncLogEntry {
  id: string;
  timestamp: string;
  trigger: "manual" | "polling" | "webhook";
  status: "success" | "partial" | "no_changes" | "error";
  message: string;
  syncedCount: number;
  totalWorkflows: number;
  details?: Array<{
    workflowId: string;
    workflowName: string;
    action: "added" | "updated" | "deleted" | "unchanged" | "error";
    commitSha?: string;
    commitUrl?: string;
    error?: string;
  }>;
}

function readHistory(): SyncLogEntry[] {
  try {
    if (fs.existsSync(HISTORY_FILE)) {
      return JSON.parse(fs.readFileSync(HISTORY_FILE, "utf-8"));
    }
  } catch (err) {
    console.error("Error reading history file:", err);
  }
  return [];
}

function appendHistory(entry: SyncLogEntry) {
  const history = readHistory();
  history.unshift(entry);
  // Keep last 100 entries
  if (history.length > 100) {
    history.length = 100;
  }
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2), "utf-8");
}

interface WorkflowStateCache {
  [workflowId: string]: {
    hash: string;
    name: string;
    updatedAt: string;
    githubSha?: string;
    lastSyncedAt?: string;
  };
}

function readWorkflowCache(): WorkflowStateCache {
  try {
    if (fs.existsSync(WORKFLOW_CACHE_FILE)) {
      return JSON.parse(fs.readFileSync(WORKFLOW_CACHE_FILE, "utf-8"));
    }
  } catch (err) {
    console.error("Error reading workflow cache:", err);
  }
  return {};
}

function writeWorkflowCache(cache: WorkflowStateCache) {
  fs.writeFileSync(WORKFLOW_CACHE_FILE, JSON.stringify(cache, null, 2), "utf-8");
}

// Helper to hash content to compare versions easily
function computeContentHash(content: string): string {
  return crypto.createHash("sha256").update(content).digest("hex");
}

// Helper to sanitize filenames for GitHub repo
function sanitizeFilename(name: string, id: string): string {
  const safeName = name
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return safeName ? `${safeName}.json` : `workflow-${id}.json`;
}

// Clean n8n workflow for export (deterministic key ordering)
function formatWorkflowJson(workflow: any, formatting: "pretty" | "compact" = "pretty"): string {
  // We keep standard n8n fields
  const exportData = {
    name: workflow.name,
    nodes: workflow.nodes || [],
    connections: workflow.connections || {},
    active: !!workflow.active,
    settings: workflow.settings || {},
    versionId: workflow.versionId,
    id: workflow.id,
    tags: workflow.tags || [],
    pinData: workflow.pinData || {},
  };
  return formatting === "pretty"
    ? JSON.stringify(exportData, null, 2) + "\n"
    : JSON.stringify(exportData);
}

// --- n8n API Client ---
async function fetchN8nWorkflows(n8nUrl: string, apiKey: string) {
  const cleanUrl = n8nUrl.replace(/\/+$/, "");
  const endpoint = `${cleanUrl}/api/v1/workflows?limit=250`;
  const response = await fetch(endpoint, {
    headers: {
      "X-N8N-API-KEY": apiKey,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`n8n API responded with ${response.status} ${response.statusText}: ${errorText}`);
  }

  const data = await response.json();
  // n8n returns { data: [...] } in v1
  return Array.isArray(data) ? data : data.data || [];
}

async function fetchN8nWorkflowDetail(n8nUrl: string, apiKey: string, id: string) {
  const cleanUrl = n8nUrl.replace(/\/+$/, "");
  const endpoint = `${cleanUrl}/api/v1/workflows/${id}`;
  const response = await fetch(endpoint, {
    headers: {
      "X-N8N-API-KEY": apiKey,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`Failed to fetch workflow ${id}: ${response.status} ${response.statusText} ${errorText}`);
  }

  return await response.json();
}

// --- GitHub API Client ---
async function getGitHubFileInfo(
  token: string,
  repo: string,
  branch: string,
  filePath: string
): Promise<{ exists: boolean; sha?: string; content?: string }> {
  const cleanRepo = repo.trim().replace(/^https?:\/\/github\.com\//, "").replace(/\/+$/, "");
  const cleanPath = filePath.replace(/^\/+/, "");
  const url = `https://api.github.com/repos/${cleanRepo}/contents/${cleanPath}?ref=${encodeURIComponent(branch)}`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "n8n-github-sync-applet",
    },
  });

  if (res.status === 404) {
    return { exists: false };
  }

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`GitHub check error (${res.status}): ${err}`);
  }

  const json = await res.json();
  let decodedContent = "";
  if (json.content && json.encoding === "base64") {
    decodedContent = Buffer.from(json.content, "base64").toString("utf-8");
  }
  return {
    exists: true,
    sha: json.sha,
    content: decodedContent,
  };
}

async function putGitHubFile(
  token: string,
  repo: string,
  branch: string,
  filePath: string,
  contentStr: string,
  commitMessage: string,
  existingSha?: string,
  author?: { name: string; email: string }
): Promise<{ commitSha: string; commitUrl: string }> {
  const cleanRepo = repo.trim().replace(/^https?:\/\/github\.com\//, "").replace(/\/+$/, "");
  const cleanPath = filePath.replace(/^\/+/, "");
  const url = `https://api.github.com/repos/${cleanRepo}/contents/${cleanPath}`;

  const body: any = {
    message: commitMessage,
    content: Buffer.from(contentStr).toString("base64"),
    branch: branch,
  };

  if (existingSha) {
    body.sha = existingSha;
  }

  if (author && author.name && author.email) {
    body.committer = {
      name: author.name,
      email: author.email,
    };
    body.author = {
      name: author.name,
      email: author.email,
    };
  }

  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github.v3+json",
      "Content-Type": "application/json",
      "User-Agent": "n8n-github-sync-applet",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`GitHub commit failed (${res.status}): ${err}`);
  }

  const data = await res.json();
  const commitSha = data.commit?.sha || "";
  const commitUrl = data.commit?.html_url || `https://github.com/${cleanRepo}/commit/${commitSha}`;
  return { commitSha, commitUrl };
}

// --- Sync Engine ---
let isSyncing = false;

async function executeSync(
  trigger: "manual" | "polling" | "webhook",
  specificWorkflowId?: string
): Promise<SyncLogEntry> {
  if (isSyncing) {
    return {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      trigger,
      status: "no_changes",
      message: "Sync already in progress, skipped duplicate run.",
      syncedCount: 0,
      totalWorkflows: 0,
    };
  }

  isSyncing = true;
  const config = readConfig();
  const cache = readWorkflowCache();

  if (!config.n8nUrl || !config.n8nApiKey) {
    isSyncing = false;
    const entry: SyncLogEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      trigger,
      status: "error",
      message: "n8n Instance URL or API Key is missing in settings.",
      syncedCount: 0,
      totalWorkflows: 0,
    };
    appendHistory(entry);
    return entry;
  }

  if (!config.githubToken || !config.githubRepo) {
    isSyncing = false;
    const entry: SyncLogEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      trigger,
      status: "error",
      message: "GitHub Token or Repository is missing in settings.",
      syncedCount: 0,
      totalWorkflows: 0,
    };
    appendHistory(entry);
    return entry;
  }

  const logEntry: SyncLogEntry = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    trigger,
    status: "no_changes",
    message: "Checking for workflow changes...",
    syncedCount: 0,
    totalWorkflows: 0,
    details: [],
  };

  try {
    let workflowsToProcess: any[] = [];

    if (specificWorkflowId) {
      const single = await fetchN8nWorkflowDetail(config.n8nUrl, config.n8nApiKey, specificWorkflowId);
      workflowsToProcess = [single];
    } else {
      workflowsToProcess = await fetchN8nWorkflows(config.n8nUrl, config.n8nApiKey);
    }

    logEntry.totalWorkflows = workflowsToProcess.length;
    let changesPushed = 0;

    for (const wf of workflowsToProcess) {
      try {
        // Ensure we have full nodes & connections
        let fullWf = wf;
        if (!wf.nodes || !wf.connections) {
          fullWf = await fetchN8nWorkflowDetail(config.n8nUrl, config.n8nApiKey, String(wf.id));
        }

        const formattedContent = formatWorkflowJson(fullWf, config.backupFormatting);
        const currentHash = computeContentHash(formattedContent);
        const prevCached = cache[String(wf.id)];

        const fileName = sanitizeFilename(fullWf.name || "workflow", String(wf.id));
        const repoPath = config.githubPath ? `${config.githubPath}/${fileName}` : fileName;

        // Check if content hash changed compared to what we last pushed, OR check GitHub file
        let shouldPush = false;
        let existingSha: string | undefined = prevCached?.githubSha;

        if (!prevCached || prevCached.hash !== currentHash) {
          // Verify with GitHub
          const gitFile = await getGitHubFileInfo(config.githubToken, config.githubRepo, config.githubBranch, repoPath);
          if (!gitFile.exists) {
            shouldPush = true;
            existingSha = undefined;
          } else {
            existingSha = gitFile.sha;
            const gitHash = computeContentHash(gitFile.content || "");
            if (gitHash !== currentHash) {
              shouldPush = true;
            }
          }
        }

        if (shouldPush) {
          const commitMsg = config.commitMessageTemplate
            .replace("{name}", fullWf.name || `Workflow ${wf.id}`)
            .replace("{id}", String(wf.id));

          const { commitSha, commitUrl } = await putGitHubFile(
            config.githubToken,
            config.githubRepo,
            config.githubBranch,
            repoPath,
            formattedContent,
            commitMsg,
            existingSha,
            {
              name: config.commitAuthorName,
              email: config.commitAuthorEmail,
            }
          );

          // Update cache
          cache[String(wf.id)] = {
            hash: currentHash,
            name: fullWf.name,
            updatedAt: fullWf.updatedAt || new Date().toISOString(),
            githubSha: existingSha,
            lastSyncedAt: new Date().toISOString(),
          };

          changesPushed++;
          logEntry.details?.push({
            workflowId: String(wf.id),
            workflowName: fullWf.name,
            action: prevCached ? "updated" : "added",
            commitSha,
            commitUrl,
          });
        } else {
          // Up-to-date
          logEntry.details?.push({
            workflowId: String(wf.id),
            workflowName: fullWf.name,
            action: "unchanged",
          });
        }
      } catch (err: any) {
        console.error(`Error syncing workflow ${wf.id}:`, err);
        logEntry.details?.push({
          workflowId: String(wf.id),
          workflowName: wf.name || "Unknown",
          action: "error",
          error: err.message || "Failed to sync",
        });
      }
    }

    writeWorkflowCache(cache);
    logEntry.syncedCount = changesPushed;

    if (changesPushed > 0) {
      logEntry.status = "success";
      logEntry.message = `Successfully synced ${changesPushed} modified workflow${changesPushed > 1 ? "s" : ""} to GitHub repository.`;
    } else {
      logEntry.status = "no_changes";
      logEntry.message = `All ${workflowsToProcess.length} workflows are up-to-date with GitHub.`;
    }
  } catch (err: any) {
    console.error("Sync execution error:", err);
    logEntry.status = "error";
    logEntry.message = `Sync failed: ${err.message || "Unknown error"}`;
  } finally {
    isSyncing = false;
    appendHistory(logEntry);
  }

  return logEntry;
}

// Background Polling Timer setup
let pollingTimer: NodeJS.Timeout | null = null;

function resetPollingDaemon() {
  if (pollingTimer) {
    clearInterval(pollingTimer);
    pollingTimer = null;
  }
  const config = readConfig();
  if (config.pollingEnabled && config.pollingIntervalMinutes > 0 && config.n8nUrl && config.githubRepo) {
    const intervalMs = Math.max(1, config.pollingIntervalMinutes) * 60 * 1000;
    console.log(`[Polling Daemon] Active: checking for n8n changes every ${config.pollingIntervalMinutes} minutes.`);
    pollingTimer = setInterval(async () => {
      console.log(`[Polling Daemon] Running scheduled check for workflow changes...`);
      try {
        await executeSync("polling");
      } catch (err) {
        console.error("[Polling Daemon] Error in automated sync:", err);
      }
    }, intervalMs);
  } else {
    console.log(`[Polling Daemon] Inactive (Disabled or credentials not configured).`);
  }
}

// Initialize background polling on startup
setTimeout(() => {
  resetPollingDaemon();
}, 2000);

// --- API Routes ---

// Get current configuration (masking secret keys for safety)
app.get("/api/config", (req, res) => {
  const config = readConfig();
  const maskedConfig = {
    ...config,
    n8nApiKeyMasked: config.n8nApiKey ? `${config.n8nApiKey.slice(0, 4)}••••${config.n8nApiKey.slice(-4)}` : "",
    githubTokenMasked: config.githubToken ? `${config.githubToken.slice(0, 4)}••••${config.githubToken.slice(-4)}` : "",
    isN8nConfigured: !!(config.n8nUrl && config.n8nApiKey),
    isGithubConfigured: !!(config.githubToken && config.githubRepo),
    webhookUrl: `${process.env.APP_URL || req.protocol + "://" + req.get("host")}/api/webhooks/n8n`,
  };
  res.json(maskedConfig);
});

// Update configuration
app.post("/api/config", (req, res) => {
  const current = readConfig();
  const incoming = req.body || {};

  const updated: AppConfig = {
    ...current,
    n8nUrl: incoming.n8nUrl !== undefined ? incoming.n8nUrl.trim() : current.n8nUrl,
    n8nApiKey: incoming.n8nApiKey !== undefined && incoming.n8nApiKey !== "" ? incoming.n8nApiKey.trim() : current.n8nApiKey,
    githubToken: incoming.githubToken !== undefined && incoming.githubToken !== "" ? incoming.githubToken.trim() : current.githubToken,
    githubRepo: incoming.githubRepo !== undefined ? incoming.githubRepo.trim() : current.githubRepo,
    githubBranch: incoming.githubBranch !== undefined ? incoming.githubBranch.trim() : current.githubBranch,
    githubPath: incoming.githubPath !== undefined ? incoming.githubPath.trim() : current.githubPath,
    commitAuthorName: incoming.commitAuthorName !== undefined ? incoming.commitAuthorName.trim() : current.commitAuthorName,
    commitAuthorEmail: incoming.commitAuthorEmail !== undefined ? incoming.commitAuthorEmail.trim() : current.commitAuthorEmail,
    commitMessageTemplate: incoming.commitMessageTemplate !== undefined ? incoming.commitMessageTemplate : current.commitMessageTemplate,
    pollingEnabled: incoming.pollingEnabled !== undefined ? Boolean(incoming.pollingEnabled) : current.pollingEnabled,
    pollingIntervalMinutes: Number(incoming.pollingIntervalMinutes) || current.pollingIntervalMinutes,
    webhookSecret: incoming.webhookSecret !== undefined ? incoming.webhookSecret.trim() : current.webhookSecret,
    backupFormatting: incoming.backupFormatting === "compact" ? "compact" : "pretty",
    deleteDeletedWorkflows: Boolean(incoming.deleteDeletedWorkflows),
  };

  writeConfig(updated);
  resetPollingDaemon();
  res.json({ success: true, message: "Configuration saved successfully." });
});

// Test n8n connection
app.post("/api/test/n8n", async (req, res) => {
  const config = readConfig();
  const url = req.body?.n8nUrl || config.n8nUrl;
  const apiKey = req.body?.n8nApiKey || config.n8nApiKey;

  if (!url || !apiKey) {
    return res.status(400).json({ success: false, error: "Please provide both n8n URL and API Key." });
  }

  try {
    const workflows = await fetchN8nWorkflows(url, apiKey);
    return res.json({
      success: true,
      count: workflows.length,
      message: `Connected successfully! Found ${workflows.length} workflow(s).`,
      sampleWorkflows: workflows.slice(0, 3).map((w: any) => ({ id: w.id, name: w.name, active: w.active })),
    });
  } catch (err: any) {
    return res.status(400).json({
      success: false,
      error: err.message || "Failed to connect to n8n instance.",
    });
  }
});

// Test GitHub connection
app.post("/api/test/github", async (req, res) => {
  const config = readConfig();
  const token = req.body?.githubToken || config.githubToken;
  const repo = req.body?.githubRepo || config.githubRepo;
  const branch = req.body?.githubBranch || config.githubBranch || "main";

  if (!token || !repo) {
    return res.status(400).json({ success: false, error: "Please provide both GitHub Token and Repository (owner/repo)." });
  }

  const cleanRepo = repo.trim().replace(/^https?:\/\/github\.com\//, "").replace(/\/+$/, "");

  try {
    // Check repository exists and token has access
    const repoRes = await fetch(`https://api.github.com/repos/${cleanRepo}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "n8n-github-sync-applet",
      },
    });

    if (!repoRes.ok) {
      const err = await repoRes.text().catch(() => "");
      return res.status(repoRes.status).json({
        success: false,
        error: `GitHub repository check failed (${repoRes.status}): ${err}`,
      });
    }

    const repoData = await repoRes.json();

    // Check branch
    const branchRes = await fetch(`https://api.github.com/repos/${cleanRepo}/branches/${encodeURIComponent(branch)}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "n8n-github-sync-applet",
      },
    });

    return res.json({
      success: true,
      repoName: repoData.full_name,
      isPrivate: repoData.private,
      permissions: repoData.permissions,
      defaultBranch: repoData.default_branch,
      targetBranchExists: branchRes.ok,
      message: `Connected to GitHub! Repository: ${repoData.full_name} (${repoData.private ? "Private" : "Public"}).`,
    });
  } catch (err: any) {
    return res.status(400).json({
      success: false,
      error: err.message || "Failed to connect to GitHub repository.",
    });
  }
});

// List workflows from n8n combined with sync status
app.get("/api/workflows", async (req, res) => {
  const config = readConfig();
  const cache = readWorkflowCache();

  if (!config.n8nUrl || !config.n8nApiKey) {
    return res.json({
      configured: false,
      workflows: [],
      message: "Please configure your n8n URL and API Key first.",
    });
  }

  try {
    const list = await fetchN8nWorkflows(config.n8nUrl, config.n8nApiKey);
    const enriched = list.map((w: any) => {
      const cached = cache[String(w.id)];
      const lastSyncedAt = cached?.lastSyncedAt || null;
      const isUpToDate = cached && cached.updatedAt === w.updatedAt;

      return {
        id: String(w.id),
        name: w.name || "Untitled Workflow",
        active: !!w.active,
        tags: w.tags || [],
        updatedAt: w.updatedAt || w.createdAt || "",
        createdAt: w.createdAt || "",
        nodeCount: Array.isArray(w.nodes) ? w.nodes.length : 0,
        syncStatus: !cached ? "never_synced" : isUpToDate ? "synced" : "modified",
        lastSyncedAt,
        fileName: sanitizeFilename(w.name || "workflow", String(w.id)),
      };
    });

    return res.json({
      configured: true,
      workflows: enriched,
    });
  } catch (err: any) {
    return res.status(500).json({
      configured: true,
      error: err.message || "Failed to fetch workflows from n8n.",
      workflows: [],
    });
  }
});

// Trigger full sync manually
app.post("/api/sync/all", async (req, res) => {
  const result = await executeSync("manual");
  res.json(result);
});

// Trigger sync for a specific workflow
app.post("/api/sync/workflow/:id", async (req, res) => {
  const result = await executeSync("manual", req.params.id);
  res.json(result);
});

// Get Diff between n8n workflow and GitHub repository version
app.get("/api/diff/:id", async (req, res) => {
  const config = readConfig();
  const id = req.params.id;

  if (!config.n8nUrl || !config.n8nApiKey || !config.githubToken || !config.githubRepo) {
    return res.status(400).json({ error: "n8n or GitHub connection not fully configured." });
  }

  try {
    const fullWf = await fetchN8nWorkflowDetail(config.n8nUrl, config.n8nApiKey, id);
    const n8nFormatted = formatWorkflowJson(fullWf, config.backupFormatting);

    const fileName = sanitizeFilename(fullWf.name || "workflow", id);
    const repoPath = config.githubPath ? `${config.githubPath}/${fileName}` : fileName;

    const gitFile = await getGitHubFileInfo(config.githubToken, config.githubRepo, config.githubBranch, repoPath);

    return res.json({
      workflowId: id,
      workflowName: fullWf.name,
      repoPath,
      existsOnGithub: gitFile.exists,
      githubContent: gitFile.content || null,
      n8nContent: n8nFormatted,
      isIdentical: gitFile.exists && computeContentHash(gitFile.content || "") === computeContentHash(n8nFormatted),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to generate diff." });
  }
});

// Get sync history logs
app.get("/api/history", (req, res) => {
  const history = readHistory();
  res.json({
    history,
    isSyncing,
  });
});

// Clear history logs
app.delete("/api/history", (req, res) => {
  fs.writeFileSync(HISTORY_FILE, JSON.stringify([], null, 2), "utf-8");
  res.json({ success: true });
});

// Webhook endpoint: n8n sends a POST request here whenever a workflow is created/updated/saved
app.post("/api/webhooks/n8n", async (req, res) => {
  const config = readConfig();
  const providedSecret = req.headers["x-webhook-secret"] || req.query.secret;

  if (config.webhookSecret && providedSecret !== config.webhookSecret) {
    console.warn("[Webhook] Rejected unauthorized request: invalid secret.");
    return res.status(401).json({ error: "Invalid webhook secret" });
  }

  console.log("[Webhook] Received event from n8n:", req.body ? Object.keys(req.body) : "empty");

  // n8n trigger can send:
  // 1) { workflowId: "123" }
  // 2) { event: "workflow.updated", data: { id: "123", ... } }
  // 3) Full workflow object directly { id: "123", name: "...", nodes: [...] }
  const body = req.body || {};
  let workflowIdToSync: string | undefined = undefined;

  if (typeof body.workflowId === "string" || typeof body.workflowId === "number") {
    workflowIdToSync = String(body.workflowId);
  } else if (body.data && (body.data.id || body.data.workflowId)) {
    workflowIdToSync = String(body.data.id || body.data.workflowId);
  } else if (body.id) {
    workflowIdToSync = String(body.id);
  }

  // Respond immediately so n8n doesn't timeout
  res.status(202).json({
    status: "accepted",
    message: workflowIdToSync
      ? `Queued sync for workflow ID ${workflowIdToSync}`
      : "Queued full workflows sync check",
  });

  // Execute sync in background
  setTimeout(async () => {
    try {
      console.log(`[Webhook] Executing background sync (target: ${workflowIdToSync || "all"})...`);
      await executeSync("webhook", workflowIdToSync);
    } catch (err) {
      console.error("[Webhook] Error executing sync:", err);
    }
  }, 100);
});

// Provide downloadable/copyable n8n workflow template to automate triggers in n8n
app.get("/api/n8n-template", (req, res) => {
  const config = readConfig();
  const appUrl = process.env.APP_URL || `${req.protocol}://${req.get("host")}`;
  const webhookUrl = `${appUrl}/api/webhooks/n8n`;

  const template = {
    name: "Auto-Push to GitHub Trigger",
    nodes: [
      {
        parameters: {
          events: ["workflow.saved"],
        },
        id: "1c2e4d5f-1111-4a2b-8c1d-111111111111",
        name: "n8n Trigger on Workflow Saved",
        type: "n8n-nodes-base.n8nTrigger",
        typeVersion: 1,
        position: [240, 300],
      },
      {
        parameters: {
          method: "POST",
          url: webhookUrl,
          sendHeaders: true,
          headerParameters: {
            parameters: [
              {
                name: "X-Webhook-Secret",
                value: config.webhookSecret,
              },
              {
                name: "Content-Type",
                value: "application/json",
              },
            ],
          },
          sendBody: true,
          bodyParameters: {
            parameters: [
              {
                name: "workflowId",
                value: "={{ $json.id || $json.workflowId }}",
              },
              {
                name: "workflowName",
                value: "={{ $json.name }}",
              },
            ],
          },
          options: {},
        },
        id: "2b3c4d5e-2222-4b3c-9d2e-222222222222",
        name: "Notify GitHub Sync App",
        type: "n8n-nodes-base.httpRequest",
        typeVersion: 4.2,
        position: [480, 300],
      },
    ],
    connections: {
      "n8n Trigger on Workflow Saved": {
        main: [
          [
            {
              node: "Notify GitHub Sync App",
              type: "main",
              index: 0,
            },
          ],
        ],
      },
    },
    active: true,
    settings: {
      executionOrder: "v1",
    },
  };

  res.setHeader("Content-Disposition", 'attachment; filename="n8n-github-sync-trigger.json"');
  res.setHeader("Content-Type", "application/json");
  res.send(JSON.stringify(template, null, 2));
});

// Start the server with Vite middleware in dev or static files in production
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`n8n GitHub Sync Server running on port ${PORT}`);
  });
}

startServer();
