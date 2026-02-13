import React, { useState } from "react";
import { EvidenceCard } from "./EvidenceCard.js";
import { FilterPanel } from "./FilterPanel.js";
import type { KBRetrieveResult } from "../types.js";

type SortField = "relevance" | "date" | "source";

interface EvidenceBoardProps {
  results: KBRetrieveResult[];
  pinnedIds: string[];
  isFullscreen: boolean;
  onCardClick: (result: KBRetrieveResult) => void;
  onPin: (id: string) => void;
  onExpandClick: () => void;
  onFilter?: (sourceTypes: string[], minRelevance?: number) => void;
}

function sortResults(results: KBRetrieveResult[], field: SortField): KBRetrieveResult[] {
  const sorted = [...results];
  switch (field) {
    case "relevance":
      return sorted.sort((a, b) => b.relevanceScore - a.relevanceScore);
    case "date":
      return sorted.sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime());
    case "source":
      return sorted.sort((a, b) => a.sourceType.localeCompare(b.sourceType));
    default:
      return sorted;
  }
}

export function EvidenceBoard({
  results,
  pinnedIds,
  isFullscreen,
  onCardClick,
  onPin,
  onExpandClick,
  onFilter,
}: EvidenceBoardProps) {
  const [sortBy, setSortBy] = useState<SortField>("relevance");

  if (results.length === 0) {
    return (
      <div className="evidence-board empty-state">
        <div className="empty-icon">🔍</div>
        <p className="empty-title">No matching documents found</p>
        <p className="empty-hint">Try refining your query or adding more sources to your knowledge base.</p>
      </div>
    );
  }

  const pinnedResults = results.filter(r => pinnedIds.includes(r.id));
  const unpinnedResults = results.filter(r => !pinnedIds.includes(r.id));
  const sorted = sortResults(unpinnedResults, sortBy);

  // Inline mode: show top 3
  const displayResults = isFullscreen ? sorted : sorted.slice(0, 3);

  return (
    <div className={`evidence-board ${isFullscreen ? "fullscreen" : "inline"}`}>
      {/* Pinned section */}
      {pinnedResults.length > 0 && (
        <div className="pinned-section">
          <h3 className="section-label">Pinned Evidence</h3>
          {pinnedResults.map(r => (
            <EvidenceCard
              key={r.id}
              id={r.id}
              title={r.title}
              content={r.content}
              sourceType={r.sourceType}
              relevanceScore={r.relevanceScore}
              pageNumber={r.pageNumber}
              totalPages={r.totalPages}
              documentUrl={r.documentUrl}
              isPinned={true}
              onClick={() => onCardClick(r)}
              onPin={() => onPin(r.id)}
            />
          ))}
        </div>
      )}

      {/* Sort controls (fullscreen only) */}
      {isFullscreen && (
        <div className="board-controls">
          <div className="sort-controls">
            <span className="sort-label">Sort by:</span>
            {(["relevance", "date", "source"] as SortField[]).map(field => (
              <button
                key={field}
                className={`sort-button ${sortBy === field ? "active" : ""}`}
                onClick={() => setSortBy(field)}
              >
                {field.charAt(0).toUpperCase() + field.slice(1)}
              </button>
            ))}
          </div>
          {onFilter && <FilterPanel results={results} onFilter={onFilter} />}
        </div>
      )}

      {/* Results */}
      <div className="results-section">
        {displayResults.map((r, i) => (
          <EvidenceCard
            key={r.id}
            id={r.id}
            title={r.title}
            content={r.content}
            sourceType={r.sourceType}
            relevanceScore={r.relevanceScore}
            pageNumber={r.pageNumber}
            totalPages={r.totalPages}
            documentUrl={r.documentUrl}
            isNew={pinnedIds.length > 0}
            onClick={() => onCardClick(r)}
            onPin={() => onPin(r.id)}
          />
        ))}
      </div>

      {/* "See all" link (inline only) */}
      {!isFullscreen && results.length > 3 && (
        <button className="see-all-link" onClick={onExpandClick}>
          See all {results.length} results →
        </button>
      )}
    </div>
  );
}
