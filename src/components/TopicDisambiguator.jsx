import { useState, useRef, useCallback } from "react";
import { C, ghostBtn } from "../constants.js";
import { OPENALEX_BASE, MAILTO } from "../api/config.js";
import { Spinner } from "./shared.jsx";

const DEBOUNCE_MS = 350;

export default function TopicDisambiguator({ selectedTopics, onTopicsChange, disabled }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef(null);

  const search = useCallback((q) => {
    clearTimeout(debounceRef.current);
    if (!q.trim()) { setResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const url = new URL(`${OPENALEX_BASE}/topics`);
        url.searchParams.set("search", q);
        url.searchParams.set("per_page", "8");
        url.searchParams.set("mailto", MAILTO);
        const res = await fetch(url.toString());
        const data = await res.json();
        setResults(data.results ?? []);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, DEBOUNCE_MS);
  }, []);

  const addTopic = topic => {
    if (!selectedTopics.find(t => t.id === topic.id)) {
      onTopicsChange([...selectedTopics, { id: topic.id, name: topic.display_name }]);
    }
    setQuery("");
    setResults([]);
  };

  const removeTopic = id => onTopicsChange(selectedTopics.filter(t => t.id !== id));

  return (
    <div style={{ marginTop: 4 }}>
      <button
        onClick={() => setOpen(o => !o)}
        disabled={disabled}
        style={{
          ...ghostBtn, padding: "4px 12px", fontSize: 10,
          textTransform: "uppercase", letterSpacing: "0.06em",
          color: open ? C.blue : C.textMuted,
          borderColor: open ? `${C.blue}55` : C.border,
        }}
      >
        {open ? "▲" : "▼"} OpenAlex Topics (AND with keywords)
        {selectedTopics.length > 0 && (
          <span style={{ marginLeft: 8, color: C.blue }}>{selectedTopics.length} selected</span>
        )}
      </button>

      {open && (
        <div style={{
          marginTop: 10, padding: "14px 16px",
          background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8,
          animation: "fadeIn 0.2s ease",
        }}>
          <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 10, lineHeight: 1.5 }}>
            Select OpenAlex Topics to narrow the OpenAlex search.
            OpenAIRE results use keywords only (FOS mapping deferred to v2).
          </div>

          {/* Selected topics */}
          {selectedTopics.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
              {selectedTopics.map(t => (
                <span key={t.id} style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "3px 10px", borderRadius: 5, fontSize: 11,
                  background: `${C.blue}18`, border: `1px solid ${C.blue}44`, color: C.blue,
                }}>
                  {t.name}
                  <button onClick={() => removeTopic(t.id)} style={{
                    background: "none", border: "none", color: C.blue,
                    cursor: "pointer", fontSize: 14, lineHeight: 1, padding: 0,
                  }}>×</button>
                </span>
              ))}
            </div>
          )}

          {/* Search input */}
          <div style={{ position: "relative" }}>
            <input
              value={query}
              onChange={e => { setQuery(e.target.value); search(e.target.value); }}
              placeholder="Search OpenAlex Topics…"
              disabled={disabled}
              style={{
                width: "100%", padding: "8px 12px", borderRadius: 6,
                border: `1px solid ${C.border2}`, background: C.surface2,
                color: C.textPrimary, fontSize: 12, fontFamily: "inherit", outline: "none",
              }}
            />
            {searching && (
              <div style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)" }}>
                <Spinner size={12} color={C.textMuted} />
              </div>
            )}
          </div>

          {/* Results dropdown */}
          {results.length > 0 && (
            <div style={{
              marginTop: 4, border: `1px solid ${C.border}`, borderRadius: 6, overflow: "hidden",
            }}>
              {results.map(t => (
                <button key={t.id} onClick={() => addTopic(t)} style={{
                  display: "block", width: "100%", textAlign: "left",
                  padding: "8px 12px", background: "transparent", border: "none",
                  borderBottom: `1px solid ${C.border}`, cursor: "pointer",
                  fontFamily: "inherit",
                }}>
                  <div style={{ fontSize: 12, color: C.textPrimary }}>{t.display_name}</div>
                  <div style={{ fontSize: 10, color: C.textMuted, marginTop: 1 }}>
                    {[t.subfield?.display_name, t.field?.display_name].filter(Boolean).join(" · ")}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
