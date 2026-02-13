/**
 * Azure AI Search Knowledge Base API client.
 * Uses the 2025-11-01-preview API version.
 * Falls back to stub data when AZURE_SEARCH_ENDPOINT is not configured.
 */

import type { KBRetrieveResult, QueryPlan, RetrieveOptions } from "./types.js";

const API_VERSION = "2025-11-01-preview";

/** Sample data returned when no Azure AI Search endpoint is configured. */
const STUB_RESULTS: KBRetrieveResult[] = [
  {
    id: "chunk-001",
    content: "The vendor approval process requires three levels of sign-off: department head, procurement team, and legal review. All vendors must complete a compliance questionnaire before engagement.",
    title: "Vendor_Policy_2025.pdf",
    documentUrl: "https://contoso.sharepoint.com/sites/policies/Vendor_Policy_2025.pdf",
    sourceType: "sharepoint",
    pageNumber: 7,
    totalPages: 12,
    chunkOffsets: { start: 1420, end: 1890 },
    relevanceScore: 0.94,
    lastModified: "2026-01-15T10:30:00Z",
    purviewLabels: ["Internal"],
    sourceGroup: "HR Policies",
  },
  {
    id: "chunk-002",
    content: "Budget thresholds for vendor contracts: under $10K requires manager approval, $10K-$100K requires VP approval, over $100K requires C-level sign-off and board notification.",
    title: "Budget_Guidelines_Q1_2026.docx",
    documentUrl: "https://contoso.sharepoint.com/sites/finance/Budget_Guidelines_Q1_2026.docx",
    sourceType: "sharepoint",
    pageNumber: 3,
    totalPages: 8,
    chunkOffsets: { start: 820, end: 1210 },
    relevanceScore: 0.87,
    lastModified: "2026-01-20T14:15:00Z",
    purviewLabels: ["Confidential"],
    sourceGroup: "Finance",
  },
  {
    id: "chunk-003",
    content: "All new vendor onboarding requires completion of security assessment, data processing agreement review, and SOC 2 Type II certification verification before contract execution.",
    title: "Security_Requirements_Vendors.pdf",
    documentUrl: "https://contoso-lake.dfs.core.windows.net/policies/Security_Requirements_Vendors.pdf",
    sourceType: "onelake",
    pageNumber: 1,
    totalPages: 5,
    chunkOffsets: { start: 0, end: 380 },
    relevanceScore: 0.82,
    lastModified: "2025-12-10T09:00:00Z",
    purviewLabels: ["Internal"],
    sourceGroup: "Security",
  },
  {
    id: "chunk-004",
    content: "Industry best practices for vendor management include annual performance reviews, quarterly business reviews, and risk-based tiering of vendor relationships.",
    title: "Vendor Management Best Practices - Gartner 2025",
    documentUrl: "https://www.gartner.com/en/articles/vendor-management-best-practices",
    sourceType: "web",
    pageNumber: 1,
    totalPages: 1,
    chunkOffsets: { start: 0, end: 290 },
    relevanceScore: 0.76,
    lastModified: "2025-11-01T00:00:00Z",
    purviewLabels: [],
    sourceGroup: "External Research",
  },
  {
    id: "chunk-005",
    content: "The preferred vendor list is maintained in the procurement portal. Departments should first check this list before initiating new vendor relationships to leverage existing contracts and volume discounts.",
    title: "Procurement_Handbook_2026.pdf",
    documentUrl: "https://contoso.sharepoint.com/sites/procurement/Handbook_2026.pdf",
    sourceType: "sharepoint",
    pageNumber: 15,
    totalPages: 42,
    chunkOffsets: { start: 3200, end: 3650 },
    relevanceScore: 0.71,
    lastModified: "2026-02-01T16:45:00Z",
    purviewLabels: ["Internal"],
    sourceGroup: "Procurement",
  },
];

