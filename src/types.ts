/**
 * TypeScript types for the Foundry IQ Knowledge Base MCP App.
 */

/** Source types for knowledge base documents. */
export type SourceType = "sharepoint" | "onelake" | "web" | "fabric" | "mcp";

/** A single retrieved chunk/passage from the knowledge base. */
export interface KBRetrieveResult {
  id: string;
  content: string;
  title: string;
  documentUrl: string;
  sourceType: SourceType;
  pageNumber: number;
  totalPages: number;
  chunkOffsets: { start: number; end: number };
  relevanceScore: number;
  lastModified: string;
  purviewLabels: string[];
  sourceGroup: string;
}

/** A single step in the query plan. */
export interface QueryPlanStep {
  action: string;
  detail?: string;
  source?: string;
  resultCount?: number;
}

/** The query plan returned alongside retrieval results. */
export interface QueryPlan {
  steps: QueryPlanStep[];
  sourcesConsulted: string[];
  totalCandidates: number;
  returnedResults: number;
}

/** Full response from the knowledge_base_retrieve tool. */
export interface KBToolResponse {
  results: KBRetrieveResult[];
  queryPlan: QueryPlan;
  checkpointId: string;
}

/** Data stored in a checkpoint. */
export interface CheckpointData {
  results: KBRetrieveResult[];
  pinnedCardIds: string[];
  queryPlan?: QueryPlan;
}

/** Options for the knowledge base retrieve call. */
export interface RetrieveOptions {
  query: string;
  sources?: string[];
  topK?: number;
  filters?: Record<string, unknown>;
}
