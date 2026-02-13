import React, { useEffect, useRef, useState } from "react";

interface DocumentViewerProps {
  documentUrl: string;
  pageNumber: number;
  totalPages: number;
  highlightOffsets?: { start: number; end: number };
  onClose: () => void;
  onNavigate?: (page: number) => void;
}

export function DocumentViewer({
  documentUrl,
  pageNumber,
  totalPages,
  highlightOffsets,
  onClose,
  onNavigate,
}: DocumentViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentPage, setCurrentPage] = useState(pageNumber);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isPdf = documentUrl.toLowerCase().endsWith(".pdf");

  useEffect(() => {
    setCurrentPage(pageNumber);
  }, [pageNumber]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      onNavigate?.(newPage);
    }
  };

  return (
    <div className="document-viewer">
      <div className="viewer-toolbar">
        <button className="viewer-close" onClick={onClose} title="Close viewer">✕</button>
        <span className="viewer-title">{documentUrl.split("/").pop()}</span>
        <div className="page-nav">
          <button
            className="page-nav-btn"
            disabled={currentPage <= 1}
            onClick={() => handlePageChange(currentPage - 1)}
          >
            ◀
          </button>
          <span className="page-indicator">
            Page {currentPage} of {totalPages}
          </span>
          <button
            className="page-nav-btn"
            disabled={currentPage >= totalPages}
            onClick={() => handlePageChange(currentPage + 1)}
          >
            ▶
          </button>
        </div>
      </div>

      <div className="viewer-content" ref={containerRef}>
        {loading && (
          <div className="viewer-loading">
            <div className="loading-spinner" />
            <span>Loading document…</span>
          </div>
        )}

        {error && (
          <div className="viewer-error">
            <p>Unable to preview this document.</p>
            <a href={documentUrl} target="_blank" rel="noopener noreferrer" className="open-external">
              Open in browser →
            </a>
          </div>
        )}

        {isPdf ? (
          <iframe
            src={`${documentUrl}#page=${currentPage}`}
            className="pdf-frame"
            onLoad={() => setLoading(false)}
            onError={() => { setLoading(false); setError("Failed to load PDF"); }}
            title="Document preview"
          />
        ) : (
          <div className="document-placeholder">
            <p>Preview not available for this file type.</p>
            <a href={documentUrl} target="_blank" rel="noopener noreferrer" className="open-external">
              Open original document →
            </a>
            {!loading && setLoading(false) as any}
          </div>
        )}

        {highlightOffsets && (
          <div className="highlight-overlay" data-start={highlightOffsets.start} data-end={highlightOffsets.end} />
        )}
      </div>
    </div>
  );
}
