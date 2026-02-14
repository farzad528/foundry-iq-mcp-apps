# Foundry IQ Knowledge Base MCP App

MCP App server that renders enterprise knowledge base retrieval results as interactive evidence cards with document preview, passage highlighting, and source provenance.

![Demo](docs/demo.gif)

## Quick Start

Works with any client that supports [MCP Apps](https://modelcontextprotocol.io/docs/extensions/apps) — Claude, ChatGPT, VS Code, GitHub Copilot, Goose, and others.

> **No API keys required!** The server ships with a built-in demo knowledge base (20 documents from the fictional "Contoso" enterprise — covering HR, security, engineering, finance, and more). You can try everything locally or via the hosted URL without any Azure credentials.

---

### Option 1: Remote Server (fastest — zero install)

#### `https://foundry-iq-mcp-apps.vercel.app/mcp`

Use the URL above to connect from any MCP-compatible client:

<details>
<summary><strong>Claude.ai (Web)</strong></summary>

1. Go to [claude.ai](https://claude.ai) → **Settings** → **Connectors**
2. Click **Add custom connector**
3. Paste: `https://foundry-iq-mcp-apps.vercel.app/mcp`
4. Click **Save**
5. Start a new conversation and ask: *"What's the vendor approval process?"*

</details>

<details>
<summary><strong>Claude Desktop</strong></summary>

Edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "foundry-iq-kb": {
      "url": "https://foundry-iq-mcp-apps.vercel.app/mcp"
    }
  }
}
```

Restart Claude Desktop, then ask: *"What's the remote work policy?"*

</details>

<details>
<summary><strong>GitHub Copilot (VS Code)</strong></summary>

Add to your `.vscode/mcp.json` (or User Settings → MCP Servers):

```json
{
  "servers": {
    "foundry-iq-kb": {
      "type": "http",
      "url": "https://foundry-iq-mcp-apps.vercel.app/mcp"
    }
  }
}
```

In Copilot Chat, try: *"Use the foundry-iq-kb tool to search for security training requirements"*

</details>

<details>
<summary><strong>GitHub Copilot (CLI)</strong></summary>

```bash
gh copilot config set mcp-servers '{
  "foundry-iq-kb": {
    "type": "http",
    "url": "https://foundry-iq-mcp-apps.vercel.app/mcp"
  }
}'
```

</details>

---

### Option 2: Local Server (stdio)

```bash
git clone https://github.com/Farzad528/foundry-iq-mcp-apps.git
cd foundry-iq-mcp-apps
pnpm install && pnpm run build
```

<details>
<summary><strong>Claude Desktop (stdio)</strong></summary>

Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "foundry-iq-kb": {
      "command": "node",
      "args": ["/path/to/foundry-iq-mcp-apps/dist/index.js", "--stdio"]
    }
  }
}
```

Restart Claude Desktop.

</details>

<details>
<summary><strong>GitHub Copilot / VS Code (stdio)</strong></summary>

Add to `.vscode/mcp.json`:

```json
{
  "servers": {
    "foundry-iq-kb": {
      "type": "stdio",
      "command": "node",
      "args": ["/path/to/foundry-iq-mcp-apps/dist/index.js", "--stdio"]
    }
  }
}
```

</details>

<details>
<summary><strong>Local HTTP server</strong></summary>

```bash
node dist/index.js
# → Foundry IQ KB MCP server listening on http://localhost:3001/mcp
```

Then connect any MCP client to `http://localhost:3001/mcp`.

</details>

---

## Demo Knowledge Base

The built-in demo KB simulates **Contoso Corporation's** enterprise knowledge base with **20 documents** across multiple departments and sources. No Azure credentials needed — just connect and start asking questions.

### Sample Prompts to Try

| Prompt | What it demonstrates |
|--------|---------------------|
| *"What's the vendor approval process?"* | Multi-source retrieval (SharePoint + OneLake + Web) |
| *"What are the remote work and PTO policies?"* | HR policy search across multiple documents |
| *"How do we handle security incidents?"* | Security & compliance document retrieval |
| *"What's Contoso's AI strategy for 2026?"* | Strategic document with Confidential label |
| *"Compare our deployment procedures with industry best practices"* | Federated results from internal + web sources |
| *"What budget approval is needed for a $75K vendor contract?"* | Finance policy with specific threshold lookup |
| *"How does the new employee onboarding work?"* | HR onboarding across multiple source groups |
| *"Show me all security-related documents"* | Filtering by source type (OneLake security docs) |

