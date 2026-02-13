# Foundry IQ Knowledge Base MCP App Server

MCP App server that renders Azure AI Search knowledge base results as interactive evidence cards with document preview and source provenance.

## Architecture

```
server.ts            → 7 tools (read_me, knowledge_base_retrieve, navigate_document,
                        filter_sources, pin_evidence, save_checkpoint, read_checkpoint)
                        + resource registration
main.ts              → HTTP (Streamable) + stdio transports
search-client.ts     → Azure AI Search KB API client (2025-11-01-preview) with stub mode
checkpoint-store.ts  → File/Memory/Redis checkpoint stores
types.ts             → TypeScript types for KB results, query plan, checkpoint data
src/mcp-app.tsx      → React widget: evidence board, document viewer, metadata sidebar
src/components/      → EvidenceCard, EvidenceBoard, DocumentViewer, MetadataSidebar,
                        FilterPanel, SourceBadge
src/global.css       → Styling with dark mode, animations, skeleton loading
```

## Tools

### `read_me` (text tool, no UI)
Returns the KB MCP App format reference with field descriptions, source types, and usage tips. The model should call this before `knowledge_base_retrieve`.

### `knowledge_base_retrieve` (UI tool)
Takes `query`, optional `sources`, `top_k`, `filters`. Calls Azure AI Search KB API (or returns stub data in dev mode). Returns `structuredContent` with results array, query plan, and checkpoint ID. The widget renders evidence cards with streaming progressive rendering.

**Text fallback:** When the MCP host doesn't support iframe rendering, the tool result includes formatted text with numbered results, relevance scores, and source links.

### `navigate_document` (app-only)
Takes `documentUrl`, `pageNumber`, `highlightOffsets`. Used by the widget to navigate within the document viewer.

### `filter_sources` (app-only)
Takes `checkpointId`, `sourceTypes[]`, `minRelevance?`. Filters the checkpoint's result set server-side and returns the filtered results.

### `pin_evidence` (app-only)
Takes `checkpointId`, `cardIds[]`. Updates the checkpoint with pinned card IDs for cross-turn persistence.

### `save_checkpoint` / `read_checkpoint` (app-only)
Generic checkpoint save/load for the widget to persist state.

## Checkpoint System

Three-tier storage matching the Excalidraw pattern:

1. **FileCheckpointStore** — local dev, writes JSON to `$TMPDIR/foundry-iq-kb-checkpoints/`
2. **MemoryCheckpointStore** — Vercel fallback (in-memory Map, lost on cold start)
3. **RedisCheckpointStore** — Vercel with Upstash KV (persistent, 30-day TTL)

Factory: `createVercelStore()` picks Redis if env vars exist, else Memory.

### Flow
- `knowledge_base_retrieve` saves results + empty pinnedCardIds as checkpoint
- Widget reads checkpoint via `read_checkpoint` to restore pinned evidence
- User pins/unpins cards → widget calls `pin_evidence` to update checkpoint
- Follow-up queries show pinned cards alongside new results

## Search Client

### Modes
- **Live mode**: When `AZURE_SEARCH_ENDPOINT`, `AZURE_SEARCH_API_KEY`, and `AZURE_SEARCH_KB_NAME` are set, calls the real Azure AI Search KB API (`2025-11-01-preview`).
- **Stub mode**: When no endpoint is configured, returns 5 realistic sample results about vendor policies. Great for development and demos.

### Environment Variables
```
AZURE_SEARCH_ENDPOINT=https://your-service.search.windows.net
AZURE_SEARCH_API_KEY=your-api-key
AZURE_SEARCH_KB_NAME=your-knowledge-base
```

## Build

```bash
pnpm install
pnpm run build
```

Build pipeline: `tsc --noEmit` → `vite build` (singlefile HTML) → `tsc -p tsconfig.server.json` → `bun build` (server + index).

## Running

```bash
# HTTP (Streamable) — default, stateless per-request
pnpm run serve
# Starts on http://localhost:3001/mcp

# stdio — for Claude Desktop
node dist/index.js --stdio

# Dev mode (watch + serve)
pnpm run dev
```

## Claude Desktop config

```json
{
  "foundry-iq-kb": {
    "command": "node",
    "args": ["<path>/dist/index.js", "--stdio"]
  }
}
```

## Key Design Decisions

### Standard Azure AI Search KB API
Uses the `2025-11-01-preview` API version for knowledge base retrieval. The search client maps AZS response fields to a normalized `KBRetrieveResult` type.

### Evidence cards, not raw text
The primary value proposition: enterprise knowledge retrieval rendered as interactive cards instead of plain text. Each card shows title, source badge, relevance bar, and 2-line snippet.

### Source type color coding
Consistent color badges help users instantly identify where results came from:
- SharePoint → Green
- OneLake → Blue
- Web → Orange
- Fabric → Purple
- MCP → Teal

### Graceful degradation
Every `knowledge_base_retrieve` response includes both `structuredContent` (for the app) and formatted text fallback (for CLI/non-iframe clients). Zero-error degradation.

### Checkpoint for cross-turn persistence
Pinned evidence survives conversation turns. The checkpoint stores both results and pinned card IDs, so follow-up queries can merge new results with previously pinned evidence.

## Widget Architecture

### Streaming render
The widget listens for `toolinputpartial` events and progressively renders evidence cards as results stream in. No re-rendering of existing cards — new cards fade in with CSS animation.

### Display modes
- **Inline** (default): Top 3 cards with "See all N results" link
- **Fullscreen**: All cards in a grid with sort/filter controls + document viewer panel

### Component hierarchy
```
KBApp (mcp-app.tsx)
├── EvidenceBoard
│   ├── FilterPanel (fullscreen only)
│   └── EvidenceCard × N
│       └── SourceBadge
├── DocumentViewer (on card click)
└── MetadataSidebar (on card click)
```
