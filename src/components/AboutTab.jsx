import { C } from "../constants.js";
import { FX_DATE } from "../constants.js";

export default function AboutTab() {
  return (
    <div style={{ padding: "32px 28px", maxWidth: 760, margin: "0 auto", fontSize: 13, lineHeight: 1.8, color: C.textSecondary }}>
      <Section title="What is Grant Radar?">
        Grant Radar surfaces researchers with active or recent grants in user-defined fields.
        It is built for editorial commissioning at <em>Advanced Intelligent Discovery</em> (AIDI)
        but works for any subject area.
      </Section>

      <Section title="Data sources covered in v1">
        <SourceTable />
        <div style={{ marginTop: 10, padding: "10px 14px", borderRadius: 6, background: `${C.amber}11`, border: `1px solid ${C.amber}33`, color: C.amber, fontSize: 12 }}>
          <strong>Coverage gap:</strong> Asian national funders (NSFC, JSPS, NRF-Korea, DBT India)
          and private/philanthropic foundations are not indexed by these sources and will not appear in results.
          v2 will add KAKEN, NTIS, and IGMS adapters.
        </div>
      </Section>

      <Section title="How results are generated">
        <ol style={{ paddingLeft: 20, color: C.textSecondary }}>
          <li>Both sources are queried in parallel with your keywords.</li>
          <li>Records are normalised to a shared CanonicalGrant schema.</li>
          <li>Active status is derived: a grant is <em>active</em> if today falls between its start and end dates,
            or if it has no end date and started within your recency window.</li>
          <li>Currency amounts are converted to USD using static FX rates (as of {FX_DATE}).
            All source amounts are also shown in native currency.</li>
          <li>PI enrichment runs lazily when you expand a row — it resolves the PI name against
            OpenAlex authors and retrieves their most recent corresponding-author paper DOI for provenance.</li>
        </ol>
      </Section>

      <Section title="PI email lookup">
        OpenAlex's public API does not expose corresponding-author email addresses.
        The work-sample DOI in each expanded row is the most recent paper where the PI
        appears as corresponding author — editors can use this to find contact information
        from the publisher's own page.
      </Section>

      <Section title="Deduplication">
        v1 shows results from both sources with their source badge visible.
        A grant that appears in both OpenAlex and OpenAIRE may produce two rows.
        Cross-source deduplication will be added in v2.
      </Section>

      <Section title="Limitations">
        <ul style={{ paddingLeft: 20, color: C.textSecondary }}>
          <li>OpenAlex /awards is a new endpoint (Q1 2026) — schema may evolve.</li>
          <li>OpenAIRE project records rarely expose PI name or institution.</li>
          <li>Grant amounts are frequently null or zero in OpenAIRE records.</li>
          <li>FX conversion uses a static rate table; converted amounts are approximate.</li>
        </ul>
      </Section>

      <Section title="Version">
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11 }}>
          v1.0 · April 2026 · MIT License<br />
          <a href="https://github.com/teowaits/grant-radar" target="_blank" rel="noreferrer"
            style={{ color: C.blue, textDecoration: "none" }}>
            github.com/teowaits/grant-radar
          </a>
        </div>
      </Section>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{
        fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.12em",
        color: C.textMuted, marginBottom: 8,
      }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function SourceTable() {
  const rows = [
    { source: "OpenAlex Awards", base: "api.openalex.org/awards", coverage: "US, EU (Crossref-indexed funders)", strengths: "PI name, funder, amount, linked works" },
    { source: "OpenAIRE Graph", base: "api.openaire.eu/graph/v1", coverage: "EU Horizon, ARC, SNSF + partners", strengths: "Project title, funder, dates" },
  ];
  const tdStyle = { padding: "7px 12px", borderBottom: `1px solid ${C.border}`, fontSize: 11, color: C.textSecondary };
  const thStyle = { ...tdStyle, color: C.textMuted, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", background: C.surface };

  return (
    <table style={{ width: "100%", borderCollapse: "collapse", border: `1px solid ${C.border}`, borderRadius: 6, overflow: "hidden" }}>
      <thead>
        <tr>
          {["Source", "API Base", "Coverage", "Key fields"].map(h => <th key={h} style={thStyle}>{h}</th>)}
        </tr>
      </thead>
      <tbody>
        {rows.map(r => (
          <tr key={r.source}>
            <td style={tdStyle}>{r.source}</td>
            <td style={{ ...tdStyle, fontFamily: "monospace", fontSize: 10 }}>{r.base}</td>
            <td style={tdStyle}>{r.coverage}</td>
            <td style={tdStyle}>{r.strengths}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
