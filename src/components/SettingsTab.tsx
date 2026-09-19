import React, { useState, useEffect } from "react";
import { 
  Settings, 
  Workflow, 
  GitBranch, 
  KeyRound, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  Save, 
  ExternalLink,
  Info,
  Sliders,
  FolderGit2,
  FileJson
} from "lucide-react";
import { AppConfig, TestResult } from "../types";
import { api } from "../services/api";

interface SettingsTabProps {
  config: AppConfig | null;
  onSaveConfig: (updated: Partial<AppConfig>) => Promise<void>;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({ config, onSaveConfig }) => {
  const [formData, setFormData] = useState<Partial<AppConfig>>({});
  const [n8nApiKeyInput, setN8nApiKeyInput] = useState("");
  const [githubTokenInput, setGithubTokenInput] = useState("");

  const [testingN8n, setTestingN8n] = useState(false);
  const [n8nTestResult, setN8nTestResult] = useState<TestResult | null>(null);

  const [testingGithub, setTestingGithub] = useState(false);
  const [githubTestResult, setGithubTestResult] = useState<TestResult | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    if (config) {
      setFormData({
        n8nUrl: config.n8nUrl || "",
        githubRepo: config.githubRepo || "",
        githubBranch: config.githubBranch || "main",
        githubPath: config.githubPath || "workflows",
        commitAuthorName: config.commitAuthorName || "n8n Sync Bot",
        commitAuthorEmail: config.commitAuthorEmail || "n8n-sync@local.internal",
        commitMessageTemplate: config.commitMessageTemplate || "chore(n8n): sync {name} [auto-sync]",
        pollingEnabled: config.pollingEnabled ?? true,
        pollingIntervalMinutes: config.pollingIntervalMinutes || 5,
        backupFormatting: config.backupFormatting || "pretty",
      });
    }
  }, [config]);

  const handleTestN8n = async () => {
    setTestingN8n(true);
    setN8nTestResult(null);
    try {
      const url = formData.n8nUrl || config?.n8nUrl || "";
      const key = n8nApiKeyInput || ""; // if blank, backend uses saved key
      const res = await api.testN8n(url, key);
      setN8nTestResult(res);
    } catch (err: any) {
      setN8nTestResult({ success: false, error: err.message });
    } finally {
      setTestingN8n(false);
    }
  };

  const handleTestGithub = async () => {
    setTestingGithub(true);
    setGithubTestResult(null);
    try {
      const token = githubTokenInput || ""; // if blank, backend uses saved token
      const repo = formData.githubRepo || config?.githubRepo || "";
      const branch = formData.githubBranch || config?.githubBranch || "main";
      const res = await api.testGithub(token, repo, branch);
      setGithubTestResult(res);
    } catch (err: any) {
      setGithubTestResult({ success: false, error: err.message });
    } finally {
      setTestingGithub(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveMessage(null);

    const payload: Partial<AppConfig> = {
      ...formData,
    };

    if (n8nApiKeyInput.trim()) {
      payload.n8nApiKey = n8nApiKeyInput.trim();
    }
    if (githubTokenInput.trim()) {
      payload.githubToken = githubTokenInput.trim();
    }

    try {
      await onSaveConfig(payload);
      setSaveMessage("Settings saved successfully!");
      setN8nApiKeyInput("");
      setGithubTokenInput("");
      setTimeout(() => setSaveMessage(null), 4000);
    } catch (err: any) {
      setSaveMessage(`Failed to save: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-5xl mx-auto">
      {/* Top Banner with Save feedback */}
      {saveMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{saveMessage}</span>
        </div>
      )}

      {/* Section 1: n8n Instance Configuration */}
      <div className="bg-white rounded-xl border border-neutral-200/80 p-6 shadow-2xs">
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-neutral-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-700 border border-amber-200">
              <Workflow className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-neutral-900">n8n Instance Connection</h3>
              <p className="text-xs text-neutral-500">
                Connect your cloud-hosted or self-hosted n8n instance via the official Public API.
              </p>
            </div>
          </div>

          <button
            id="test-n8n-btn"
            type="button"
            onClick={handleTestN8n}
            disabled={testingN8n || !formData.n8nUrl}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:text-neutral-900 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${testingN8n ? "animate-spin" : ""}`} />
            <span>{testingN8n ? "Testing..." : "Test n8n Connection"}</span>
          </button>
        </div>

        {/* n8n Test Result Feedback */}
        {n8nTestResult && (
          <div
            className={`mt-4 p-3 rounded-lg text-xs flex items-start gap-2 border ${
              n8nTestResult.success
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-rose-50 border-rose-200 text-rose-800"
            }`}
          >
            {n8nTestResult.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            )}
            <div>
              <p className="font-semibold">{n8nTestResult.success ? "Connection Successful" : "Connection Failed"}</p>
              <p className="mt-0.5">{n8nTestResult.message || n8nTestResult.error}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5">
          {/* Instance URL */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-neutral-700">
              n8n Instance URL <span className="text-rose-500">*</span>
            </label>
            <input
              id="n8n-url-input"
              type="url"
              value={formData.n8nUrl || ""}
              onChange={(e) => setFormData({ ...formData, n8nUrl: e.target.value })}
              placeholder="https://your-n8n-instance.com"
              required
              className="w-full text-xs bg-neutral-50 border border-neutral-200 px-3 py-2 rounded-lg text-neutral-900 focus:outline-hidden focus:ring-2 focus:ring-neutral-900 focus:bg-white"
            />
            <p className="text-[11px] text-neutral-400">
              Example: https://n8n.example.com or http://localhost:5678
            </p>
          </div>

          {/* API Key */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-neutral-700">
                n8n Public API Key <span className="text-rose-500">*</span>
              </label>
              {config?.n8nApiKeyMasked && (
                <span className="text-[11px] text-emerald-600 font-mono">
                  Saved: {config.n8nApiKeyMasked}
                </span>
              )}
            </div>
            <input
              id="n8n-apikey-input"
              type="password"
              value={n8nApiKeyInput}
              onChange={(e) => setN8nApiKeyInput(e.target.value)}
              placeholder={config?.n8nApiKeyMasked ? "Leave blank to keep saved key" : "Paste n8n API Key (n8n_api_...)"}
              className="w-full text-xs bg-neutral-50 border border-neutral-200 px-3 py-2 rounded-lg text-neutral-900 focus:outline-hidden focus:ring-2 focus:ring-neutral-900 focus:bg-white font-mono"
            />
            <p className="text-[11px] text-neutral-400">
              Generate in n8n via: <strong>Settings → n8n API → Create an API key</strong>
            </p>
          </div>
        </div>
      </div>

      {/* Section 2: GitHub Repository Configuration */}
      <div className="bg-white rounded-xl border border-neutral-200/80 p-6 shadow-2xs">
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-neutral-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-neutral-100 text-neutral-800 border border-neutral-200">
              <GitBranch className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-neutral-900">GitHub Target Repository</h3>
              <p className="text-xs text-neutral-500">
                The repository, branch, and folder where your workflow JSON files are committed.
              </p>
            </div>
          </div>

          <button
            id="test-github-btn"
            type="button"
            onClick={handleTestGithub}
            disabled={testingGithub || !formData.githubRepo}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:text-neutral-900 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${testingGithub ? "animate-spin" : ""}`} />
            <span>{testingGithub ? "Testing..." : "Test GitHub Connection"}</span>
          </button>
        </div>

        {/* GitHub Test Result Feedback */}
        {githubTestResult && (
          <div
            className={`mt-4 p-3 rounded-lg text-xs flex items-start gap-2 border ${
              githubTestResult.success
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-rose-50 border-rose-200 text-rose-800"
            }`}
          >
            {githubTestResult.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            )}
            <div>
              <p className="font-semibold">{githubTestResult.success ? "GitHub Connected" : "GitHub Connection Failed"}</p>
              <p className="mt-0.5">{githubTestResult.message || githubTestResult.error}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5">
          {/* GitHub Token */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-neutral-700">
                GitHub Personal Access Token (PAT) <span className="text-rose-500">*</span>
              </label>
              {config?.githubTokenMasked && (
                <span className="text-[11px] text-emerald-600 font-mono">
                  Saved: {config.githubTokenMasked}
                </span>
              )}
            </div>
            <input
              id="github-token-input"
              type="password"
              value={githubTokenInput}
              onChange={(e) => setGithubTokenInput(e.target.value)}
              placeholder={config?.githubTokenMasked ? "Leave blank to keep saved token" : "ghp_..."}
              className="w-full text-xs bg-neutral-50 border border-neutral-200 px-3 py-2 rounded-lg text-neutral-900 focus:outline-hidden focus:ring-2 focus:ring-neutral-900 focus:bg-white font-mono"
            />
            <p className="text-[11px] text-neutral-400">
              Needs <code>repo</code> scope (classic) or <code>Contents: Read and write</code> (fine-grained).
            </p>
          </div>

          {/* GitHub Repo */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-neutral-700">
              Repository (owner/repo) <span className="text-rose-500">*</span>
            </label>
            <input
              id="github-repo-input"
              type="text"
              value={formData.githubRepo || ""}
              onChange={(e) => setFormData({ ...formData, githubRepo: e.target.value })}
              placeholder="e.g. your-username/n8n-workflows-backup"
              required
              className="w-full text-xs bg-neutral-50 border border-neutral-200 px-3 py-2 rounded-lg text-neutral-900 focus:outline-hidden focus:ring-2 focus:ring-neutral-900 focus:bg-white font-mono"
            />
            <p className="text-[11px] text-neutral-400">
              Target repository name where files are pushed.
            </p>
          </div>

          {/* Branch */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-neutral-700">Target Branch</label>
            <input
              id="github-branch-input"
              type="text"
              value={formData.githubBranch || "main"}
              onChange={(e) => setFormData({ ...formData, githubBranch: e.target.value })}
              placeholder="main"
              className="w-full text-xs bg-neutral-50 border border-neutral-200 px-3 py-2 rounded-lg text-neutral-900 focus:outline-hidden focus:ring-2 focus:ring-neutral-900 focus:bg-white font-mono"
            />
          </div>

          {/* Workflows Folder */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-neutral-700">Workflows Directory Path</label>
            <input
              id="github-path-input"
              type="text"
              value={formData.githubPath || "workflows"}
              onChange={(e) => setFormData({ ...formData, githubPath: e.target.value })}
              placeholder="workflows"
              className="w-full text-xs bg-neutral-50 border border-neutral-200 px-3 py-2 rounded-lg text-neutral-900 focus:outline-hidden focus:ring-2 focus:ring-neutral-900 focus:bg-white font-mono"
            />
            <p className="text-[11px] text-neutral-400">
              Leave blank for root or specify subfolder (e.g. <code>workflows</code>)
            </p>
          </div>
        </div>
      </div>

      {/* Section 3: Commit & Format Settings */}
      <div className="bg-white rounded-xl border border-neutral-200/80 p-6 shadow-2xs">
        <div className="pb-4 border-b border-neutral-100 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-50 text-blue-700 border border-blue-200">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-neutral-900">Git Commit & Export Format</h3>
            <p className="text-xs text-neutral-500">
              Customize author signatures, commit templates, and file readability.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-5">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-neutral-700">Author Name</label>
            <input
              type="text"
              value={formData.commitAuthorName || "n8n Sync Bot"}
              onChange={(e) => setFormData({ ...formData, commitAuthorName: e.target.value })}
              className="w-full text-xs bg-neutral-50 border border-neutral-200 px-3 py-2 rounded-lg text-neutral-900 focus:outline-hidden focus:ring-2 focus:ring-neutral-900 focus:bg-white"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-neutral-700">Author Email</label>
            <input
              type="email"
              value={formData.commitAuthorEmail || "n8n-sync@local.internal"}
              onChange={(e) => setFormData({ ...formData, commitAuthorEmail: e.target.value })}
              className="w-full text-xs bg-neutral-50 border border-neutral-200 px-3 py-2 rounded-lg text-neutral-900 focus:outline-hidden focus:ring-2 focus:ring-neutral-900 focus:bg-white"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-neutral-700">Commit Message Template</label>
            <input
              type="text"
              value={formData.commitMessageTemplate || "chore(n8n): sync {name} [auto-sync]"}
              onChange={(e) => setFormData({ ...formData, commitMessageTemplate: e.target.value })}
              className="w-full text-xs bg-neutral-50 border border-neutral-200 px-3 py-2 rounded-lg text-neutral-900 focus:outline-hidden focus:ring-2 focus:ring-neutral-900 focus:bg-white"
            />
            <p className="text-[11px] text-neutral-400">Available tokens: <code>{"{name}"}</code>, <code>{"{id}"}</code></p>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          id="save-settings-btn"
          type="submit"
          disabled={isSaving}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-medium bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          <span>{isSaving ? "Saving..." : "Save Settings"}</span>
        </button>
      </div>
    </form>
  );
};
