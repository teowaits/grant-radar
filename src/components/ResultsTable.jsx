import { useState, useMemo } from "react";
import { C, ghostBtn, SIZE_BANDS, FX_DATE } from "../constants.js";
import { applyFilters, sortBy } from "../analytics.js";
import { downloadCsv } from "../csv.js";
import { SourceBadge, ExportButton } from "./shared.jsx";
import SortableHeader from "./SortableHeader.jsx";
import FilterBar from "./FilterBar.jsx";
import CoverageBanner from "./CoverageBanner.jsx";
import ExpandableRow from "./ExpandableRow.jsx";

const PAGE_SIZE = 50;

const COL = "1fr 1fr 1fr 110px 80px 90px 28px";

export default function ResultsTable({ grants, totalFound, fetchedAt, sort, onSort, query }) {
  const [filterState, setFilterState] = useState({
    recencyMonths: 48,
    active: "both",
    funders: [],
    sizeBands: [],
    countries: [],
    sources: ["openalex", "openaire"],
  });
  const [expandedId, setExpandedId] = useState(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const handleFilterChange = patch => {
    setFilterState(prev => ({ ...prev, ...patch }));
    setVisibleCount(PAGE_SIZE);
  };

  const filtered = useMemo(() => applyFilters(grants, filterState), [grants, filterState]);
  const sorted = useMemo(() => sortBy(filtered, sort.column, sort.direction), [filtered, sort]);
  const visible = sorted.slice(0, visibleCount);

  const handleSort = col => {
    onSort({
      column: col,
      direction: sort.column === col && sort.direction === "asc" ? "desc" : "asc",
    });
  };

  const handleExport = () => {
    downloadCsv(`grant-radar-${query?.replace(/\s+/g, "-") ?? "results"}.csv`, sorted, { query });
  };

  return (
    <div style={{ padding: "20px 28px", maxWidth: 1300, margin: "0 auto" }}>
      <CoverageBanner />

      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 14, marginBottom: 4, flexWrap: "wrap" }}>
        <span style={{ fontSize: 12, color: C.textMuted }}>
          {filtered.length.toLocaleString()} grants
          {filtered.length < grants.length ? ` (of ${grants.length.toLocaleString()} loaded)` : ""}
        </span>
        {totalFound.openalex > 0 && (
          <span style={{ fontSize: 11, color: C.textMuted }}>
            · OpenAlex: {totalFound.openalex.toLocaleString()} found
          </span>
        )}
        {totalFound.openaire > 0 && (
          <span style={{ fontSize: 11, color: C.textMuted }}>
            · OpenAIRE: {totalFound.openaire.toLocaleString()} found
          </span>
        )}
        <span style={{ marginLeft: "auto" }}>
          <ExportButton onClick={handleExport} />
        </span>
      </div>

      <FilterBar grants={grants} filterState={filterState} onFilterChange={handleFilterChange} />

      {/* Table header */}
      <div style={{
        display: "grid", gridTemplateColumns: COL, gap: 8,
        padding: "10px 16px", marginTop: 8,
        borderBottom: `1px solid ${C.border}`,
      }}>
        <SortableHeader label="PI Name" columnKey="pi" sort={sort} onSort={handleSort} />
        <SortableHeader label="Institution" columnKey="institution" sort={sort} onSort={handleSort} />
        <SortableHeader label="Funder" columnKey="funder" sort={sort} onSort={handleSort} />
        <SortableHeader label="Amount (USD)" columnKey="amount" sort={sort} onSort={handleSort} style={{ textAlign: "right" }} />
        <SortableHeader label="Recency" columnKey="recency" sort={sort} onSort={handleSort} style={{ textAlign: "center" }} />
        <div style={{ fontSize: 10, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.1em" }}>Source</div>
        <div />
      </div>

      {/* Rows */}
      {visible.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 0", color: C.textMuted, fontSize: 13 }}>
          No matching grants found in current sources
        </div>
      ) : (
        <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden", marginTop: 4 }}>
          {visible.map((g, i) => (
            <GrantRow
              key={g.id ?? i}
              grant={g}
              expanded={expandedId === (g.id ?? i)}
              onToggle={() => setExpandedId(prev => prev === (g.id ?? i) ? null : (g.id ?? i))}
            />
          ))}
        </div>
      )}

      {/* Load more */}
      {visibleCount < sorted.length && (
        <div style={{ textAlign: "center", marginTop: 16 }}>
          <button onClick={() => setVisibleCount(n => Math.min(n + PAGE_SIZE, sorted.length))} style={{
            ...ghostBtn, padding: "10px 28px", fontSize: 12, color: C.blueLight, borderColor: `${C.blue}44`,
          }}>
            Show more ({Math.min(PAGE_SIZE, sorted.length - visibleCount)} of {(sorted.length - visibleCount).toLocaleString()} remaining)
          </button>
        </div>
      )}

      {/* Data freshness footer */}
      <DataFreshnessFooter fetchedAt={fetchedAt} />
    </div>
  );
}

