import React, { useState } from "react";
import { 
  Webhook, 
  Copy, 
  Check, 
  Download, 
  Zap, 
  Clock, 
  ShieldCheck, 
  ExternalLink, 
  Code2, 
  Terminal, 
  CheckCircle2, 
  ArrowRight,
  RefreshCw,
  Cpu
} from "lucide-react";
import { AppConfig } from "../types";

interface WebhookTabProps {
  config: AppConfig | null;
  onUpdateConfig: (partial: Partial<AppConfig>) => Promise<void>;
}

export const WebhookTab: React.FC<WebhookTabProps> = ({ config, onUpdateConfig }) => {
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedTemplate, setCopiedTemplate] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const webhookUrl = config?.webhookUrl || `${window.location.origin}/api/webhooks/n8n`;
  const webhookSecret = config?.webhookSecret || "";

  const handleCopy = (text: string, setFn: (val: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setFn(true);
    setTimeout(() => setFn(false), 2000);
  };

  const handleDownloadTemplate = () => {
    window.location.href = "/api/n8n-template";
  };

  const handleTogglePolling = async () => {
    if (!config) return;
    setIsUpdating(true);
    try {
      await onUpdateConfig({ pollingEnabled: !config.pollingEnabled });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleIntervalChange = async (minutes: number) => {
    setIsUpdating(true);
    try {
      await onUpdateConfig({ pollingIntervalMinutes: minutes });
    } finally {
      setIsUpdating(false);
    }
  };

  const sampleN8nTemplateJson = `{
  "name": "Auto-Push to GitHub Trigger",
  "nodes": [
    {
      "parameters": {
        "events": ["workflow.saved"]
      },
      "name": "n8n Trigger on Workflow Saved",
      "type": "n8n-nodes-base.n8nTrigger",
      "typeVersion": 1,
      "position": [240, 300]
    },
    {
      "parameters": {
        "method": "POST",
        "url": "${webhookUrl}",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            { "name": "X-Webhook-Secret", "value": "${webhookSecret}" },
            { "name": "Content-Type", "value": "application/json" }
          ]
        },
        "sendBody": true,
        "bodyParameters": {
          "parameters": [
            { "name": "workflowId", "value": "={{ $json.id || $json.workflowId }}" },
            { "name": "workflowName", "value": "={{ $json.name }}" }
          ]
        }
      },
      "name": "Notify GitHub Sync App",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.2,
      "position": [480, 300]
    }
  ],
  "connections": {
    "n8n Trigger on Workflow Saved": {
      "main": [[{ "node": "Notify GitHub Sync App", "type": "main", "index": 0 }]]
    }
  },
  "active": true
}`;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Introduction Header */}
      <div className="bg-white rounded-xl border border-neutral-200/80 p-6 shadow-2xs">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0 text-amber-600">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-neutral-900">
              Automatic Change Detection & Push
            </h2>
            <p className="text-xs sm:text-sm text-neutral-600 mt-1 max-w-3xl leading-relaxed">
              Whenever you modify, save, or create a workflow in your n8n canvas, this application automatically pushes the changes to your GitHub repository. You can use <strong>Instant Webhooks (Zero Latency)</strong> and the <strong>Continuous Background Polling Daemon</strong> in tandem.
            </p>
          </div>
        </div>
      </div>

      {/* Engine 1: Instant Webhook */}
      <div className="bg-white rounded-xl border border-neutral-200/80 overflow-hidden shadow-2xs">
        <div className="p-6 border-b border-neutral-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Webhook className="w-5 h-5 text-neutral-800" />
              <h3 className="text-base font-semibold text-neutral-900">
                Method 1: Instant Webhook (Recommended)
              </h3>
            </div>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
              Real-time 0s Latency
            </span>
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            Fires immediately when you click "Save" on any workflow in n8n.
          </p>
        </div>

        <div className="p-6 space-y-6">
          {/* Endpoint details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Webhook URL */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-700">Webhook Receiver URL</label>
              <div className="flex items-center gap-2">
                <input
                  id="webhook-url-input"
                  type="text"
                  readOnly
                  value={webhookUrl}
                  className="w-full text-xs font-mono bg-neutral-50 border border-neutral-200 text-neutral-800 px-3 py-2 rounded-lg"
                />
                <button
                  id="copy-webhook-url-btn"
                  type="button"
                  onClick={() => handleCopy(webhookUrl, setCopiedUrl)}
                  className="px-3 py-2 text-xs font-medium bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg transition-colors cursor-pointer shrink-0 flex items-center gap-1.5"
                >
                  {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedUrl ? "Copied" : "Copy"}</span>
                </button>
              </div>
            </div>

            {/* Webhook Secret */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-700">X-Webhook-Secret (Header)</label>
              <div className="flex items-center gap-2">
                <input
                  id="webhook-secret-input"
                  type="text"
                  readOnly
                  value={webhookSecret}
                  className="w-full text-xs font-mono bg-neutral-50 border border-neutral-200 text-neutral-800 px-3 py-2 rounded-lg"
                />
                <button
                  id="copy-webhook-secret-btn"
                  type="button"
                  onClick={() => handleCopy(webhookSecret, setCopiedSecret)}
                  className="px-3 py-2 text-xs font-medium bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-lg transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 border border-neutral-200"
                >
                  {copiedSecret ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSecret ? "Copied" : "Copy"}</span>
                </button>
              </div>
            </div>
          </div>

          {/* 1-Click Setup Instructions */}
          <div className="bg-neutral-50 rounded-xl p-5 border border-neutral-200">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-3 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              1-Minute Setup in your n8n instance:
            </h4>

            <ol className="space-y-3 text-xs text-neutral-600 list-decimal list-inside">
              <li>
                <strong className="text-neutral-900">Download or copy the pre-built n8n trigger workflow below:</strong>
                <div className="flex items-center gap-2 mt-2">
                  <button
                    id="download-n8n-template-btn"
                    type="button"
                    onClick={handleDownloadTemplate}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download n8n-github-sync-trigger.json</span>
                  </button>

                  <button
                    id="copy-n8n-template-btn"
                    type="button"
                    onClick={() => handleCopy(sampleN8nTemplateJson, setCopiedTemplate)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white text-neutral-700 border border-neutral-200 rounded-lg hover:bg-neutral-100 transition-colors cursor-pointer"
                  >
                    {copiedTemplate ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedTemplate ? "Copied Workflow JSON" : "Copy Workflow JSON"}</span>
                  </button>
                </div>
              </li>
              <li>
                In your n8n interface, click <strong>Workflows → Import from File</strong> (or press <kbd className="px-1.5 py-0.5 bg-neutral-200 rounded font-mono text-[10px]">Ctrl+V</kbd> / <kbd className="px-1.5 py-0.5 bg-neutral-200 rounded font-mono text-[10px]">Cmd+V</kbd> on any blank n8n canvas to paste it).
              </li>
              <li>
                Switch the workflow toggle from <strong>Inactive</strong> to <strong>Active</strong>.
              </li>
              <li>
                That's it! Every time you save changes to <em>any</em> workflow in n8n, it triggers this endpoint and automatically commits the new version to GitHub!
              </li>
            </ol>
          </div>
        </div>
      </div>

      {/* Engine 2: Background Polling Daemon */}
      <div className="bg-white rounded-xl border border-neutral-200/80 overflow-hidden shadow-2xs">
        <div className="p-6 border-b border-neutral-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Clock className="w-5 h-5 text-neutral-800" />
            <div>
              <h3 className="text-base font-semibold text-neutral-900">
                Method 2: Background Polling Daemon
              </h3>
              <p className="text-xs text-neutral-500 mt-0.5">
                Runs 24/7 on the server, regularly scanning your n8n instance for unsynced changes.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span
              className={`text-xs px-2.5 py-1 rounded-full font-medium border flex items-center gap-1.5 ${
                config?.pollingEnabled
                  ? "bg-blue-50 text-blue-700 border-blue-200"
                  : "bg-neutral-100 text-neutral-600 border-neutral-200"
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${config?.pollingEnabled ? "bg-blue-600 animate-pulse" : "bg-neutral-400"}`} />
              {config?.pollingEnabled ? "Daemon Active" : "Daemon Paused"}
            </span>

            <button
              id="toggle-daemon-btn"
              type="button"
              onClick={handleTogglePolling}
              disabled={isUpdating}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer border ${
                config?.pollingEnabled
                  ? "bg-white hover:bg-neutral-50 text-neutral-700 border-neutral-200"
                  : "bg-neutral-900 hover:bg-neutral-800 text-white border-transparent"
              }`}
            >
              {config?.pollingEnabled ? "Pause Daemon" : "Enable Daemon"}
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <label className="text-xs font-semibold text-neutral-900 block">Check Interval</label>
              <p className="text-xs text-neutral-500 mt-0.5">
                How frequently the daemon queries n8n API to compare workflow versions and node hashes.
              </p>
            </div>

            <div className="flex items-center gap-1.5">
              {[1, 5, 15, 30, 60].map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => handleIntervalChange(mins)}
                  disabled={isUpdating}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                    config?.pollingIntervalMinutes === mins
                      ? "bg-neutral-900 text-white"
                      : "bg-neutral-100 hover:bg-neutral-200 text-neutral-700"
                  }`}
                >
                  {mins === 60 ? "1 hr" : `${mins} min`}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
