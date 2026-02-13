import React from "react";

/** Source type color map. */
const SOURCE_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  sharepoint: { bg: "#dcfce7", text: "#166534", label: "SharePoint" },
  onelake: { bg: "#dbeafe", text: "#1e40af", label: "OneLake" },
  web: { bg: "#ffedd5", text: "#9a3412", label: "Web" },
  fabric: { bg: "#f3e8ff", text: "#6b21a8", label: "Fabric" },
  mcp: { bg: "#ccfbf1", text: "#115e59", label: "MCP" },
};

interface SourceBadgeProps {
  sourceType: string;
}

export function SourceBadge({ sourceType }: SourceBadgeProps) {
  const colors = SOURCE_COLORS[sourceType] ?? { bg: "#f3f4f6", text: "#374151", label: sourceType };
  return (
    <span
      className="source-badge"
      style={{
        backgroundColor: colors.bg,
        color: colors.text,
      }}
    >
      {colors.label}
    </span>
  );
}
