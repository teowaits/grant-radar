import { useState } from "react";
import { C, ghostBtn, RECENCY_OPTIONS, DEFAULT_RECENCY } from "../constants.js";
import { Spinner, ProgressBar } from "./shared.jsx";
import TopicDisambiguator from "./TopicDisambiguator.jsx";

export default function SearchPanel({ onSearch, onCancel, loading, progress, errors, filterState, onFilterChange }) {
  const [keywords, setKeywords] = useState("");
  const [topicIds, setTopicIds] = useState([]);

  const handleRun = () => {
    if (!keywords.trim()) return;
    onSearch({ keywords: keywords.trim(), topicIds });
  };

  const handleKeyDown = e => {
    if (e.key === "Enter" && !loading) handleRun();
  };

  const oaProgress = progress.openalex;
  const airProgress = progress.openaire;
  const anyProgress = oaProgress.total > 0 || airProgress.total > 0;

  return (
    <div style={{ padding: "24px 28px", maxWidth: 900, margin: "0 auto" }}>
      {/* Keyword input */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", fontSize: 10, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>
          Research area / keywords
        </label>
        <div style={{ fontSize: 10, color: C.textMuted, marginBottom: 8, lineHeight: 1.6 }}>
          Multiple words are searched with <span style={{ color: C.textSecondary }}>OR</span> by default
          (any word matches). Use <span style={{ color: C.textSecondary }}>AND</span> to require all words.
          Wrap phrases in <span style={{ color: C.textSecondary }}>"quotes"</span> for verbatim search
          — e.g. <span style={{ fontStyle: "italic", color: C.textMuted }}>"self-driving laboratory"</span>
          {" "}or <span style={{ fontStyle: "italic", color: C.textMuted }}>"autonomous discovery" AND materials</span>.
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <input
            value={keywords}
            onChange={e => setKeywords(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
            placeholder="e.g. self-driving laboratory, autonomous discovery"
            style={{
              flex: 1, padding: "10px 14px", borderRadius: 8,
              border: `1px solid ${C.border2}`, background: C.surface,
              color: C.textPrimary, fontSize: 13, fontFamily: "inherit", outline: "none",
              opacity: loading ? 0.6 : 1,
            }}
          />
          <button
            onClick={loading ? onCancel : handleRun}
            disabled={!loading && !keywords.trim()}
            style={{
              padding: "10px 24px", borderRadius: 8, border: "none",
              fontWeight: 600, fontSize: 13, cursor: "pointer",
              background: loading ? "#742a2a" : keywords.trim() ? "#2b6cb0" : C.surface2,
              color: (loading || keywords.trim()) ? "#fff" : C.textMuted,
              transition: "background 0.2s", letterSpacing: "0.04em",
              fontFamily: "inherit",
            }}
          >
            {loading ? "Cancel" : "Search"}
          </button>
        </div>
      </div>

      {/* Topic disambiguator (collapsed by default) */}
      <TopicDisambiguator
        selectedTopics={topicIds}
        onTopicsChange={setTopicIds}
        disabled={loading}
      />

      {/* Filters */}
      <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginTop: 16 }}>
        <FilterGroup label="Recency window">
          {RECENCY_OPTIONS.map(m => (
            <FilterChip
              key={m}
              label={`${m}mo`}
              active={filterState.recencyMonths === m}
              onClick={() => onFilterChange({ recencyMonths: m })}
            />
          ))}
        </FilterGroup>

        <FilterGroup label="Status">
          {[
            { key: "both", label: "Both" },
            { key: "active", label: "Active" },
            { key: "recently_ended", label: "Recently ended" },
          ].map(({ key, label }) => (
            <FilterChip
              key={key}
              label={label}
              active={filterState.active === key}
              onClick={() => onFilterChange({ active: key })}
            />
          ))}
        </FilterGroup>

        <FilterGroup label="Source">
          {[
            { key: "openalex", label: "OpenAlex" },
            { key: "openaire", label: "OpenAIRE" },
          ].map(({ key, label }) => {
            const active = filterState.sources.includes(key);
            return (
              <FilterChip
                key={key}
                label={label}
                active={active}
                onClick={() => {
                  const next = active
                    ? filterState.sources.filter(s => s !== key)
                    : [...filterState.sources, key];
                  if (next.length > 0) onFilterChange({ sources: next });
                }}
              />
            );
          })}
        </FilterGroup>
      </div>

      {/* Progress */}
      {loading && (
        <div style={{
          background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10,
          padding: "14px 18px", marginTop: 20, animation: "fadeIn 0.3s ease",
        }}>
          <div style={{ display: "flex", gap: 24, marginBottom: 10 }}>
            <SourceProgress label="OpenAlex" progress={oaProgress} color={C.blue} />
            <SourceProgress label="OpenAIRE" progress={airProgress} color={C.amber} />
          </div>
          <div style={{ fontSize: 11, color: C.textMuted, display: "flex", alignItems: "center", gap: 8 }}>
            <Spinner size={11} color={C.textMuted} />
            Searching both sources in parallel…
          </div>
        </div>
      )}

      {/* Errors */}
      {errors.length > 0 && (
        <div style={{ marginTop: 12 }}>
          {errors.map((e, i) => (
            <div key={i} style={{
              padding: "8px 14px", borderRadius: 6, marginBottom: 6,
              background: `${C.red}11`, border: `1px solid ${C.red}33`,
              fontSize: 11, color: C.red,
            }}>
              {e.source}: {e.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SourceProgress({ label, progress, color }) {
  return (
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 10, color, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 5 }}>
        {label} · {progress.total > 0 ? `${progress.loaded.toLocaleString()} / ${progress.total.toLocaleString()}` : "connecting…"}
      </div>
      <ProgressBar value={progress.loaded} max={progress.total || 1} color={color} />
    </div>
  );
}

function FilterGroup({ label, children }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {children}
      </div>
    </div>
  );
}

function FilterChip({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding: "4px 12px", borderRadius: 5, cursor: "pointer", fontSize: 11,
      border: `1px solid ${active ? C.border2 : C.border}`,
      background: active ? C.surface2 : "transparent",
      color: active ? C.textPrimary : C.textMuted,
      transition: "all 0.15s", fontFamily: "inherit",
    }}>
      {label}
    </button>
  );
}
