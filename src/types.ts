export type SyncStatus = "synced" | "modified" | "never_synced";

export interface WorkflowItem {
  id: string;
  name: string;
  active: boolean;
  tags: Array<{ id: string; name: string } | string>;
  updatedAt: string;
  createdAt: string;
  nodeCount: number;
  syncStatus: SyncStatus;
  lastSyncedAt: string | null;
  fileName: string;
}

export interface AppConfig {
  n8nUrl: string;
  n8nApiKey?: string;
  n8nApiKeyMasked?: string;
  githubToken?: string;
  githubTokenMasked?: string;
  githubRepo: string;
  githubBranch: string;
  githubPath: string;
  commitAuthorName: string;
  commitAuthorEmail: string;
  commitMessageTemplate: string;
  pollingEnabled: boolean;
  pollingIntervalMinutes: number;
  webhookSecret: string;
  backupFormatting: "pretty" | "compact";
  deleteDeletedWorkflows: boolean;
  isN8nConfigured: boolean;
  isGithubConfigured: boolean;
  webhookUrl: string;
}

export interface SyncLogDetail {
  workflowId: string;
  workflowName: string;
  action: "added" | "updated" | "deleted" | "unchanged" | "error";
  commitSha?: string;
  commitUrl?: string;
  error?: string;
}

export interface SyncLogEntry {
  id: string;
  timestamp: string;
  trigger: "manual" | "polling" | "webhook";
  status: "success" | "partial" | "no_changes" | "error";
  message: string;
  syncedCount: number;
  totalWorkflows: number;
  details?: SyncLogDetail[];
}

export interface DiffResult {
  workflowId: string;
  workflowName: string;
  repoPath: string;
  existsOnGithub: boolean;
  githubContent: string | null;
  n8nContent: string;
  isIdentical: boolean;
}

export interface TestResult {
  success: boolean;
  message?: string;
  error?: string;
  count?: number;
  repoName?: string;
  isPrivate?: boolean;
  targetBranchExists?: boolean;
}