const STUB_QUERY_PLAN: QueryPlan = {
  steps: [
    { action: "decompose", detail: "Split into: vendor guidelines + approval workflow" },
    { action: "retrieve", source: "sharepoint", resultCount: 3 },
    { action: "retrieve", source: "onelake", resultCount: 1 },
    { action: "retrieve", source: "web", resultCount: 1 },
    { action: "rank", detail: "Whole-results ranking across 5 candidates" },
  ],
  sourcesConsulted: ["sharepoint", "onelake", "web"],
  totalCandidates: 23,
  returnedResults: 5,
};

export class KnowledgeBaseSearchClient {
  private endpoint: string | undefined;
  private apiKey: string | undefined;
  private kbName: string | undefined;

  constructor() {
    this.endpoint = process.env.AZURE_SEARCH_ENDPOINT;
    this.apiKey = process.env.AZURE_SEARCH_API_KEY;
    this.kbName = process.env.AZURE_SEARCH_KB_NAME;
  }

  /** Returns true if a real Azure AI Search endpoint is configured. */
  get isConfigured(): boolean {
    return !!(this.endpoint && this.apiKey && this.kbName);
  }

  /**
   * Retrieve documents from the knowledge base.
   * Falls back to stub data when no endpoint is configured.
   */
  async retrieve(options: RetrieveOptions): Promise<{ results: KBRetrieveResult[]; queryPlan: QueryPlan }> {
    if (!this.isConfigured) {
      return this.stubRetrieve(options);
    }
    return this.liveRetrieve(options);
  }

  private async stubRetrieve(options: RetrieveOptions): Promise<{ results: KBRetrieveResult[]; queryPlan: QueryPlan }> {
    const topK = options.topK ?? 10;
    let results = [...STUB_RESULTS];

    // Filter by source types if specified
    if (options.sources?.length) {
      results = results.filter(r => options.sources!.includes(r.sourceType));
    }

    return {
      results: results.slice(0, topK),
      queryPlan: {
        ...STUB_QUERY_PLAN,
        steps: [
          { action: "decompose", detail: `Analyzed query: "${options.query}"` },
          ...STUB_QUERY_PLAN.steps.slice(1),
        ],
        returnedResults: Math.min(results.length, topK),
      },
    };
  }

  private async liveRetrieve(options: RetrieveOptions): Promise<{ results: KBRetrieveResult[]; queryPlan: QueryPlan }> {
    const url = `${this.endpoint}/knowledgebases/${this.kbName}/retrieve?api-version=${API_VERSION}`;

    const body: Record<string, unknown> = {
      search: options.query,
      top: options.topK ?? 10,
    };

    if (options.sources?.length) {
      body.sources = options.sources;
    }
    if (options.filters) {
      body.filter = options.filters;
    }

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": this.apiKey!,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Azure AI Search KB API error (${response.status}): ${errorText}`);
    }

    const data = await response.json() as any;

    const results: KBRetrieveResult[] = (data.value ?? data.results ?? []).map((item: any) => ({
      id: item.id ?? item.chunkId ?? crypto.randomUUID(),
      content: item.content ?? item.text ?? "",
      title: item.title ?? item.documentTitle ?? "Untitled",
      documentUrl: item.documentUrl ?? item.url ?? "",
      sourceType: item.sourceType ?? "sharepoint",
      pageNumber: item.pageNumber ?? 1,
      totalPages: item.totalPages ?? 1,
      chunkOffsets: item.chunkOffsets ?? { start: 0, end: (item.content ?? "").length },
      relevanceScore: item.relevanceScore ?? item["@search.score"] ?? 0,
      lastModified: item.lastModified ?? new Date().toISOString(),
      purviewLabels: item.purviewLabels ?? [],
      sourceGroup: item.sourceGroup ?? "",
    }));

    const queryPlan: QueryPlan = data.queryPlan ?? {
      steps: [{ action: "retrieve", detail: `Search for: "${options.query}"` }],
      sourcesConsulted: [...new Set(results.map(r => r.sourceType))],
      totalCandidates: data["@odata.count"] ?? results.length,
      returnedResults: results.length,
    };

    return { results, queryPlan };
  }
}
