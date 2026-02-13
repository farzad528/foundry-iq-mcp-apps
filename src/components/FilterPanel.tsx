import React, { useState } from "react";

interface FilterPanelProps {
  results: { sourceType: string; relevanceScore: number }[];
  onFilter: (sourceTypes: string[], minRelevance?: number) => void;
}

const ALL_SOURCE_TYPES = [
  { value: "sharepoint", label: "SharePoint" },
  { value: "onelake", label: "OneLake" },
  { value: "web", label: "Web" },
  { value: "fabric", label: "Fabric" },
  { value: "mcp", label: "MCP" },
];

export function FilterPanel({ results, onFilter }: FilterPanelProps) {
  const availableTypes = [...new Set(results.map(r => r.sourceType))];
  const [selectedTypes, setSelectedTypes] = useState<string[]>(availableTypes);
  const [minRelevance, setMinRelevance] = useState(0);

  const handleTypeToggle = (type: string) => {
    const next = selectedTypes.includes(type)
      ? selectedTypes.filter(t => t !== type)
      : [...selectedTypes, type];
    setSelectedTypes(next);
    onFilter(next, minRelevance || undefined);
  };

  const handleRelevanceChange = (value: number) => {
    setMinRelevance(value);
    onFilter(selectedTypes, value || undefined);
  };

  const handleReset = () => {
    setSelectedTypes(availableTypes);
    setMinRelevance(0);
    onFilter(availableTypes, undefined);
  };

  return (
    <div className="filter-panel">
      <div className="filter-section">
        <span className="filter-label">Sources:</span>
        <div className="filter-chips">
          {ALL_SOURCE_TYPES.filter(t => availableTypes.includes(t.value)).map(t => (
            <label key={t.value} className={`filter-chip ${selectedTypes.includes(t.value) ? "active" : ""}`}>
              <input
                type="checkbox"
                checked={selectedTypes.includes(t.value)}
                onChange={() => handleTypeToggle(t.value)}
              />
              {t.label}
            </label>
          ))}
        </div>
      </div>

      <div className="filter-section">
        <span className="filter-label">Min relevance: {Math.round(minRelevance * 100)}%</span>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={minRelevance}
          onChange={(e) => handleRelevanceChange(parseFloat(e.target.value))}
          className="relevance-slider"
        />
      </div>

      <button className="filter-reset" onClick={handleReset}>Reset</button>
    </div>
  );
}
