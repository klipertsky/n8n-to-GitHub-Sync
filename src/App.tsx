/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from "react";
import { Header } from "./components/Header";
import { WorkflowsTab } from "./components/WorkflowsTab";
import { WebhookTab } from "./components/WebhookTab";
import { HistoryTab } from "./components/HistoryTab";
import { SettingsTab } from "./components/SettingsTab";
import { WorkflowDiffModal } from "./components/WorkflowDiffModal";
import { AppConfig, SyncLogEntry, WorkflowItem } from "./types";
import { api } from "./services/api";
import { CheckCircle2, AlertTriangle, X } from "lucide-react";

export default function App() {
  const [activeTab, setActiveTab] = useState<"workflows" | "webhook" | "history" | "settings">("workflows");
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [workflows, setWorkflows] = useState<WorkflowItem[]>([]);
  const [history, setHistory] = useState<SyncLogEntry[]>([]);
  
  const [isLoadingWorkflows, setIsLoadingWorkflows] = useState(false);
  const [workflowsError, setWorkflowsError] = useState<string | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncingWorkflowId, setSyncingWorkflowId] = useState<string | null>(null);

  // Diff Modal State
  const [diffWorkflowId, setDiffWorkflowId] = useState<string | null>(null);
  const [diffWorkflowName, setDiffWorkflowName] = useState<string>("");

  // Notification Toast
  const [toast, setToast] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);

  const showToast = (type: "success" | "error" | "info", message: string) => {
    setToast({ type, message });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 4500);
  };

  // Load configuration
  const loadConfig = useCallback(async () => {
    try {
      const cfg = await api.getConfig();
      setConfig(cfg);
    } catch (err) {
      console.error("Failed to load config:", err);
    }
  }, []);

  // Load workflows
  const loadWorkflows = useCallback(async () => {
    setIsLoadingWorkflows(true);
    setWorkflowsError(null);
    try {
      const data = await api.getWorkflows();
      setWorkflows(data.workflows || []);
      if (data.error) {
        setWorkflowsError(data.error);
      }
    } catch (err: any) {
      setWorkflowsError(err.message || "Failed to load workflows");
    } finally {
      setIsLoadingWorkflows(false);
    }
  }, []);

  // Load history
  const loadHistory = useCallback(async () => {
    setIsLoadingHistory(true);
    try {
      const data = await api.getHistory();
      setHistory(data.history || []);
      if (data.isSyncing) {
        setIsSyncing(true);
      }
    } catch (err) {
      console.error("Failed to load history:", err);
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadConfig();
    loadWorkflows();
    loadHistory();
  }, [loadConfig, loadWorkflows, loadHistory]);

  // Periodic polling for status and logs
  useEffect(() => {
    const interval = setInterval(() => {
      loadHistory();
      if (config?.isN8nConfigured) {
        api.getWorkflows().then((res) => {
          if (res.workflows) setWorkflows(res.workflows);
        }).catch(() => {});
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [config?.isN8nConfigured, loadHistory]);

  // Sync all workflows
  const handleSyncAll = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      const res = await api.syncAll();
      if (res.status === "success") {
        showToast("success", res.message);
      } else if (res.status === "no_changes") {
        showToast("info", res.message);
      } else {
        showToast("error", res.message);
      }
      await loadWorkflows();
      await loadHistory();
    } catch (err: any) {
      showToast("error", err.message || "Sync failed");
    } finally {
      setIsSyncing(false);
    }
  };

  // Sync single workflow
  const handleSyncSingle = async (id: string) => {
    setSyncingWorkflowId(id);
    try {
      const res = await api.syncWorkflow(id);
      if (res.status === "success") {
        showToast("success", res.message);
      } else if (res.status === "no_changes") {
        showToast("info", "Workflow is already up-to-date with GitHub.");
      } else {
        showToast("error", res.message);
      }
      await loadWorkflows();
      await loadHistory();
    } catch (err: any) {
      showToast("error", err.message || "Failed to push workflow");
    } finally {
      setSyncingWorkflowId(null);
    }
  };

  // Save updated configuration
  const handleSaveConfig = async (partial: Partial<AppConfig>) => {
    await api.updateConfig(partial);
    await loadConfig();
    await loadWorkflows();
    showToast("success", "Settings updated and saved.");
  };

  // Clear history
  const handleClearHistory = async () => {
    await api.clearHistory();
    setHistory([]);
    showToast("info", "Sync history cleared.");
  };

  return (
    <div className="min-h-screen bg-neutral-100/60 text-neutral-900 flex flex-col font-sans selection:bg-amber-100 selection:text-amber-900">
      {/* Navigation Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        config={config}
        isSyncing={isSyncing}
        onSyncAll={handleSyncAll}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === "workflows" && (
          <WorkflowsTab
            workflows={workflows}
            isLoading={isLoadingWorkflows}
            error={workflowsError}
            config={config}
            onRefresh={loadWorkflows}
            onSyncSingle={handleSyncSingle}
            onOpenDiff={(id, name) => {
              setDiffWorkflowId(id);
              setDiffWorkflowName(name);
            }}
            onOpenSettings={() => setActiveTab("settings")}
            syncingWorkflowId={syncingWorkflowId}
          />
        )}

        {activeTab === "webhook" && (
          <WebhookTab
            config={config}
            onUpdateConfig={handleSaveConfig}
          />
        )}

        {activeTab === "history" && (
          <HistoryTab
            history={history}
            isLoading={isLoadingHistory}
            onRefresh={loadHistory}
            onClearHistory={handleClearHistory}
            githubRepo={config?.githubRepo}
          />
        )}

        {activeTab === "settings" && (
          <SettingsTab
            config={config}
            onSaveConfig={handleSaveConfig}
          />
        )}
      </main>

      {/* Workflow Diff Modal */}
      {diffWorkflowId && (
        <WorkflowDiffModal
          workflowId={diffWorkflowId}
          workflowName={diffWorkflowName}
          onClose={() => setDiffWorkflowId(null)}
          onSync={handleSyncSingle}
          isSyncing={syncingWorkflowId === diffWorkflowId}
        />
      )}

      {/* Floating Toast Notification */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div
            className={`flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg border text-xs font-medium max-w-md ${
              toast.type === "success"
                ? "bg-neutral-900 text-white border-neutral-800"
                : toast.type === "error"
                ? "bg-rose-900 text-white border-rose-800"
                : "bg-neutral-900 text-white border-neutral-800"
            }`}
          >
            {toast.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : toast.type === "error" ? (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
            )}
            <span className="flex-1">{toast.message}</span>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="text-neutral-400 hover:text-white p-0.5 rounded cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
