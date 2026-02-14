import { registerAppResource, registerAppTool, RESOURCE_MIME_TYPE } from "@modelcontextprotocol/ext-apps/server";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult, ReadResourceResult } from "@modelcontextprotocol/sdk/types.js";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod/v4";
import type { CheckpointStore } from "./checkpoint-store.js";
import { KnowledgeBaseSearchClient } from "./search-client.js";

/** Maximum allowed size for input strings (5 MB). */
const MAX_INPUT_BYTES = 5 * 1024 * 1024;

// Works both from source (src/server.ts) and compiled (dist/server.js)
const DIST_DIR = import.meta.filename.endsWith(".ts")
  ? path.join(import.meta.dirname, "..", "dist")
  : import.meta.dirname;

// ============================================================
// RECALL: shared knowledge for the agent
// ============================================================
const RECALL_CHEAT_SHEET = `# Foundry IQ Knowledge Base — MCP App Reference

Thanks for calling read_me! Do NOT call it again in this conversation — you already have everything you need. Now use knowledge_base_retrieve to search.

## Overview

The Foundry IQ Knowledge Base MCP App provides enterprise-grade knowledge retrieval with an interactive visual experience. When you call knowledge_base_retrieve, results are automatically rendered as evidence cards with:
- Document titles and source badges
- Relevance scores
- Text snippets with query term highlighting
- Deep-links to original sources
- Interactive document viewer with passage highlighting

## Tool: knowledge_base_retrieve

### Input
- **query** (required): The user's question or search query. Be specific and include key terms.
- **sources** (optional): Array of source types to filter by: "sharepoint", "onelake", "web", "fabric", "mcp"
- **top_k** (optional): Number of results to return (default: 10, inline view shows top 3)
- **filters** (optional): Additional filter criteria as key-value pairs

### Output
Returns structured results with:
- **results**: Array of evidence chunks with content, metadata, and relevance scores
- **queryPlan**: Steps taken to decompose and execute the query
- **checkpointId**: ID for restoring this evidence state in future turns

### Best Practices
1. Use the user's exact question as the query — don't over-summarize
2. For comparative questions, the system automatically federates across multiple sources
3. Results are ranked by relevance; inline mode shows top 3, fullscreen shows all
4. Each result includes a documentUrl for deep-linking to the original source
5. Relevance scores range from 0 to 1; scores above 0.8 indicate high confidence

## Checkpoints

Every knowledge_base_retrieve call returns a checkpointId. If the user asks a follow-up question:
- Previous pinned evidence is automatically restored
- New results appear alongside pinned cards
- No need to re-retrieve previously found documents

## Source Types
| Type | Description | Badge Color |
|------|-------------|-------------|
| sharepoint | SharePoint documents and sites | Green |
| onelake | OneLake / Data Lake files | Blue |
| web | Web/Bing search results | Orange |
| fabric | Microsoft Fabric data | Purple |
| mcp | Other MCP-connected sources | Teal |

## Tips
- Do NOT call read_me again — you already have everything
- Let the app handle visual rendering — just pass the query
- For multi-source queries, omit the sources filter to search everywhere
- The app supports streaming: results appear progressively as they arrive
`;

/**
 * Registers all Foundry IQ KB tools and resources on the given McpServer.
 * Shared between local (main.ts) and Vercel (api/mcp.ts) entry points.
 */
