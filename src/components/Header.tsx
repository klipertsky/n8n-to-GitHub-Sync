import React from "react";
import { 
  GitBranch, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Workflow, 
  Webhook, 
  History, 
  Settings,
  Radio
} from "lucide-react";
import { AppConfig } from "../types";

interface HeaderProps {
  activeTab: "workflows" | "webhook" | "history" | "settings";
  setActiveTab: (tab: "workflows" | "webhook" | "history" | "settings") => void;
  config: AppConfig | null;
  isSyncing: boolean;
  onSyncAll: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  config,
  isSyncing,
  onSyncAll,
}) => {
  const isN8nReady = config?.isN8nConfigured;
  const isGithubReady = config?.isGithubConfigured;
  const isAutoPolling = config?.pollingEnabled && isN8nReady && isGithubReady;

  return (
    <header className="border-b border-neutral-200 bg-white sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-neutral-900 text-white shadow-xs">
              <Workflow className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-neutral-900 text-base tracking-tight">n8n → GitHub</span>
                <span className="text-xs px-2 py-0.5 font-medium rounded-full bg-neutral-100 text-neutral-700 border border-neutral-200">
                  Auto-Sync
                </span>
              </div>
              <p className="text-xs text-neutral-500 hidden sm:block">
                Continuous backup & version control for n8n workflows
              </p>
            </div>
          </div>

          {/* Status Chips */}
          <div className="hidden md:flex items-center gap-2 text-xs">
            {/* n8n Status */}
            <div 
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${
                isN8nReady 
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                  : "bg-amber-50 text-amber-700 border-amber-200"
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isN8nReady ? "bg-emerald-500" : "bg-amber-500"}`} />
              <span>n8n: {isN8nReady ? "Connected" : "Not configured"}</span>
            </div>

            {/* GitHub Status */}
            <div 
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${
                isGithubReady 
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                  : "bg-amber-50 text-amber-700 border-amber-200"
              }`}
            >
              <GitBranch className="w-3 h-3" />
              <span>
                {isGithubReady && config?.githubRepo 
                  ? config.githubRepo 
                  : "GitHub: Not configured"}
              </span>
            </div>

            {/* Polling Daemon Status */}
            {isAutoPolling && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                <Radio className="w-3 h-3 text-blue-600 animate-pulse" />
                <span>Auto-poll: {config?.pollingIntervalMinutes}m</span>
              </div>
            )}
          </div>

          {/* Right Action: Sync Now Button */}
          <div className="flex items-center gap-3">
            <button
              id="sync-all-button"
              type="button"
              onClick={onSyncAll}
              disabled={isSyncing || !isN8nReady || !isGithubReady}
              className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg shadow-xs transition-colors ${
                isSyncing || !isN8nReady || !isGithubReady
                  ? "bg-neutral-100 text-neutral-400 cursor-not-allowed border border-neutral-200"
                  : "bg-neutral-900 hover:bg-neutral-800 text-white cursor-pointer"
              }`}
              title={
                !isN8nReady || !isGithubReady
                  ? "Configure both n8n and GitHub credentials in Settings to sync"
                  : "Fetch all workflows and commit any modified or new ones to GitHub"
              }
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin text-amber-400" : ""}`} />
              <span>{isSyncing ? "Syncing..." : "Sync Changes"}</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-t border-neutral-100 -mb-px space-x-1 sm:space-x-4 overflow-x-auto">
          <button
            id="tab-workflows"
            type="button"
            onClick={() => setActiveTab("workflows")}
            className={`flex items-center gap-2 py-3 px-3 border-b-2 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === "workflows"
                ? "border-neutral-900 text-neutral-900"
                : "border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300"
            }`}
          >
            <Workflow className="w-4 h-4" />
            <span>Workflows</span>
          </button>

          <button
            id="tab-webhook"
            type="button"
            onClick={() => setActiveTab("webhook")}
            className={`flex items-center gap-2 py-3 px-3 border-b-2 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === "webhook"
                ? "border-neutral-900 text-neutral-900"
                : "border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300"
            }`}
          >
            <Webhook className="w-4 h-4" />
            <span>Auto-Sync & Webhook</span>
            <span className="bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0.2 rounded-full font-semibold">
              Live
            </span>
          </button>

          <button
            id="tab-history"
            type="button"
            onClick={() => setActiveTab("history")}
            className={`flex items-center gap-2 py-3 px-3 border-b-2 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === "history"
                ? "border-neutral-900 text-neutral-900"
                : "border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300"
            }`}
          >
            <History className="w-4 h-4" />
            <span>Sync History</span>
          </button>

          <button
            id="tab-settings"
            type="button"
            onClick={() => setActiveTab("settings")}
            className={`flex items-center gap-2 py-3 px-3 border-b-2 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === "settings"
                ? "border-neutral-900 text-neutral-900"
                : "border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300"
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Credentials & Settings</span>
            {(!isN8nReady || !isGithubReady) && (
              <span className="w-2 h-2 rounded-full bg-amber-500" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
