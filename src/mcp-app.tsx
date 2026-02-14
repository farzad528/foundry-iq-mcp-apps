/**
 * Foundry IQ Knowledge Base — MCP App Widget
 *
 * Main React entry point rendered inside the MCP host iframe.
 * Handles streaming tool results, checkpoint restore, display mode switching,
 * and interactive evidence exploration.
 */

import { useApp } from "@modelcontextprotocol/ext-apps/react";
import { useCallback, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { DocumentViewer } from "./components/DocumentViewer.js";
import { EvidenceBoard } from "./components/EvidenceBoard.js";
import { MetadataSidebar } from "./components/MetadataSidebar.js";
import type { KBRetrieveResult } from "./types.js";
import "./global.css";

interface AppState {
  results: KBRetrieveResult[];
  pinnedIds: string[];
  checkpointId: string | null;
  isFullscreen: boolean;
  selectedResult: KBRetrieveResult | null;
  showSidebar: boolean;
  error: string | null;
  loading: boolean;
}

function KBApp() {
  const app = useApp();
  const [state, setState] = useState<AppState>({
    results: [],
    pinnedIds: [],
    checkpointId: null,
    isFullscreen: false,
    selectedResult: null,
    showSidebar: false,
    error: null,
    loading: true,
  });

  // Initialize MCP App SDK events
  useEffect(() => {
    if (!app) return;

    // Handle streaming partial tool input
    app.on("toolinputpartial", (params: any) => {
      try {
        const data = typeof params === "string" ? JSON.parse(params) : params;
        if (data?.results) {
          setState(prev => ({
            ...prev,
            results: data.results,
            loading: false,
          }));
        }
      } catch {
        // Partial JSON — ignore until parseable
      }
    });

    // Handle final tool input
    app.on("toolinput", (params: any) => {
      try {
        const data = typeof params === "string" ? JSON.parse(params) : params;
        if (data?.results) {
          setState(prev => ({
            ...prev,
            results: data.results,
            checkpointId: data.checkpointId ?? null,
            loading: false,
          }));

          // Restore checkpoint if present
          if (data.checkpointId) {
            restoreCheckpoint(data.checkpointId);
          }
        }
      } catch (e) {
        setState(prev => ({
          ...prev,
          error: `Failed to parse results: ${(e as Error).message}`,
          loading: false,
        }));
      }
    });
  }, [app]);

  // Restore checkpoint to get pinned cards
  const restoreCheckpoint = useCallback(async (checkpointId: string) => {
    if (!app) return;
    try {
      const result = await app.callServerTool("read_checkpoint", { id: checkpointId });
      if (result?.content?.[0]?.text) {
        const data = JSON.parse(result.content[0].text);
        if (data.pinnedCardIds?.length) {
          setState(prev => ({ ...prev, pinnedIds: data.pinnedCardIds }));
        }
      }
    } catch {
      // Checkpoint not found — that's ok
    }
  }, [app]);

  // Handle card click → open document viewer + sidebar
  const handleCardClick = useCallback((result: KBRetrieveResult) => {
    setState(prev => ({
      ...prev,
      selectedResult: result,
      showSidebar: true,
    }));
  }, []);

  // Handle pin toggle
  const handlePin = useCallback(async (cardId: string) => {
    setState(prev => {
      const isPinned = prev.pinnedIds.includes(cardId);
      const newPinned = isPinned
        ? prev.pinnedIds.filter(id => id !== cardId)
        : [...prev.pinnedIds, cardId];

      // Save to server
      if (prev.checkpointId && app) {
        app.callServerTool("pin_evidence", {
          checkpointId: prev.checkpointId,
          cardIds: newPinned,
        }).catch(() => {});
      }

      return { ...prev, pinnedIds: newPinned };
    });
  }, [app]);

  // Handle filter
  const handleFilter = useCallback(async (sourceTypes: string[], minRelevance?: number) => {
    if (!state.checkpointId || !app) return;
    try {
      const result = await app.callServerTool("filter_sources", {
        checkpointId: state.checkpointId,
        sourceTypes,
        minRelevance,
      });
      if (result?.content?.[0]?.text) {
        const data = JSON.parse(result.content[0].text);
        if (data.results) {
          setState(prev => ({ ...prev, results: data.results }));
        }
      }
    } catch {
      // Filter failed — keep current results
    }
  }, [app, state.checkpointId]);

  // Handle fullscreen toggle
  const handleExpand = useCallback(() => {
    setState(prev => ({ ...prev, isFullscreen: true }));
    app?.requestDisplayMode?.({ mode: "fullscreen" });
  }, [app]);

  // Close document viewer
  const handleCloseViewer = useCallback(() => {
    setState(prev => ({ ...prev, selectedResult: null, showSidebar: false }));
  }, []);

  // Error state
  if (state.error) {
    return (
      <div className="kb-app error-state">
        <p className="error-message">Unable to retrieve results</p>
        <p className="error-detail">{state.error}</p>
      </div>
    );
  }

  // Loading state
  if (state.loading && state.results.length === 0) {
    return (
      <div className="kb-app loading-state">
        <div className="skeleton-cards">
          {[1, 2, 3].map(i => (
            <div key={i} className="skeleton-card">
              <div className="skeleton-line title" />
              <div className="skeleton-line content" />
              <div className="skeleton-line content short" />
              <div className="skeleton-line bar" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`kb-app ${state.isFullscreen ? "fullscreen-mode" : "inline-mode"}`}>
      <div className="kb-main">
        <EvidenceBoard
          results={state.results}
          pinnedIds={state.pinnedIds}
          isFullscreen={state.isFullscreen}
          onCardClick={handleCardClick}
          onPin={handlePin}
          onExpandClick={handleExpand}
          onFilter={handleFilter}
        />
      </div>

      {/* Document Viewer + Metadata Sidebar */}
      {state.selectedResult && (
        <div className="kb-detail-panel">
          <DocumentViewer
            documentUrl={state.selectedResult.documentUrl}
            pageNumber={state.selectedResult.pageNumber}
            totalPages={state.selectedResult.totalPages}
            highlightOffsets={state.selectedResult.chunkOffsets}
            onClose={handleCloseViewer}
          />
          {state.showSidebar && (
            <MetadataSidebar
              title={state.selectedResult.title}
              relevanceScore={state.selectedResult.relevanceScore}
              pageNumber={state.selectedResult.pageNumber}
              totalPages={state.selectedResult.totalPages}
              sourceType={state.selectedResult.sourceType}
              documentUrl={state.selectedResult.documentUrl}
              lastModified={state.selectedResult.lastModified}
              purviewLabels={state.selectedResult.purviewLabels}
              onClose={() => setState(prev => ({ ...prev, showSidebar: false }))}
            />
          )}
        </div>
      )}

      {/* Fullscreen toggle */}
      {!state.isFullscreen && state.results.length > 0 && (
        <button className="fullscreen-toggle" onClick={handleExpand} title="Fullscreen">
          ⛶
        </button>
      )}
    </div>
  );
}

// Mount the app
const root = document.createElement("div");
root.id = "kb-root";
document.body.appendChild(root);
createRoot(root).render(<KBApp />);
