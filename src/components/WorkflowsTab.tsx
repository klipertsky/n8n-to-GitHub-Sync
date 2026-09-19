import React, { useState, useMemo } from "react";
import { 
  Workflow, 
  Search, 
  Filter, 
  GitPullRequest, 
  CheckCircle2, 
  AlertTriangle, 
  FileCode2, 
  ArrowUpRight, 
  RefreshCw, 
  ExternalLink,
  Layers,
  Clock,
  Sparkles,
  Settings as SettingsIcon,
  HelpCircle,
  Tag
} from "lucide-react";
import { AppConfig, WorkflowItem } from "../types";

interface WorkflowsTabProps {
  workflows: WorkflowItem[];
  isLoading: boolean;
  error: string | null;
  config: AppConfig | null;
  onRefresh: () => void;
  onSyncSingle: (id: string) => Promise<void>;
  onOpenDiff: (id: string, name: string) => void;
  onOpenSettings: () => void;
  syncingWorkflowId: string | null;
}

export const WorkflowsTab: React.FC<WorkflowsTabProps> = ({
  workflows,
  isLoading,
  error,
  config,
  onRefresh,
  onSyncSingle,
  onOpenDiff,
  onOpenSettings,
  syncingWorkflowId,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "modified" | "synced" | "never_synced" | "active">("all");
  const [sortBy, setSortBy] = useState<"updatedAt" | "name" | "nodeCount">("updatedAt");

  const isConfigured = config?.isN8nConfigured && config?.isGithubConfigured;

  // Filter & Sort
  const filteredWorkflows = useMemo(() => {
    return workflows
      .filter((wf) => {
        const matchesSearch =
          wf.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          wf.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (Array.isArray(wf.tags) && wf.tags.some(t => 
            typeof t === "string" 
              ? t.toLowerCase().includes(searchQuery.toLowerCase())
              : t.name?.toLowerCase().includes(searchQuery.toLowerCase())
          ));

        if (!matchesSearch) return false;

        if (filterStatus === "active") return wf.active;
        if (filterStatus === "modified") return wf.syncStatus === "modified";
        if (filterStatus === "synced") return wf.syncStatus === "synced";
        if (filterStatus === "never_synced") return wf.syncStatus === "never_synced";
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "name") {
          return a.name.localeCompare(b.name);
        }
        if (sortBy === "nodeCount") {
          return b.nodeCount - a.nodeCount;
        }
        // updatedAt default
        return new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime();
      });
  }, [workflows, searchQuery, filterStatus, sortBy]);

  // Statistics
  const stats = useMemo(() => {
    const total = workflows.length;
    const modified = workflows.filter((w) => w.syncStatus === "modified").length;
    const synced = workflows.filter((w) => w.syncStatus === "synced").length;
    const neverSynced = workflows.filter((w) => w.syncStatus === "never_synced").length;
    const active = workflows.filter((w) => w.active).length;
    return { total, modified, synced, neverSynced, active };
  }, [workflows]);

  const formatTimeAgo = (dateStr: string) => {
    if (!dateStr) return "Never";
    const date = new Date(dateStr);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSec < 60) return "Just now";
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      {/* Metric Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-neutral-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-500">Total Workflows</span>
            <Workflow className="w-4 h-4 text-neutral-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-neutral-900">{stats.total}</span>
            <span className="text-xs text-neutral-500">({stats.active} active)</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-neutral-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-500">Synced to GitHub</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-emerald-600">{stats.synced}</span>
            <span className="text-xs text-neutral-500">up to date</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-neutral-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-500">Changes Pending</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-amber-600">{stats.modified}</span>
            <span className="text-xs text-amber-700 font-medium">
              {stats.modified > 0 ? "needs push" : "clean"}
            </span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-neutral-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-500">Not Yet Synced</span>
            <GitPullRequest className="w-4 h-4 text-neutral-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-neutral-700">{stats.neverSynced}</span>
            <span className="text-xs text-neutral-500">new workflows</span>
          </div>
        </div>
      </div>

      {/* Setup Prompt Warning if missing configuration */}
      {!isConfigured && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-amber-900">Connections Required</h4>
              <p className="text-xs text-amber-700 mt-0.5">
                {!config?.isN8nConfigured && !config?.isGithubConfigured
                  ? "Configure both your n8n Instance URL/API Key and GitHub Token/Repository to fetch and automatically push workflows."
                  : !config?.isN8nConfigured
                  ? "Configure your n8n Instance URL and API Key in Settings to fetch your workflows."
                  : "Configure your GitHub Token and Target Repository in Settings to push workflows."}
              </p>
            </div>
          </div>
          <button
            id="prompt-open-settings"
            type="button"
            onClick={onOpenSettings}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium bg-amber-600 hover:bg-amber-700 text-white rounded-lg shadow-xs transition-colors shrink-0 cursor-pointer"
          >
            <SettingsIcon className="w-3.5 h-3.5" />
            <span>Configure Credentials</span>
          </button>
        </div>
      )}

      {/* Error Banner if API failed */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-center justify-between gap-3 text-rose-800 text-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={onRefresh}
            className="text-rose-700 hover:text-rose-900 underline font-medium cursor-pointer"
          >
            Try again
          </button>
        </div>
      )}

      {/* Toolbar: Search, Filters, Sort, Refresh */}
      <div className="bg-white p-4 rounded-xl border border-neutral-200/80 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            id="workflow-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search workflows by name, ID, or tag..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-neutral-900 focus:bg-white transition-all text-neutral-900 placeholder:text-neutral-400"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {(
            [
              { id: "all", label: "All" },
              { id: "modified", label: "Changed" },
              { id: "synced", label: "Synced" },
              { id: "never_synced", label: "Never Synced" },
              { id: "active", label: "Active" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              id={`filter-${tab.id}`}
              type="button"
              onClick={() => setFilterStatus(tab.id)}
              className={`px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                filterStatus === tab.id
                  ? "bg-neutral-900 text-white"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Sort & Refresh */}
        <div className="flex items-center gap-2">
          <select
            id="sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="text-xs bg-neutral-50 border border-neutral-200 text-neutral-700 py-1.5 px-2.5 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-neutral-900 cursor-pointer"
          >
            <option value="updatedAt">Sort: Recent Update</option>
            <option value="name">Sort: Name (A-Z)</option>
            <option value="nodeCount">Sort: Most Nodes</option>
          </select>

          <button
            id="refresh-workflows-button"
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
            className="p-2 rounded-lg border border-neutral-200 bg-neutral-50 hover:bg-neutral-100 text-neutral-600 hover:text-neutral-900 transition-colors cursor-pointer disabled:opacity-50"
            title="Refresh workflows from n8n"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Workflows List */}
      {isLoading && workflows.length === 0 ? (
        <div className="bg-white rounded-xl border border-neutral-200 p-12 text-center">
          <RefreshCw className="w-8 h-8 text-neutral-400 animate-spin mx-auto mb-3" />
          <p className="text-sm font-medium text-neutral-700">Fetching workflows from your n8n instance...</p>
          <p className="text-xs text-neutral-400 mt-1">Checking workflow versions and nodes</p>
        </div>
      ) : filteredWorkflows.length === 0 ? (
        <div className="bg-white rounded-xl border border-neutral-200 p-12 text-center">
          <Workflow className="w-10 h-10 text-neutral-300 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-neutral-800">No Workflows Found</h3>
          <p className="text-xs text-neutral-500 max-w-sm mx-auto mt-1">
            {searchQuery
              ? `No workflows match your search "${searchQuery}".`
              : !isConfigured
              ? "Connect your n8n instance in Settings to begin syncing."
              : "No workflows detected in this n8n instance."}
          </p>
          {!isConfigured && (
            <button
              type="button"
              onClick={onOpenSettings}
              className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 cursor-pointer"
            >
              Open Settings
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredWorkflows.map((wf) => {
            const isPushing = syncingWorkflowId === wf.id;
            const gitRepo = config?.githubRepo;
            const gitBranch = config?.githubBranch || "main";
            const gitPath = config?.githubPath ? `${config.githubPath}/${wf.fileName}` : wf.fileName;
            const gitFileUrl = gitRepo ? `https://github.com/${gitRepo}/blob/${gitBranch}/${gitPath}` : null;

            return (
              <div
                key={wf.id}
                id={`workflow-card-${wf.id}`}
                className="bg-white rounded-xl border border-neutral-200/80 p-5 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between"
              >
                <div>
                  {/* Card Header: Title & Status */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 ${
                            wf.active ? "bg-emerald-500" : "bg-neutral-300"
                          }`}
                          title={wf.active ? "Workflow is Active in n8n" : "Workflow is Inactive"}
                        />
                        <h3 className="text-sm font-semibold text-neutral-900 truncate" title={wf.name}>
                          {wf.name}
                        </h3>
                      </div>
                      <p className="text-[11px] text-neutral-500 font-mono mt-0.5 truncate">
                        ID: {wf.id} • {gitPath}
                      </p>
                    </div>

                    {/* Sync Status Badge */}
                    <div className="shrink-0">
                      {wf.syncStatus === "synced" ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Synced</span>
                        </span>
                      ) : wf.syncStatus === "modified" ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                          <AlertTriangle className="w-3 h-3 text-amber-600" />
                          <span>Changed</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600 border border-neutral-200">
                          <span>Unsynced</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Metadata Row: Nodes, Time, Tags */}
                  <div className="mt-3 flex flex-wrap items-center gap-y-1 gap-x-3 text-xs text-neutral-500">
                    <span className="flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5 text-neutral-400" />
                      {wf.nodeCount} nodes
                    </span>

                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-neutral-400" />
                      Updated {formatTimeAgo(wf.updatedAt)}
                    </span>

                    {wf.lastSyncedAt && (
                      <span className="text-[11px] text-neutral-400">
                        (Pushed {formatTimeAgo(wf.lastSyncedAt)})
                      </span>
                    )}
                  </div>

                  {/* Tags */}
                  {Array.isArray(wf.tags) && wf.tags.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap gap-1">
                      {wf.tags.map((tag: any, idx: number) => {
                        const tagName = typeof tag === "string" ? tag : tag.name || "Tag";
                        return (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-0.5 text-[10px] px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-600 font-medium"
                          >
                            <Tag className="w-2.5 h-2.5 text-neutral-400" />
                            {tagName}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Card Actions Footer */}
                <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {/* Diff button */}
                    <button
                      id={`diff-btn-${wf.id}`}
                      type="button"
                      onClick={() => onOpenDiff(wf.id, wf.name)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-neutral-700 hover:text-neutral-900 bg-neutral-50 hover:bg-neutral-100 rounded-lg border border-neutral-200 transition-colors cursor-pointer"
                      title="Compare n8n workflow JSON with latest version in GitHub"
                    >
                      <FileCode2 className="w-3.5 h-3.5 text-neutral-500" />
                      <span>Compare Diff</span>
                    </button>

                    {/* View in GitHub */}
                    {gitFileUrl && wf.syncStatus !== "never_synced" && (
                      <a
                        href={gitFileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-2 py-1.5 text-xs text-neutral-500 hover:text-neutral-800 transition-colors"
                        title="Open file in GitHub"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span className="hidden sm:inline">GitHub</span>
                      </a>
                    )}
                  </div>

                  {/* Push Single Workflow Button */}
                  <button
                    id={`push-workflow-${wf.id}`}
                    type="button"
                    onClick={() => onSyncSingle(wf.id)}
                    disabled={isPushing || !isConfigured}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg shadow-2xs transition-colors cursor-pointer ${
                      wf.syncStatus === "modified"
                        ? "bg-amber-600 hover:bg-amber-700 text-white"
                        : "bg-neutral-900 hover:bg-neutral-800 text-white"
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                    title="Push this workflow to GitHub right now"
                  >
                    <RefreshCw className={`w-3 h-3 ${isPushing ? "animate-spin" : ""}`} />
                    <span>{isPushing ? "Pushing..." : wf.syncStatus === "modified" ? "Push Changes" : "Push"}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
