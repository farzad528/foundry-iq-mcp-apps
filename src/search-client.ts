/**
 * Azure AI Search Knowledge Base API client.
 * Uses the 2025-11-01-preview API version.
 * Falls back to stub data when AZURE_SEARCH_ENDPOINT is not configured.
 */

import type { KBRetrieveResult, QueryPlan, RetrieveOptions } from "./types.js";

const API_VERSION = "2025-11-01-preview";

/**
 * Contoso Enterprise Knowledge Base — Demo Dataset
 *
 * This sample dataset simulates a realistic enterprise knowledge base spanning
 * multiple departments and source types. It allows anyone to try the MCP App
 * without needing Azure AI Search credentials.
 *
 * Topics covered: vendor management, HR policies, security, IT, finance,
 * engineering, compliance, onboarding, and product documentation.
 */
const DEMO_KB: KBRetrieveResult[] = [
  // ── Vendor & Procurement ──────────────────────────────────────────────
  {
    id: "chunk-001",
    content: "The vendor approval process requires three levels of sign-off: department head, procurement team, and legal review. All vendors must complete a compliance questionnaire and provide proof of insurance before engagement. Emergency vendor approvals may bypass the procurement team with VP-level authorization.",
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
    content: "Budget thresholds for vendor contracts: under $10K requires manager approval, $10K-$100K requires VP approval, over $100K requires C-level sign-off and board notification. All contracts over $50K must include a 30-day termination clause.",
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
    content: "All new vendor onboarding requires completion of security assessment, data processing agreement review, and SOC 2 Type II certification verification before contract execution. Vendors handling PII must additionally complete a privacy impact assessment.",
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
    content: "Industry best practices for vendor management include annual performance reviews, quarterly business reviews, and risk-based tiering of vendor relationships. Tier 1 vendors (critical services) should have dedicated relationship managers and monthly check-ins.",
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
    content: "The preferred vendor list is maintained in the procurement portal. Departments should first check this list before initiating new vendor relationships to leverage existing contracts and volume discounts. The list is updated quarterly by the procurement team.",
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

  // ── HR & People ───────────────────────────────────────────────────────
  {
    id: "chunk-006",
    content: "New employee onboarding follows a 90-day structured program. Week 1 covers IT setup, security training, and team introductions. Weeks 2-4 focus on role-specific training with a designated buddy. Months 2-3 include cross-functional shadowing and a 90-day review with the hiring manager.",
    title: "Employee_Onboarding_Guide.pdf",
    documentUrl: "https://contoso.sharepoint.com/sites/hr/Employee_Onboarding_Guide.pdf",
    sourceType: "sharepoint",
    pageNumber: 4,
    totalPages: 18,
    chunkOffsets: { start: 890, end: 1340 },
    relevanceScore: 0.91,
    lastModified: "2026-01-05T08:00:00Z",
    purviewLabels: ["Internal"],
    sourceGroup: "Human Resources",
  },
  {
    id: "chunk-007",
    content: "Contoso's remote work policy allows employees to work from home up to 3 days per week. Fully remote arrangements require VP approval and a home office safety assessment. All employees must be available during core hours (10am-3pm local time) regardless of work location.",
    title: "Remote_Work_Policy_2026.pdf",
    documentUrl: "https://contoso.sharepoint.com/sites/hr/Remote_Work_Policy_2026.pdf",
    sourceType: "sharepoint",
    pageNumber: 2,
    totalPages: 6,
    chunkOffsets: { start: 310, end: 720 },
    relevanceScore: 0.89,
    lastModified: "2026-01-10T11:00:00Z",
    purviewLabels: ["Internal"],
    sourceGroup: "Human Resources",
  },
  {
    id: "chunk-008",
    content: "The annual performance review cycle runs from January to March. Employees complete self-assessments by January 31, manager reviews by February 28, and calibration sessions in the first two weeks of March. Compensation adjustments take effect April 1.",
    title: "Performance_Review_Process.docx",
    documentUrl: "https://contoso.sharepoint.com/sites/hr/Performance_Review_Process.docx",
    sourceType: "sharepoint",
    pageNumber: 1,
    totalPages: 4,
    chunkOffsets: { start: 0, end: 420 },
    relevanceScore: 0.85,
    lastModified: "2025-12-15T09:30:00Z",
    purviewLabels: ["Internal"],
    sourceGroup: "Human Resources",
  },

  // ── Security & Compliance ─────────────────────────────────────────────
  {
    id: "chunk-009",
    content: "All employees must complete annual security awareness training by December 31 each year. The training covers phishing identification, password hygiene, data classification, and incident reporting procedures. Failure to complete training results in access suspension.",
    title: "Security_Awareness_Training_Requirements.pdf",
    documentUrl: "https://contoso-lake.dfs.core.windows.net/security/Security_Awareness_Training.pdf",
    sourceType: "onelake",
    pageNumber: 3,
    totalPages: 10,
    chunkOffsets: { start: 650, end: 1100 },
    relevanceScore: 0.92,
    lastModified: "2025-11-20T14:00:00Z",
    purviewLabels: ["Internal"],
    sourceGroup: "Security",
  },
  {
    id: "chunk-010",
    content: "Data classification at Contoso follows four levels: Public, Internal, Confidential, and Highly Confidential. All documents must be classified before sharing. Highly Confidential data requires encryption at rest and in transit, and access is limited to named individuals with business justification.",
    title: "Data_Classification_Policy.pdf",
    documentUrl: "https://contoso-lake.dfs.core.windows.net/compliance/Data_Classification_Policy.pdf",
    sourceType: "onelake",
    pageNumber: 5,
    totalPages: 15,
    chunkOffsets: { start: 1200, end: 1680 },
    relevanceScore: 0.88,
    lastModified: "2025-10-01T10:00:00Z",
    purviewLabels: ["Confidential"],
    sourceGroup: "Compliance",
  },
  {
    id: "chunk-011",
    content: "Incident response procedure: 1) Identify and contain the incident within 1 hour. 2) Notify the Security Operations Center (SOC) via the #security-incidents Slack channel. 3) Document findings in the incident tracker. 4) Complete root cause analysis within 48 hours. 5) Present lessons learned at the monthly security review.",
    title: "Incident_Response_Playbook.pdf",
    documentUrl: "https://contoso-lake.dfs.core.windows.net/security/Incident_Response_Playbook.pdf",
    sourceType: "onelake",
    pageNumber: 8,
    totalPages: 22,
    chunkOffsets: { start: 2100, end: 2580 },
    relevanceScore: 0.86,
    lastModified: "2026-01-08T16:00:00Z",
    purviewLabels: ["Confidential"],
    sourceGroup: "Security",
  },

  // ── IT & Engineering ──────────────────────────────────────────────────
  {
    id: "chunk-012",
    content: "Development teams follow a two-week sprint cycle with planning on Monday, daily standups at 9:30am, and retrospectives on the final Friday. All code changes require at least one peer review before merging to the main branch. CI/CD pipelines must pass before deployment to staging.",
    title: "Engineering_Handbook.pdf",
    documentUrl: "https://contoso.sharepoint.com/sites/engineering/Engineering_Handbook.pdf",
    sourceType: "sharepoint",
    pageNumber: 12,
    totalPages: 35,
    chunkOffsets: { start: 2800, end: 3250 },
    relevanceScore: 0.90,
    lastModified: "2026-02-01T09:00:00Z",
    purviewLabels: ["Internal"],
    sourceGroup: "Engineering",
  },
  {
    id: "chunk-013",
    content: "To request new software or hardware, submit a ticket through the IT Service Portal. Standard software requests are fulfilled within 2 business days. Hardware requests require manager approval and are fulfilled within 5 business days. Non-standard software requires security review (add 3-5 days).",
    title: "IT_Service_Catalog.pdf",
    documentUrl: "https://contoso.sharepoint.com/sites/it/IT_Service_Catalog.pdf",
    sourceType: "sharepoint",
    pageNumber: 6,
    totalPages: 20,
    chunkOffsets: { start: 1500, end: 1920 },
    relevanceScore: 0.83,
    lastModified: "2026-01-25T13:00:00Z",
    purviewLabels: ["Internal"],
    sourceGroup: "IT",
  },
  {
    id: "chunk-014",
    content: "Production deployment windows are Tuesday and Thursday, 2pm-5pm PST. Emergency hotfixes may be deployed outside these windows with on-call engineer approval. All deployments must include rollback plans and monitoring dashboards. Feature flags should be used for gradual rollouts.",
    title: "Deployment_Procedures.md",
    documentUrl: "https://contoso-lake.dfs.core.windows.net/engineering/Deployment_Procedures.md",
    sourceType: "onelake",
    pageNumber: 1,
    totalPages: 3,
    chunkOffsets: { start: 0, end: 450 },
    relevanceScore: 0.84,
    lastModified: "2026-02-05T10:30:00Z",
    purviewLabels: ["Internal"],
    sourceGroup: "Engineering",
  },

  // ── Product & Strategy ────────────────────────────────────────────────
  {
    id: "chunk-015",
    content: "Contoso's AI strategy for 2026 focuses on three pillars: (1) embedding AI assistants into all customer-facing products, (2) using AI to automate internal operations, and (3) building an AI platform for enterprise customers. The AI Center of Excellence reports to the CTO and coordinates cross-team initiatives.",
    title: "AI_Strategy_2026.pdf",
    documentUrl: "https://contoso.sharepoint.com/sites/strategy/AI_Strategy_2026.pdf",
    sourceType: "sharepoint",
    pageNumber: 2,
    totalPages: 15,
    chunkOffsets: { start: 400, end: 850 },
    relevanceScore: 0.93,
    lastModified: "2026-01-30T08:00:00Z",
    purviewLabels: ["Confidential"],
    sourceGroup: "Strategy",
  },
  {
    id: "chunk-016",
    content: "Customer feedback analysis for Q4 2025 shows that 78% of enterprise customers rated Contoso's knowledge retrieval capabilities as 'excellent' or 'good'. Key improvement areas include: faster search results (mentioned by 34% of respondents), better document preview (28%), and more granular access controls (22%).",
    title: "Q4_2025_Customer_Feedback_Report.pdf",
    documentUrl: "https://contoso.sharepoint.com/sites/product/Q4_Customer_Feedback.pdf",
    sourceType: "sharepoint",
    pageNumber: 8,
    totalPages: 24,
    chunkOffsets: { start: 1900, end: 2350 },
    relevanceScore: 0.79,
    lastModified: "2026-01-18T11:00:00Z",
    purviewLabels: ["Confidential"],
    sourceGroup: "Product",
  },

  // ── Finance & Travel ──────────────────────────────────────────────────
  {
    id: "chunk-017",
    content: "Travel expense policy: domestic flights must be booked economy class. International flights over 6 hours may be booked in business class with director approval. Hotel stays are capped at $250/night for domestic and $350/night for international. All expenses must be submitted within 30 days of travel completion.",
    title: "Travel_Expense_Policy_2026.pdf",
    documentUrl: "https://contoso.sharepoint.com/sites/finance/Travel_Expense_Policy.pdf",
    sourceType: "sharepoint",
    pageNumber: 4,
    totalPages: 10,
    chunkOffsets: { start: 950, end: 1400 },
    relevanceScore: 0.88,
    lastModified: "2026-01-02T09:00:00Z",
    purviewLabels: ["Internal"],
    sourceGroup: "Finance",
  },
  {
    id: "chunk-018",
    content: "According to McKinsey's 2025 report on enterprise AI adoption, organizations that implement structured knowledge management systems see a 40% improvement in employee productivity and a 25% reduction in time spent searching for information. The most effective systems combine semantic search with document-level access controls.",
    title: "Enterprise AI Adoption Trends - McKinsey 2025",
    documentUrl: "https://www.mckinsey.com/capabilities/quantumblack/our-insights/enterprise-ai-2025",
    sourceType: "web",
    pageNumber: 1,
    totalPages: 1,
    chunkOffsets: { start: 0, end: 460 },
    relevanceScore: 0.74,
    lastModified: "2025-09-15T00:00:00Z",
    purviewLabels: [],
    sourceGroup: "External Research",
  },

  // ── Benefits & Wellness ───────────────────────────────────────────────
  {
    id: "chunk-019",
    content: "Contoso offers comprehensive health benefits including medical, dental, and vision insurance. Employees are eligible for benefits starting on their first day. The company covers 85% of premiums for employees and 70% for dependents. Open enrollment occurs annually in November.",
    title: "Benefits_Summary_2026.pdf",
    documentUrl: "https://contoso.sharepoint.com/sites/hr/Benefits_Summary_2026.pdf",
    sourceType: "sharepoint",
    pageNumber: 2,
    totalPages: 16,
    chunkOffsets: { start: 300, end: 700 },
    relevanceScore: 0.90,
    lastModified: "2025-11-15T08:00:00Z",
    purviewLabels: ["Internal"],
    sourceGroup: "Human Resources",
  },
  {
    id: "chunk-020",
    content: "The company's PTO policy provides 20 days of paid time off per year for all full-time employees, plus 10 company holidays. PTO accrues at 1.67 days per month and can be carried over up to 5 days into the next calendar year. Employees with 5+ years tenure receive an additional 5 PTO days.",
    title: "PTO_Policy_2026.pdf",
    documentUrl: "https://contoso.sharepoint.com/sites/hr/PTO_Policy_2026.pdf",
    sourceType: "sharepoint",
    pageNumber: 1,
    totalPages: 3,
    chunkOffsets: { start: 0, end: 380 },
    relevanceScore: 0.87,
    lastModified: "2025-12-20T10:00:00Z",
    purviewLabels: ["Internal"],
    sourceGroup: "Human Resources",
  },
];

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
    const queryLower = options.query.toLowerCase();
    const queryTerms = queryLower.split(/\s+/).filter(t => t.length > 2);

    // Score each document by keyword overlap with the query
    let scored = DEMO_KB.map(doc => {
      const textLower = `${doc.title} ${doc.content} ${doc.sourceGroup}`.toLowerCase();
      let matchScore = 0;
      for (const term of queryTerms) {
        if (textLower.includes(term)) matchScore++;
      }
      // Blend keyword score with the document's built-in relevance
      const combinedScore = queryTerms.length > 0
        ? Math.min(0.99, doc.relevanceScore * 0.4 + (matchScore / queryTerms.length) * 0.6)
        : doc.relevanceScore;
      return { ...doc, relevanceScore: Math.round(combinedScore * 100) / 100 };
    });

    // Filter by source types if specified
    if (options.sources?.length) {
      scored = scored.filter(r => options.sources!.includes(r.sourceType));
    }

    // Sort by combined relevance, take top K
    scored.sort((a, b) => b.relevanceScore - a.relevanceScore);
    const results = scored.slice(0, topK);

    const sourcesUsed = [...new Set(results.map(r => r.sourceType))];
    const queryPlan: QueryPlan = {
      steps: [
        { action: "decompose", detail: `Analyzed query: "${options.query}"` },
        ...sourcesUsed.map(s => ({
          action: "retrieve" as const,
          source: s,
          resultCount: results.filter(r => r.sourceType === s).length,
        })),
        { action: "rank", detail: `Semantic ranking across ${results.length} candidates` },
      ],
      sourcesConsulted: sourcesUsed,
      totalCandidates: DEMO_KB.length,
      returnedResults: results.length,
    };

    return { results, queryPlan };
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