export function registerTools(server: McpServer, distDir: string, store: CheckpointStore): void {
  const resourceUri = "ui://foundry-iq/kb-viewer";
  const searchClient = new KnowledgeBaseSearchClient();

  // ============================================================
  // Tool 1: read_me (call before retrieving)
  // ============================================================
  server.registerTool(
    "read_me",
    {
      description: "Returns the Foundry IQ Knowledge Base format reference with field descriptions, usage tips, and examples. Call this BEFORE using knowledge_base_retrieve for the first time.",
      annotations: { readOnlyHint: true },
    },
    async (): Promise<CallToolResult> => {
      return { content: [{ type: "text", text: RECALL_CHEAT_SHEET }] };
    },
  );

  // ============================================================
  // Tool 2: knowledge_base_retrieve (main retrieval tool)
  // ============================================================
  registerAppTool(server,
    "knowledge_base_retrieve",
    {
      title: "Search Knowledge Base",
      description: `Retrieves documents from a Foundry IQ knowledge base and renders results as interactive evidence cards.
Results stream in progressively with source metadata, relevance scores, and deep-links.
Call read_me first to learn the format reference.`,
      inputSchema: z.object({
        query: z.string().describe("The user's search query or question."),
        sources: z.array(z.string()).optional().describe("Optional array of source types to filter: sharepoint, onelake, web, fabric, mcp"),
        top_k: z.number().optional().describe("Number of results to return (default: 10)"),
        filters: z.record(z.string(), z.unknown()).optional().describe("Optional filter criteria as key-value pairs"),
      }),
      annotations: { readOnlyHint: true },
      _meta: { ui: { resourceUri } },
    },
    async ({ query, sources, top_k, filters }): Promise<CallToolResult> => {
      try {
        const { results, queryPlan } = await searchClient.retrieve({
          query,
          sources,
          topK: top_k,
          filters,
        });

        const checkpointId = crypto.randomUUID().replace(/-/g, "").slice(0, 18);
        await store.save(checkpointId, { results, pinnedCardIds: [] });

        // Build text fallback for non-iframe MCP hosts
        const textFallback = results.map((r, i) =>
          `${i + 1}. **${r.title}** (${Math.round(r.relevanceScore * 100)}% relevant)\n   ${r.content.slice(0, 200)}...\n   Source: ${r.sourceType} | Page ${r.pageNumber}/${r.totalPages}\n   Link: ${r.documentUrl}`
        ).join("\n\n");

        return {
          content: [{
            type: "text",
            text: `Found ${results.length} results for "${query}". Checkpoint id: "${checkpointId}".

${textFallback}

---
To explore these results interactively, the MCP App renders evidence cards with document preview, passage highlighting, and source metadata.
If the user wants to refine, they can filter by source type or pin important evidence for follow-up questions.`,
          }],
          structuredContent: { results, queryPlan, checkpointId },
        };
      } catch (err) {
        return {
          content: [{ type: "text", text: `Knowledge base retrieval failed: ${(err as Error).message}` }],
          isError: true,
        };
      }
    },
  );

  // ============================================================
  // Tool 3: navigate_document (app-only)
  // ============================================================
  registerAppTool(server,
    "navigate_document",
    {
      description: "Navigate to a specific page in a document with optional passage highlighting.",
      inputSchema: z.object({
        documentUrl: z.string().describe("URL of the document to navigate to"),
        pageNumber: z.number().describe("Page number to display"),
        highlightOffsets: z.array(z.number()).optional().describe("Character offsets to highlight [start, end]"),
      }),
      _meta: { ui: { visibility: ["app"] } },
    },
    async ({ documentUrl, pageNumber, highlightOffsets }): Promise<CallToolResult> => {
      return {
        content: [{
          type: "text",
          text: JSON.stringify({ documentUrl, pageNumber, highlightOffsets }),
        }],
      };
    },
  );

  // ============================================================
  // Tool 4: filter_sources (app-only)
  // ============================================================
  registerAppTool(server,
    "filter_sources",
    {
      description: "Filter evidence results by source type and minimum relevance score.",
      inputSchema: z.object({
        checkpointId: z.string().describe("Checkpoint ID to filter"),
        sourceTypes: z.array(z.string()).describe("Source types to include"),
        minRelevance: z.number().optional().describe("Minimum relevance score (0-1)"),
      }),
      _meta: { ui: { visibility: ["app"] } },
    },
    async ({ checkpointId, sourceTypes, minRelevance }): Promise<CallToolResult> => {
      try {
        const data = await store.load(checkpointId);
        if (!data) {
          return { content: [{ type: "text", text: "" }] };
        }
        let filtered = data.results.filter((r: any) => sourceTypes.includes(r.sourceType));
        if (minRelevance !== undefined) {
          filtered = filtered.filter((r: any) => r.relevanceScore >= minRelevance);
        }
        return { content: [{ type: "text", text: JSON.stringify({ results: filtered }) }] };
      } catch (err) {
        return { content: [{ type: "text", text: `Filter failed: ${(err as Error).message}` }], isError: true };
      }
    },
  );

  // ============================================================
  // Tool 5: pin_evidence (app-only)
  // ============================================================
  registerAppTool(server,
    "pin_evidence",
    {
      description: "Pin or unpin evidence cards in a checkpoint for persistence across turns.",
      inputSchema: z.object({
        checkpointId: z.string().describe("Checkpoint ID"),
        cardIds: z.array(z.string()).describe("IDs of cards to pin"),
      }),
      _meta: { ui: { visibility: ["app"] } },
    },
    async ({ checkpointId, cardIds }): Promise<CallToolResult> => {
      try {
        const data = await store.load(checkpointId);
        if (!data) {
          return { content: [{ type: "text", text: `Checkpoint "${checkpointId}" not found.` }], isError: true };
        }
        data.pinnedCardIds = cardIds;
        await store.save(checkpointId, data);
        return { content: [{ type: "text", text: "ok" }] };
      } catch (err) {
        return { content: [{ type: "text", text: `Pin failed: ${(err as Error).message}` }], isError: true };
      }
    },
  );

  // ============================================================
  // Tool 6: save_checkpoint (app-only)
  // ============================================================
  registerAppTool(server,
    "save_checkpoint",
    {
      description: "Save checkpoint state for persistence.",
      inputSchema: z.object({
        id: z.string(),
        data: z.string(),
      }),
      _meta: { ui: { visibility: ["app"] } },
    },
    async ({ id, data }): Promise<CallToolResult> => {
      if (data.length > MAX_INPUT_BYTES) {
        return {
          content: [{ type: "text", text: `Checkpoint data exceeds ${MAX_INPUT_BYTES} byte limit.` }],
          isError: true,
        };
      }
      try {
        await store.save(id, JSON.parse(data));
        return { content: [{ type: "text", text: "ok" }] };
      } catch (err) {
        return { content: [{ type: "text", text: `save failed: ${(err as Error).message}` }], isError: true };
      }
    },
  );

  // ============================================================
  // Tool 7: read_checkpoint (app-only)
  // ============================================================
  registerAppTool(server,
    "read_checkpoint",
    {
      description: "Read checkpoint state for restore.",
      inputSchema: z.object({
        id: z.string(),
      }),
      _meta: { ui: { visibility: ["app"] } },
    },
    async ({ id }): Promise<CallToolResult> => {
      try {
        const data = await store.load(id);
        if (!data) return { content: [{ type: "text", text: "" }] };
        return { content: [{ type: "text", text: JSON.stringify(data) }] };
      } catch (err) {
        return { content: [{ type: "text", text: `read failed: ${(err as Error).message}` }], isError: true };
      }
    },
  );

  // Register the single shared resource for all UI tools
  registerAppResource(server,
    resourceUri,
    resourceUri,
    { mimeType: RESOURCE_MIME_TYPE },
    async (): Promise<ReadResourceResult> => {
      const html = await fs.readFile(path.join(distDir, "mcp-app.html"), "utf-8");
      return {
        contents: [{
          uri: resourceUri,
          mimeType: RESOURCE_MIME_TYPE,
          text: html,
          _meta: {
            ui: {
              prefersBorder: true,
            },
          },
        }],
      };
    },
  );
}

/**
 * Creates a new MCP server instance with Foundry IQ KB tools.
 * Used by local entry point (main.ts) and Docker deployments.
 */
export function createServer(store: CheckpointStore): McpServer {
  const server = new McpServer({
    name: "Foundry IQ Knowledge Base",
    version: "0.1.0",
  });
  registerTools(server, DIST_DIR, store);
  return server;
}
