import { useReducer, useCallback } from "react";
import { C, DEFAULT_RECENCY } from "./constants.js";
import { useSearch } from "./hooks/useSearch.js";
import SearchPanel from "./components/SearchPanel.jsx";
import ResultsTable from "./components/ResultsTable.jsx";
import AboutTab from "./components/AboutTab.jsx";

const TABS = [
  { key: "search", label: "Search" },
  { key: "results", label: "Results" },
  { key: "about", label: "About" },
];

const initialFilters = {
  recencyMonths: DEFAULT_RECENCY,
  active: "both",
  funders: [],
  sizeBands: [],
  countries: [],
  sources: ["openalex", "openaire"],
};

const initialUIState = {
  tab: "search",
  sort: { column: "recency", direction: "asc" },
  query: "",
  filters: initialFilters,
};

function uiReducer(state, action) {
  switch (action.type) {
    case "SET_TAB":    return { ...state, tab: action.tab };
    case "SET_SORT":   return { ...state, sort: action.sort };
    case "SET_QUERY":  return { ...state, query: action.query };
    case "SET_FILTERS":
      return { ...state, filters: { ...state.filters, ...action.patch } };
    // Clear result-time filters (funder/size/country) on each new search; keep
    // recency/active/sources so the editor's intent carries over.
    case "RESET_RESULT_FILTERS":
      return { ...state, filters: { ...state.filters, funders: [], sizeBands: [], countries: [] } };
    default: return state;
  }
}

export default function App() {
  const [ui, uiDispatch] = useReducer(uiReducer, initialUIState);
  const { state: searchState, run, cancel } = useSearch();

  const handleFilterChange = useCallback(patch => {
    uiDispatch({ type: "SET_FILTERS", patch });
  }, []);

  const handleSearch = useCallback(({ keywords, topicIds }) => {
    uiDispatch({ type: "SET_QUERY", query: keywords });
    uiDispatch({ type: "SET_TAB", tab: "results" });
    uiDispatch({ type: "RESET_RESULT_FILTERS" });
    run({ keywords, sources: ui.filters.sources });
  }, [run, ui.filters.sources]);

  const handleSort = useCallback(sort => uiDispatch({ type: "SET_SORT", sort }), []);

  const hasResults = searchState.canonical.length > 0;
  const isLoading = searchState.loading;

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.textPrimary, fontFamily: "'IBM Plex Mono','Fira Code',monospace" }}>
      {/* Header */}
      <div style={{
        borderBottom: `1px solid ${C.border}`, padding: "18px 28px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: C.bgDark,
      }}>
        <div>
          <div style={{ fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: C.textMuted, marginBottom: 3 }}>
            OpenAlex · OpenAIRE · Grant Discovery
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: C.textPrimary, fontFamily: "'IBM Plex Sans',sans-serif" }}>
            Grant Radar
          </div>
        </div>
        <div style={{ fontSize: 10, color: C.textMuted, textAlign: "right", lineHeight: 1.8, letterSpacing: "0.05em" }}>
          {ui.query && <div>Query: <span style={{ color: C.textSecondary }}>{ui.query}</span></div>}
          {isLoading && <div style={{ color: C.amber }}>Searching…</div>}
          {!isLoading && hasResults && (
            <div style={{ color: C.greenDark }}>{searchState.canonical.length.toLocaleString()} grants loaded</div>
          )}
        </div>
      </div>

      {/* Tab nav */}
      <div style={{ borderBottom: `1px solid ${C.border}`, background: C.bgDark, padding: "0 28px" }}>
        <div style={{ maxWidth: 1300, margin: "0 auto", display: "flex", gap: 0 }}>
          {TABS.map(({ key, label }) => {
            const badge = key === "results" && searchState.canonical.length > 0
              ? ` (${searchState.canonical.length.toLocaleString()})`
              : key === "results" && isLoading ? " …" : "";
            return (
              <button key={key} onClick={() => uiDispatch({ type: "SET_TAB", tab: key })} style={{
                padding: "12px 20px", border: "none", background: "transparent",
                color: ui.tab === key ? C.textPrimary : C.textMuted,
                borderBottom: `2px solid ${ui.tab === key ? C.blue : "transparent"}`,
                cursor: "pointer", fontSize: 12, fontWeight: ui.tab === key ? 600 : 400,
                transition: "all 0.15s", letterSpacing: "0.04em", fontFamily: "inherit",
              }}>
                {label}{badge}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content */}
      {ui.tab === "search" && (
        <SearchPanel
          onSearch={handleSearch}
          onCancel={cancel}
          loading={isLoading}
          progress={searchState.progress}
          errors={searchState.errors}
          filterState={ui.filters}
          onFilterChange={handleFilterChange}
        />
      )}

      {ui.tab === "results" && (
        <>
          {!isLoading && !hasResults && !searchState.errors.length && (
            <div style={{ textAlign: "center", padding: "60px 0", color: C.textMuted, fontSize: 13 }}>
              {ui.query
                ? "No matching grants found in current sources"
                : "Run a search to see grants here"}
            </div>
          )}
          {(isLoading || hasResults || searchState.errors.length > 0) && (
            <ResultsTable
              grants={searchState.canonical}
              totalFound={searchState.totalFound}
              fetchedAt={searchState.fetchedAt}
              sort={ui.sort}
              onSort={handleSort}
              query={ui.query}
              filterState={ui.filters}
              onFilterChange={handleFilterChange}
            />
          )}
        </>
      )}

      {ui.tab === "about" && <AboutTab />}

      {/* Footer */}
      <div style={{
        borderTop: `1px solid ${C.border}`, marginTop: 48,
        padding: "18px 28px", display: "flex", alignItems: "center",
        justifyContent: "space-between", flexWrap: "wrap", gap: 10,
        fontSize: 11, color: C.textMuted, background: C.bgDark,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span>
            Created by{" "}
            <a href="https://github.com/teowaits" target="_blank" rel="noreferrer"
              style={{ color: C.blueLight, textDecoration: "none", fontWeight: 600 }}>
              teowaits
            </a>
          </span>
          <span style={{ color: C.border2 }}>·</span>
          <span>
            Data from{" "}
            <a href="https://openalex.org" target="_blank" rel="noreferrer"
              style={{ color: C.textSecondary, textDecoration: "none" }}>OpenAlex</a>
            {" (CC0) and "}
            <a href="https://graph.openaire.eu" target="_blank" rel="noreferrer"
              style={{ color: C.textSecondary, textDecoration: "none" }}>OpenAIRE Graph</a>
          </span>
        </div>
        <a href="https://github.com/teowaits/grant-radar" target="_blank" rel="noreferrer"
          style={{ color: C.textMuted, textDecoration: "none" }}>
          MIT License
        </a>
      </div>
    </div>
  );
}
