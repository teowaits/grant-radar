import { useMemo } from "react";
import { C, SIZE_BANDS } from "../constants.js";

export default function FilterBar({ grants, filterState, onFilterChange }) {
  const funders = useMemo(() => {
    const s = new Set(grants.map(g => g.funder).filter(Boolean));
    return [...s].sort();
  }, [grants]);

  const countries = useMemo(() => {
    const s = new Set(grants.map(g => g.institutionCountry).filter(Boolean));
    return [...s].sort();
  }, [grants]);

  if (grants.length === 0) return null;

  return (
    <div style={{
      display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-start",
      padding: "12px 0", borderBottom: `1px solid ${C.border}`,
      fontSize: 11,
    }}>
      <MultiSelect
        label="Funder"
        options={funders}
        selected={filterState.funders}
        onChange={v => onFilterChange({ funders: v })}
      />
      <MultiSelect
        label="Country"
        options={countries}
        selected={filterState.countries}
        onChange={v => onFilterChange({ countries: v })}
      />
      <MultiSelect
        label="Grant size"
        options={SIZE_BANDS.map(b => b.key)}
        labels={Object.fromEntries(SIZE_BANDS.map(b => [b.key, b.label]))}
        selected={filterState.sizeBands}
        onChange={v => onFilterChange({ sizeBands: v })}
      />
    </div>
  );
}

function MultiSelect({ label, options, labels = {}, selected, onChange }) {
  if (options.length === 0) return null;

  const toggle = v => {
    const next = selected.includes(v) ? selected.filter(s => s !== v) : [...selected, v];
    onChange(next);
  };

  return (
    <div>
      <div style={{ fontSize: 10, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 5 }}>
        {label}
        {selected.length > 0 && (
          <button onClick={() => onChange([])} style={{
            marginLeft: 8, fontSize: 9, color: C.textMuted, background: "none",
            border: "none", cursor: "pointer", textDecoration: "underline",
          }}>clear</button>
        )}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, maxWidth: 320 }}>
        {options.slice(0, 20).map(v => {
          const active = selected.includes(v);
          return (
            <button key={v} onClick={() => toggle(v)} style={{
              padding: "3px 9px", borderRadius: 4, cursor: "pointer", fontSize: 10,
              border: `1px solid ${active ? C.border2 : C.border}`,
              background: active ? C.surface2 : "transparent",
              color: active ? C.textPrimary : C.textMuted,
              transition: "all 0.15s", fontFamily: "inherit",
              maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {labels[v] ?? v}
            </button>
          );
        })}
        {options.length > 20 && (
          <span style={{ fontSize: 10, color: C.textMuted, padding: "3px 6px" }}>
            +{options.length - 20} more
          </span>
        )}
      </div>
    </div>
  );
}