### Demo KB Content

| Department | Documents | Source Types |
|-----------|-----------|-------------|
| HR & People | Onboarding guide, remote work, performance reviews, benefits, PTO | SharePoint |
| Security | Vendor security requirements, security training, incident response, data classification | OneLake |
| Finance | Budget guidelines, travel expense policy | SharePoint |
| Engineering | Engineering handbook, deployment procedures | SharePoint, OneLake |
| Procurement | Vendor policy, procurement handbook | SharePoint |
| Product & Strategy | AI strategy 2026, customer feedback report | SharePoint |
| External Research | Vendor management (Gartner), AI adoption (McKinsey) | Web |

---

## Connecting Your Own Knowledge Base

To connect a real Azure AI Search knowledge base, set these environment variables:

```bash
# .env file (local) or Vercel environment variables (deployed)
AZURE_SEARCH_ENDPOINT=https://your-service.search.windows.net
AZURE_SEARCH_API_KEY=your-api-key
AZURE_SEARCH_KB_NAME=your-knowledge-base
```

When these are set, the server calls the Azure AI Search KB API (`2025-11-01-preview`) instead of the demo data. When they're not set, the demo KB is used automatically.

> **Security note:** API keys are never exposed to clients. The MCP server acts as a secure proxy — keys stay server-side (in your `.env` file locally, or as Vercel environment variables when deployed).

---

## Features

- **Evidence Cards** — Top 3 results shown inline with relevance scores, source badges, and text snippets
- **Fullscreen Board** — Expand to see all results with sort/filter controls
- **Document Viewer** — Click any card to preview the source document with highlighted passages
- **Source Metadata** — Relevance score, page number, source type, last modified, Purview labels
- **Deep Links** — One-click navigation to the original document in SharePoint, OneLake, etc.
- **Checkpoint Persistence** — Pin important evidence that persists across conversation turns
- **Streaming Render** — Results appear progressively as they arrive
- **Graceful Fallback** — Text-only results for MCP hosts that don't support apps
- **Demo Mode** — Built-in 20-document enterprise KB for instant testing

## Architecture

```
src/
├── server.ts          → MCP tools: read_me, knowledge_base_retrieve, + app-only tools
├── main.ts            → Entry point: HTTP (Streamable) + stdio transports
├── checkpoint-store.ts→ File/Memory/Redis checkpoint persistence
├── search-client.ts   → Azure AI Search KB API client + built-in demo KB
├── types.ts           → TypeScript type definitions
├── mcp-app.html       → App HTML shell
├── mcp-app.tsx        → React widget: evidence board, document viewer
├── components/        → React components (EvidenceCard, DocumentViewer, etc.)
└── global.css         → Styling with dark mode support
```

## What are MCP Apps?

[MCP Apps](https://github.com/modelcontextprotocol/ext-apps/) is an official Model Context Protocol extension that lets servers return interactive HTML interfaces that render directly in the chat.

- **Documentation**: [modelcontextprotocol.io/docs/extensions/apps](https://modelcontextprotocol.io/docs/extensions/apps)
- **Skill for AIs**: [create-mcp-app SKILL.md](https://github.com/modelcontextprotocol/ext-apps/blob/main/plugins/mcp-apps/skills/create-mcp-app/SKILL.md)

## Development

```bash
# Install dependencies
pnpm install

# Dev mode (watch + serve)
pnpm run dev

# Build for production
pnpm run build

# Run locally (HTTP)
pnpm run serve
# → http://localhost:3001/mcp

# Run locally (stdio)
node dist/index.js --stdio
```

### Deploy Your Own Instance

1. Fork this repo
2. Import in [vercel.com/new](https://vercel.com/new)
3. Optionally add `AZURE_SEARCH_ENDPOINT`, `AZURE_SEARCH_API_KEY`, `AZURE_SEARCH_KB_NAME` as environment variables (without them, the demo KB is used)
4. Deploy — your server will be at `https://your-project.vercel.app/mcp`

## License

MIT
