import { SourceBadge } from "./SourceBadge.js";

interface EvidenceCardProps {
  id: string;
  title: string;
  content: string;
  sourceType: string;
  relevanceScore: number;
  pageNumber: number;
  totalPages: number;
  documentUrl: string;
  isPinned?: boolean;
  isNew?: boolean;
  onClick?: () => void;
  onPin?: () => void;
}

/** Truncate text to maxLen characters with ellipsis. */
function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen).trimEnd() + "…";
}

export function EvidenceCard({
  title,
  content,
  sourceType,
  relevanceScore,
  pageNumber,
  totalPages,
  isPinned,
  isNew,
  onClick,
  onPin,
}: EvidenceCardProps) {
  const scorePercent = Math.round(relevanceScore * 100);

  return (
    <div className={`evidence-card ${isPinned ? "pinned" : ""}`} onClick={onClick}>
      <div className="card-header">
        <span className="card-title" title={title}>{truncate(title, 60)}</span>
        <div className="card-badges">
          {isPinned && <span className="badge badge-pinned">Pinned</span>}
          {isNew && <span className="badge badge-new">New</span>}
          <SourceBadge sourceType={sourceType} />
        </div>
      </div>

      <div className="card-snippet">{truncate(content, 200)}</div>

      <div className="card-footer">
        <div className="relevance-bar-container">
          <div className="relevance-bar" style={{ width: `${scorePercent}%` }} />
          <span className="relevance-label">{scorePercent}%</span>
        </div>
        <span className="card-page">p. {pageNumber}/{totalPages}</span>
        {onPin && (
          <button
            className="pin-button"
            onClick={(e) => { e.stopPropagation(); onPin(); }}
            title={isPinned ? "Unpin" : "Pin"}
          >
            {isPinned ? "📌" : "📍"}
          </button>
        )}
      </div>
    </div>
  );
}
