# n8n to GitHub Sync

Automatic version control, change detection, and continuous backup of
self-hosted n8n workflows into your own GitHub repository.

Built for n8n **community edition** users who want Git-backed workflow
history without paid plans or enterprise-only features.

---

## Why this exists

n8n lets you download a single workflow as JSON from the editor UI, and the
Server CLI can export workflows in bulk — but there is no built-in way for a
community instance to *continuously* push workflow changes into version
control. This app closes that gap: it reads your workflows through the n8n
public REST API and commits them to GitHub whenever they change.

## How it works

Two sync engines run together so nothing slips through:

1. **Webhook trigger (zero latency)** — A secured endpoint
   (`/api/webhooks/n8n`) with shared-secret auth. When you save a workflow,
   a small companion n8n workflow calls the webhook, and the app immediately
   fetches and commits the updated JSON. A ready-to-import trigger template
   is included (`n8n-github-sync-trigger.json`).
2. **Background polling daemon** — A 24/7 scheduler polls your n8n instance
   at a configurable interval (1 min / 5 min / 15 min / 30 min / 1 hr),
   hashes nodes and connections, and pushes only real modifications.

Detected changes are committed to your chosen repo, branch, and folder
(e.g.
