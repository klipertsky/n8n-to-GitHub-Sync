# n8n to GitHub Sync

Automatically sync your self-hosted n8n workflows to a GitHub repository.

Built for the **community edition** to add continuous version control without paid plans.

## Features
- **Auto-Sync**: Pushes workflow changes via Webhook or background polling.
- **Diff Viewer**: Compare live n8n JSON against your Git history.
- **Audit Log**: Track every commit with source and timestamp.

## Requirements
- Self-hosted n8n with a **Public REST API Key**.
- Node.js 18+ (for local hosting).
- GitHub Personal Access Token (with `repo` scope).

## Quick Start
1. **Clone & Install**:
   ```bash
   git clone https://github.com/klipertsky/n8n-to-GitHub-Sync.git
   cd n8n-to-GitHub-Sync
   npm install
2. Configure: Copy .env.example to .env and add your n8n URL, API key, and GitHub token.
3. Run:
   npm run dev
   Note: n8n doesn't have a native "save" webhook. You'll need to import the included trigger workflow template to enable instant syncing.
