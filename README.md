# Foundry IQ Knowledge Base MCP App

MCP App server that renders enterprise knowledge base retrieval results as interactive evidence cards with document preview, passage highlighting, and source provenance.

![Demo](docs/demo.gif)

## Install

Works with any client that supports [MCP Apps](https://modelcontextprotocol.io/docs/extensions/apps) — Claude, ChatGPT, VS Code, Goose, and others.

### Remote (recommended)

### `https://foundry-iq-mcp-apps.vercel.app/mcp`

Add as a remote MCP server in your client. For example, in [claude.ai](https://claude.ai): **Settings** → **Connectors** → **Add custom connector** → paste the URL above.

### Local

**Build from Source**

```bash
git clone https://github.com/Farzad528/foundry-iq-mcp-apps.git
cd foundry-iq-mcp-apps
pnpm install && pnpm run build
```

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

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

## Configuration

Copy `sample.env` to `.env` and fill in your Azure AI Search credentials:

```
AZURE_SEARCH_ENDPOINT=https://your-service.search.windows.net
AZURE_SEARCH_API_KEY=your-api-key
AZURE_SEARCH_KB_NAME=your-knowledge-base
```

When no endpoint is configured, the server returns realistic stub data for development.

## Usage

Example prompts:
- "What's our policy on vendor approvals?"
- "Compare our internal vendor guidelines with industry best practices"
- "Show me documents about security requirements for new vendors"

## Features

- **Evidence Cards**: Top 3 results shown inline with relevance scores, source badges, and text snippets
- **Fullscreen Board**: Expand to see all results with sort/filter controls
- **Document Viewer**: Click any card to preview the source document with highlighted passages
- **Source Metadata**: Relevance score, page number, source type, last modified, Purview labels
- **Deep Links**: One-click navigation to the original document in SharePoint, OneLake, etc.
- **Checkpoint Persistence**: Pin important evidence that persists across conversation turns
- **Streaming Render**: Results appear progressively as they arrive
- **Graceful Fallback**: Text-only results for MCP hosts that don't support apps

## Architecture

```
src/
├── server.ts          → MCP tools: read_me, knowledge_base_retrieve, + app-only tools
├── main.ts            → Entry point: HTTP (Streamable) + stdio transports
├── checkpoint-store.ts→ File/Memory/Redis checkpoint persistence
├── search-client.ts   → Azure AI Search KB API client (2025-11-01-preview)
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

### Deploy to Vercel

1. Fork this repo
2. Import in [vercel.com/new](https://vercel.com/new)
3. Add environment variables for Azure AI Search (optional)
4. Deploy — your server will be at `https://your-project.vercel.app/mcp`

## License

MIT
