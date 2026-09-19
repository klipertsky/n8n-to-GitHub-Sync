import React, { useState } from "react";
import { 
  History, 
  CheckCircle2, 
  AlertTriangle, 
  ExternalLink, 
  GitCommit, 
  Clock, 
  Trash2, 
  RefreshCw, 
  ChevronDown, 
  ChevronRight,
  Webhook,
  Zap,
  Radio
} from "lucide-react";
import { SyncLogEntry } from "../types";

interface HistoryTabProps {
  history: SyncLogEntry[];
  isLoading: boolean;
  onRefresh: () => void;
  onClearHistory: () => Promise<void>;
  githubRepo?: string;
}

export const HistoryTab: React.FC<HistoryTabProps> = ({
  history,
  isLoading,
  onRefresh,
  onClearHistory,
  githubRepo,
}) => {
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [clearing, setClearing] = useState(false);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleClear = async () => {
    if (!window.confirm("Are you sure you want to clear sync history logs?")) return;
    setClearing(true);
    try {
      await onClearHistory();
    } finally {
      setClearing(false);
    }
  };

  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      {/* Top action bar */}
      <div className="bg-white p-4 rounded-xl border border-neutral-200/80 shadow-2xs flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-neutral-900 flex items-center gap-2">
            <History className="w-4 h-4 text-neutral-600" />
            Activity & Push Audit Log
          </h3>
          <p className="text-xs text-neutral-500 mt-0.5">
            Real-time record of all automated and manual commits pushed to GitHub.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="refresh-history-btn"
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
            className="p-2 rounded-lg border border-neutral-200 bg-neutral-50 hover:bg-neutral-100 text-neutral-600 hover:text-neutral-900 transition-colors cursor-pointer disabled:opacity-50"
            title="Refresh history"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          </button>

          {history.length > 0 && (
            <button
              id="clear-history-btn"
              type="button"
              onClick={handleClear}
              disabled={clearing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors cursor-pointer border border-rose-200"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear History</span>
            </button>
          )}
        </div>
      </div>

      {/* History entries list */}
      {history.length === 0 ? (
        <div className="bg-white rounded-xl border border-neutral-200 p-12 text-center shadow-2xs">
          <History className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
          <p className="text-sm font-semibold text-neutral-700">No Sync History Yet</p>
          <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
            History will appear here when manual syncs run, webhooks trigger, or background polling detects changes.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {history.map((entry) => {
            const isExpanded = !!expandedIds[entry.id];
            const hasDetails = entry.details && entry.details.length > 0;

            return (
              <div
                key={entry.id}
                className="bg-white rounded-xl border border-neutral-200/80 shadow-2xs overflow-hidden transition-colors"
              >
                <div
                  onClick={() => hasDetails && toggleExpand(entry.id)}
                  className={`p-4 flex items-center justify-between gap-3 ${
                    hasDetails ? "cursor-pointer hover:bg-neutral-50/70" : ""
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Status Icon */}
                    {entry.status === "success" ? (
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-200">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                    ) : entry.status === "error" ? (
                      <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-200">
                        <AlertTriangle className="w-4 h-4" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-neutral-100 text-neutral-500 flex items-center justify-center shrink-0 border border-neutral-200">
                        <Clock className="w-4 h-4" />
                      </div>
                    )}

                    {/* Message & Trigger */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-neutral-900 truncate">
                          {entry.message}
                        </span>

                        {/* Trigger Badge */}
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-600 border border-neutral-200 shrink-0">
                          {entry.trigger === "webhook" ? (
                            <>
                              <Webhook className="w-2.5 h-2.5 text-purple-600" />
                              <span>Webhook</span>
                            </>
                          ) : entry.trigger === "polling" ? (
                            <>
                              <Radio className="w-2.5 h-2.5 text-blue-600" />
                              <span>Auto-Poll</span>
                            </>
                          ) : (
                            <>
                              <Zap className="w-2.5 h-2.5 text-amber-600" />
                              <span>Manual</span>
                            </>
                          )}
                        </span>
                      </div>

                      <p className="text-[11px] text-neutral-500 mt-0.5">
                        {formatDate(entry.timestamp)}
                        {entry.syncedCount > 0 && ` • Pushed ${entry.syncedCount} workflow(s)`}
                      </p>
                    </div>
                  </div>

                  {/* Expand Chevron */}
                  {hasDetails && (
                    <div className="flex items-center gap-1 text-neutral-400">
                      <span className="text-xs text-neutral-500 hidden sm:inline">
                        {entry.details?.length} item{entry.details?.length === 1 ? "" : "s"}
                      </span>
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-neutral-500" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-neutral-400" />
                      )}
                    </div>
                  )}
                </div>

                {/* Expanded Details List */}
                {isExpanded && hasDetails && (
                  <div className="px-4 pb-4 pt-1 border-t border-neutral-100 bg-neutral-50/50">
                    <div className="divide-y divide-neutral-100 text-xs">
                      {entry.details!.map((det, idx) => (
                        <div key={idx} className="py-2.5 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                det.action === "added" || det.action === "updated"
                                  ? "bg-emerald-500"
                                  : det.action === "error"
                                  ? "bg-rose-500"
                                  : "bg-neutral-300"
                              }`}
                            />
                            <span className="font-medium text-neutral-800 truncate">
                              {det.workflowName}
                            </span>
                            <span className="text-[11px] text-neutral-400 font-mono">
                              ({det.workflowId})
                            </span>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {det.commitSha ? (
                              <a
                                href={
                                  det.commitUrl ||
                                  (githubRepo
                                    ? `https://github.com/${githubRepo}/commit/${det.commitSha}`
                                    : "#")
                                }
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 font-mono text-[11px] text-blue-600 hover:text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200"
                              >
                                <GitCommit className="w-3 h-3" />
                                <span>{det.commitSha.slice(0, 7)}</span>
                                <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            ) : det.action === "unchanged" ? (
                              <span className="text-[11px] text-neutral-400">Unchanged</span>
                            ) : det.error ? (
                              <span className="text-[11px] text-rose-600">{det.error}</span>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
