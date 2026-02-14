/**
 * Foundry IQ Knowledge Base — MCP App Widget
 *
 * Main React entry point rendered inside the MCP host iframe.
 * Uses the @modelcontextprotocol/ext-apps SDK (same pattern as excalidraw-mcp).
 */

import { useApp } from "@modelcontextprotocol/ext-apps/react";
import type { App } from "@modelcontextprotocol/ext-apps";
import { useCallback, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { DocumentViewer } from "./components/DocumentViewer.js";
import { EvidenceBoard } from "./components/EvidenceBoard.js";
import { MetadataSidebar } from "./components/MetadataSidebar.js";
import type { KBRetrieveResult } from "./types.js";
import "./global.css";

function KBApp() {
  const appRef = useRef<App | null>(null);

  const [results, setResults] = useState<KBRetrieveResult[]>([]);
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);
  const [checkpointId, setCheckpointId] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedResult, setSelectedResult] = useState<KBRetrieveResult | null>(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const [loading, setLoading] = useState(true);

  const { error: sdkError } = useApp({
    appInfo: { name: "Foundry IQ Knowledge Base", version: "0.1.0" },
    capabilities: {},
    onAppCreated: (app: App) => {
      appRef.current = app;

      app.onhostcontextchanged = (ctx: any) => {
        if (ctx.displayMode) {
          setIsFullscreen(ctx.displayMode === "fullscreen");
        }
      };

      app.ontoolinputpartial = async (_input: any) => {
        // Tool input contains the query arguments, not results.
        // Results arrive via ontoolresult. Show loading state.
        setLoading(true);
      };

      app.ontoolinput = async (_input: any) => {
        // Tool input finalized — results will arrive via ontoolresult
        setLoading(true);
      };

      app.ontoolresult = (result: any) => {
        // structuredContent contains { results, queryPlan, checkpointId }
        const sc = result.structuredContent as any;
        if (sc?.results) {
          setResults(sc.results);
          setLoading(false);
        }
        if (sc?.checkpointId) {
          setCheckpointId(sc.checkpointId);
        }

        // Also check content text fallback (for hosts that don't send structuredContent)
        if (!sc?.results && result.content) {
          try {
            const text = result.content.find((c: any) => c.type === "text")?.text;
            if (text) {
              // Results came as text — just stop loading
              setLoading(false);
            }
          } catch {
            setLoading(false);
          }
        }
      };

      app.onerror = (err: any) => console.error("[FoundryIQ] Error:", err);
    },
  });

  const handleCardClick = useCallback((result: KBRetrieveResult) => {
    setSelectedResult(result);
    setShowSidebar(true);
  }, []);

  const handlePin = useCallback(async (cardId: string) => {
    setPinnedIds(prev => {
      const isPinned = prev.includes(cardId);
      const newPinned = isPinned ? prev.filter(id => id !== cardId) : [...prev, cardId];

      if (checkpointId && appRef.current) {
        appRef.current.callServerTool({
          name: "pin_evidence",
          arguments: { checkpointId, cardIds: newPinned },
        }).catch(() => {});
      }

      return newPinned;
    });
  }, [checkpointId]);

  const handleFilter = useCallback(async (sourceTypes: string[], minRelevance?: number) => {
    if (!checkpointId || !appRef.current) return;
    try {
      const result = await appRef.current.callServerTool({
        name: "filter_sources",
        arguments: { checkpointId, sourceTypes, minRelevance },
      });
      const text = (result.content[0] as any)?.text;
      if (text) {
        const data = JSON.parse(text);
        if (data.results) setResults(data.results);
      }
    } catch {
      // Filter failed — keep current results
    }
  }, [checkpointId]);

  const handleExpand = useCallback(async () => {
    if (!appRef.current) return;
    try {
      await appRef.current.requestDisplayMode({ mode: "fullscreen" });
      setIsFullscreen(true);
    } catch {
      // Display mode not supported
    }
  }, []);

  const handleCloseViewer = useCallback(() => {
    setSelectedResult(null);
    setShowSidebar(false);
  }, []);

  const displayError = sdkError ? String(sdkError) : null;

  if (displayError) {
    return (
      <div className="kb-app error-state">
        <p className="error-message">Unable to retrieve results</p>
        <p className="error-detail">{displayError}</p>
      </div>
    );
  }

  if (loading && results.length === 0) {
    return (
      <div className="kb-app loading-state">
        <div className="skeleton-cards">
          {[1, 2, 3].map(n => (
            <div key={n} className="skeleton-card">
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
    <div className={`kb-app ${isFullscreen ? "fullscreen-mode" : "inline-mode"}`}>
      <div className="kb-main">
        <EvidenceBoard
          results={results}
          pinnedIds={pinnedIds}
          isFullscreen={isFullscreen}
          onCardClick={handleCardClick}
          onPin={handlePin}
          onExpandClick={handleExpand}
          onFilter={handleFilter}
        />
      </div>

      {selectedResult && (
        <div className="kb-detail-panel">
          <DocumentViewer
            documentUrl={selectedResult.documentUrl}
            pageNumber={selectedResult.pageNumber}
            totalPages={selectedResult.totalPages}
            highlightOffsets={selectedResult.chunkOffsets}
            onClose={handleCloseViewer}
          />
          {showSidebar && (
            <MetadataSidebar
              title={selectedResult.title}
              relevanceScore={selectedResult.relevanceScore}
              pageNumber={selectedResult.pageNumber}
              totalPages={selectedResult.totalPages}
              sourceType={selectedResult.sourceType}
              documentUrl={selectedResult.documentUrl}
              lastModified={selectedResult.lastModified}
              purviewLabels={selectedResult.purviewLabels}
              onClose={() => setShowSidebar(false)}
            />
          )}
        </div>
      )}

      {!isFullscreen && results.length > 0 && (
        <button className="fullscreen-toggle" onClick={handleExpand} title="Fullscreen">
          ⛶
        </button>
      )}
    </div>
  );
}

const root = document.createElement("div");
root.id = "kb-root";
document.body.appendChild(root);
createRoot(root).render(<KBApp />);
