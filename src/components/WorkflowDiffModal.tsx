import React, { useEffect, useState } from "react";
import { 
  X, 
  FileCode2, 
  GitCommit, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  ArrowRight, 
  Copy, 
  Check 
} from "lucide-react";
import { DiffResult } from "../types";
import { api } from "../services/api";

interface WorkflowDiffModalProps {
  workflowId: string | null;
  workflowName: string;
  onClose: () => void;
  onSync: (id: string) => Promise<void>;
  isSyncing: boolean;
}

export const WorkflowDiffModal: React.FC<WorkflowDiffModalProps> = ({
  workflowId,
  workflowName,
  onClose,
  onSync,
  isSyncing,
}) => {
  const [diff, setDiff] = useState<DiffResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<"side-by-side" | "n8n-only">("side-by-side");

  useEffect(() => {
    if (!workflowId) return;

    let mounted = true;
    setLoading(true);
    setError(null);

    api.getDiff(workflowId)
      .then((data) => {
        if (mounted) {
          setDiff(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (mounted) {
          setError(err.message || "Failed to load workflow diff");
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [workflowId]);

  if (!workflowId) return null;

  const handleCopyN8nJson = () => {
    if (diff?.n8nContent) {
      navigator.clipboard.writeText(diff.n8nContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-neutral-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-neutral-100 text-neutral-800">
              <FileCode2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-neutral-900">{workflowName}</h3>
                {diff && (
                  <span
                    className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full border ${
                      diff.isIdentical
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : !diff.existsOnGithub
                        ? "bg-blue-50 text-blue-700 border-blue-200"
                        : "bg-amber-50 text-amber-700 border-amber-200"
                    }`}
                  >
                    {diff.isIdentical
                      ? "Identical to GitHub"
                      : !diff.existsOnGithub
                      ? "New (Not yet on GitHub)"
                      : "Uncommitted Changes"}
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-500 font-mono mt-0.5">
                Target path: {diff?.repoPath || "workflows/workflow.json"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyN8nJson}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-neutral-600 hover:text-neutral-900 bg-white hover:bg-neutral-100 rounded-lg border border-neutral-200 transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? "Copied JSON" : "Copy JSON"}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 bg-neutral-50/30">
          {loading ? (
            <div className="py-20 text-center">
              <RefreshCw className="w-8 h-8 text-neutral-400 animate-spin mx-auto mb-3" />
              <p className="text-sm font-medium text-neutral-700">Comparing n8n workflow with GitHub version...</p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
              <p className="font-semibold">Unable to fetch diff</p>
              <p className="mt-1">{error}</p>
            </div>
          ) : diff ? (
            <div className="space-y-4">
              {/* Summary explanation pill */}
              <div className="text-xs p-3 rounded-lg border border-neutral-200 bg-white flex items-center justify-between">
                <div className="flex items-center gap-2 text-neutral-700">
                  {diff.isIdentical ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>This workflow in n8n matches the exact content stored on GitHub.</span>
                    </>
                  ) : !diff.existsOnGithub ? (
                    <>
                      <AlertTriangle className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>This workflow does not exist in the GitHub repository yet. Pushing will create it.</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>Modifications detected between your live n8n workflow and the version committed on GitHub.</span>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setViewMode("side-by-side")}
                    className={`px-2.5 py-1 text-xs rounded-md font-medium cursor-pointer ${
                      viewMode === "side-by-side"
                        ? "bg-neutral-900 text-white"
                        : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                    }`}
                  >
                    Side by Side
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("n8n-only")}
                    className={`px-2.5 py-1 text-xs rounded-md font-medium cursor-pointer ${
                      viewMode === "n8n-only"
                        ? "bg-neutral-900 text-white"
                        : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                    }`}
                  >
                    Live n8n JSON
                  </button>
                </div>
              </div>

              {/* Code comparison viewer */}
              {viewMode === "side-by-side" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Left: GitHub Existing Version */}
                  <div className="border border-neutral-200 rounded-xl overflow-hidden bg-white flex flex-col">
                    <div className="px-4 py-2 border-b border-neutral-200 bg-neutral-100/70 text-xs font-semibold text-neutral-700 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <GitCommit className="w-3.5 h-3.5 text-neutral-500" />
                        GitHub Repository Version
                      </span>
                      <span className="text-[10px] text-neutral-500 font-normal">
                        {diff.existsOnGithub ? "Current branch HEAD" : "Not yet created"}
                      </span>
                    </div>
                    <div className="p-3 font-mono text-xs text-neutral-800 overflow-x-auto max-h-[50vh] bg-neutral-900 text-neutral-100">
                      {diff.existsOnGithub && diff.githubContent ? (
                        <pre className="whitespace-pre">{diff.githubContent}</pre>
                      ) : (
                        <div className="py-12 text-center text-neutral-400 text-xs">
                          (File does not exist on GitHub yet)
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Live n8n Version */}
                  <div className="border border-neutral-200 rounded-xl overflow-hidden bg-white flex flex-col">
                    <div className="px-4 py-2 border-b border-neutral-200 bg-amber-50/70 text-xs font-semibold text-amber-900 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <RefreshCw className="w-3.5 h-3.5 text-amber-600" />
                        Live n8n Instance Version
                      </span>
                      <span className="text-[10px] text-amber-700 font-normal">
                        Ready to push
                      </span>
                    </div>
                    <div className="p-3 font-mono text-xs text-neutral-800 overflow-x-auto max-h-[50vh] bg-neutral-900 text-neutral-100">
                      <pre className="whitespace-pre">{diff.n8nContent}</pre>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="border border-neutral-200 rounded-xl overflow-hidden bg-neutral-900 text-neutral-100 p-4 font-mono text-xs max-h-[55vh] overflow-auto">
                  <pre className="whitespace-pre">{diff.n8nContent}</pre>
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-neutral-200 bg-white flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-neutral-700 hover:text-neutral-900 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors cursor-pointer"
          >
            Close
          </button>

          <button
            id="modal-push-to-github"
            type="button"
            onClick={async () => {
              await onSync(workflowId);
              onClose();
            }}
            disabled={isSyncing}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin text-amber-400" : ""}`} />
            <span>{isSyncing ? "Pushing..." : "Push This Version to GitHub"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
