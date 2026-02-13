import React from "react";
import { SourceBadge } from "./SourceBadge.js";

interface MetadataSidebarProps {
  title: string;
  relevanceScore: number;
  pageNumber: number;
  totalPages: number;
  sourceType: string;
  documentUrl: string;
  lastModified: string;
  purviewLabels: string[];
  onClose: () => void;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

function getDeepLinkLabel(sourceType: string): string {
  switch (sourceType) {
    case "sharepoint": return "Open in SharePoint";
    case "onelake": return "Open in OneLake";
    case "web": return "Open in Browser";
    case "fabric": return "Open in Fabric";
    default: return "Open Source";
  }
}

export function MetadataSidebar({
  title,
  relevanceScore,
  pageNumber,
  totalPages,
  sourceType,
  documentUrl,
  lastModified,
  purviewLabels,
  onClose,
}: MetadataSidebarProps) {
  const scorePercent = Math.round(relevanceScore * 100);

  return (
    <div className="metadata-sidebar">
      <div className="sidebar-header">
        <h3 className="sidebar-title">{title}</h3>
        <button className="sidebar-close" onClick={onClose}>✕</button>
      </div>

      <div className="sidebar-content">
        <div className="meta-row">
          <span className="meta-label">Relevance</span>
          <div className="meta-value">
            <div className="relevance-bar-container sidebar-bar">
              <div className="relevance-bar" style={{ width: `${scorePercent}%` }} />
              <span className="relevance-label">{scorePercent}%</span>
            </div>
          </div>
        </div>

        <div className="meta-row">
          <span className="meta-label">Page</span>
          <span className="meta-value">{pageNumber} of {totalPages}</span>
        </div>

        <div className="meta-row">
          <span className="meta-label">Source Type</span>
          <span className="meta-value"><SourceBadge sourceType={sourceType} /></span>
        </div>

        <div className="meta-row">
          <span className="meta-label">Last Modified</span>
          <span className="meta-value">{formatDate(lastModified)}</span>
        </div>

        {purviewLabels.length > 0 && (
          <div className="meta-row">
            <span className="meta-label">Sensitivity</span>
            <div className="meta-value purview-labels">
              {purviewLabels.map(label => (
                <span key={label} className="purview-label">{label}</span>
              ))}
            </div>
          </div>
        )}

        <div className="meta-row">
          <span className="meta-label">Source URL</span>
          <span className="meta-value url-value" title={documentUrl}>
            {documentUrl.length > 50 ? documentUrl.slice(0, 50) + "…" : documentUrl}
          </span>
        </div>
      </div>

      <div className="sidebar-actions">
        <a
          href={documentUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="deep-link-button"
        >
          {getDeepLinkLabel(sourceType)} ↗
        </a>
      </div>
    </div>
  );
}