function GrantRow({ grant, expanded, onToggle }) {
  const bg = expanded ? C.surface : "transparent";
  const amountStr = grant.amountUSD != null
    ? `$${Math.round(grant.amountUSD / 1000)}k`
    : "n/a";

  return (
    <div style={{
      borderBottom: `1px solid ${C.border}`,
      background: bg,
      transition: "background 0.15s",
    }}>
      <div
        onClick={onToggle}
        style={{
          display: "grid", gridTemplateColumns: COL, gap: 8,
          padding: "11px 16px", cursor: "pointer",
          alignItems: "center",
        }}
        onMouseEnter={e => { if (!expanded) e.currentTarget.style.background = C.surface; }}
        onMouseLeave={e => { if (!expanded) e.currentTarget.style.background = "transparent"; }}
      >
        <div>
          <div style={{ fontSize: 12, color: C.textPrimary, fontWeight: 500 }}>
            {grant.pi?.name ?? <span style={{ color: C.textMuted, fontStyle: "italic" }}>No PI name</span>}
          </div>
          <div style={{ fontSize: 10, color: C.textMuted, marginTop: 1 }} title={grant.title}>
            {(grant.title ?? "").slice(0, 60)}{(grant.title?.length ?? 0) > 60 ? "…" : ""}
          </div>
        </div>
        <div style={{ fontSize: 11, color: C.textSecondary }}>
          {grant.institution ?? <span style={{ color: C.textMuted }}>—</span>}
          {grant.institutionCountry && <span style={{ color: C.textMuted }}> · {grant.institutionCountry}</span>}
        </div>
        <div style={{ fontSize: 11, color: C.textSecondary }}>
          {grant.funder ?? <span style={{ color: C.textMuted }}>—</span>}
        </div>
        <div style={{ fontSize: 11, color: grant.amountUSD != null ? C.textPrimary : C.textMuted, textAlign: "right" }}>
          {amountStr}
          {grant.amountUSD != null && grant.currency && grant.currency !== "USD" && (
            <div style={{ fontSize: 9, color: C.textMuted }}>
              {Number(grant.amount).toLocaleString()} {grant.currency}
            </div>
          )}
        </div>
        <div style={{ textAlign: "center" }}>
          <ActiveBadge active={grant.active} months={grant.recencyMonths} />
        </div>
        <div>
          <SourceBadge source={grant.source} />
        </div>
        <div style={{ color: C.textMuted, fontSize: 14, textAlign: "center" }}>
          {expanded ? "▲" : "▼"}
        </div>
      </div>
      <ExpandableRow grant={grant} expanded={expanded} onToggle={onToggle} />
    </div>
  );
}

function ActiveBadge({ active, months }) {
  const color = active === "active" ? C.green : active === "recently_ended" ? C.amber : C.textMuted;
  const label = active === "active" ? "Active" : active === "recently_ended" ? `${months}mo ago` : "Unknown";
  return (
    <span style={{
      display: "inline-block", padding: "2px 8px", borderRadius: 4,
      fontSize: 10, border: `1px solid ${color}44`,
      background: `${color}12`, color,
    }}>
      {label}
    </span>
  );
}

function DataFreshnessFooter({ fetchedAt }) {
  const entries = Object.entries(fetchedAt).filter(([, v]) => v);
  if (entries.length === 0) return null;

  return (
    <div style={{ marginTop: 16, fontSize: 10, color: C.textMuted, display: "flex", gap: 16, flexWrap: "wrap" }}>
      {entries.map(([source, ts]) => (
        <span key={source}>
          {source === "openalex" ? "OpenAlex" : "OpenAIRE"} fetched{" "}
          {new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      ))}
      <span>· FX rates as of {FX_DATE}</span>
    </div>
  );
}
