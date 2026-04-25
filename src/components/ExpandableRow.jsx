import { useState, useEffect } from "react";
import { C } from "../constants.js";
import { Spinner } from "./shared.jsx";
import { enrichPI } from "../api/enrichment.js";

export default function ExpandableRow({ grant, expanded, onToggle }) {
  const [enrichment, setEnrichment] = useState(null);
  const [enriching, setEnriching] = useState(false);

  useEffect(() => {
    if (!expanded || enrichment || enriching) return;
    const controller = new AbortController();
    setEnriching(true);
    enrichPI(grant, controller.signal)
      .then(e => { setEnrichment(e); setEnriching(false); })
      .catch(e => { if (e.name !== "AbortError") setEnriching(false); });
    return () => controller.abort();
  }, [expanded]);

  if (!expanded) return null;

  const doi = enrichment?.workSampleDOI ?? grant.workSampleDOI;
  const orcid = enrichment?.orcid ?? grant.pi?.orcid;

  return (
    <div style={{
      padding: "14px 18px 18px 52px",
      borderTop: `1px solid ${C.border}`,
      background: C.surface,
      animation: "fadeIn 0.2s ease",
      fontSize: 11,
      color: C.textMuted,
      lineHeight: 1.7,
    }}>
      {/* Full grant title */}
      {grant.title && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: C.textMuted, marginBottom: 4 }}>Grant Title</div>
          <div style={{ color: C.textPrimary, fontWeight: 500, lineHeight: 1.5 }}>{grant.title}</div>
        </div>
      )}

      {/* Description / abstract */}
      {grant.description && (
        <div style={{ marginBottom: 12, maxWidth: 760 }}>
          <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: C.textMuted, marginBottom: 4 }}>Abstract</div>
          <div style={{ color: C.textSecondary }}>{grant.description.slice(0, 600)}{grant.description.length > 600 ? "…" : ""}</div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "10px 24px" }}>
        {/* PI enrichment */}
        <Field label="PI Lookup">
          {enriching ? (
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Spinner size={10} color={C.textMuted} /> Looking up…
            </span>
          ) : enrichment?.emailUnavailable ? (
            <span style={{ color: C.textMuted }}>
              No public email · {enrichment.emailUnavailableReason}
            </span>
          ) : null}
        </Field>

        {orcid && (
          <Field label="ORCID">
            <a href={`https://orcid.org/${orcid}`} target="_blank" rel="noreferrer"
              style={{ color: C.green, textDecoration: "none" }}>
              {orcid}
            </a>
          </Field>
        )}

        {enrichment?.openalexId && (
          <Field label="OpenAlex Author">
            <a href={enrichment.openalexId} target="_blank" rel="noreferrer"
              style={{ color: C.blue, textDecoration: "none" }}>
              {enrichment.openalexId.replace("https://openalex.org/", "")}
            </a>
          </Field>
        )}

        {doi && (
          <Field label="Work Sample DOI">
            <a href={doi.startsWith("http") ? doi : `https://doi.org/${doi}`}
              target="_blank" rel="noreferrer"
              style={{ color: C.blue, textDecoration: "none" }}>
              {doi.replace("https://doi.org/", "")}
            </a>
            <div style={{ fontSize: 9, color: C.textMuted, marginTop: 1 }}>
              Source: most recent corresponding-author paper
            </div>
          </Field>
        )}

        {grant.landingPageUrl && (
          <Field label="Grant Page">
            <a href={grant.landingPageUrl} target="_blank" rel="noreferrer"
              style={{ color: C.blue, textDecoration: "none" }}>
              {new URL(grant.landingPageUrl).hostname}
            </a>
          </Field>
        )}

        {grant.funderScheme && (
          <Field label="Funder Programme">{grant.funderScheme}</Field>
        )}

        {grant.funderAwardId && (
          <Field label="Award ID">{grant.funderAwardId}</Field>
        )}

        {(grant.topics?.length > 0) && (
          <Field label="Topics (OpenAlex)">{grant.topics.join(", ")}</Field>
        )}

        {(grant.fos?.length > 0) && (
          <Field label="Keywords / FOS">{grant.fos.join(", ")}</Field>
        )}

        {grant.fundedOutputs?.length > 0 && (
          <Field label={`Linked works (${grant.fundedOutputs.length})`}>
            <LinkedWorks outputs={grant.fundedOutputs} grantId={grant.id} />
          </Field>
        )}

        <Field label="Provenance">
          Data source: {grant.source === "openalex" ? "OpenAlex Awards" : "OpenAIRE Graph"}
          {grant.provenance ? ` (${grant.provenance})` : ""}
        </Field>
      </div>
    </div>
  );
}

const PREVIEW_COUNT = 5;

function LinkedWorks({ outputs, grantId }) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? outputs : outputs.slice(0, PREVIEW_COUNT);
  const shortId = grantId?.replace("https://openalex.org/", "");
  const viewAllUrl = shortId
    ? `https://openalex.org/works?filter=awards.id:${shortId}`
    : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      {visible.map(id => {
        const label = id.replace("https://openalex.org/", "");
        return (
          <a key={id} href={id} target="_blank" rel="noreferrer"
            style={{ color: C.blue, textDecoration: "none", fontSize: 11 }}
            onMouseEnter={e => e.currentTarget.style.textDecoration = "underline"}
            onMouseLeave={e => e.currentTarget.style.textDecoration = "none"}
          >
            {label}
          </a>
        );
      })}
      {outputs.length > PREVIEW_COUNT && !showAll && (
        <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 2 }}>
          <button onClick={() => setShowAll(true)} style={{
            background: "none", border: "none", cursor: "pointer", padding: 0,
            color: C.textMuted, fontSize: 10, textDecoration: "underline", fontFamily: "inherit",
          }}>
            show all {outputs.length}
          </button>
          {viewAllUrl && (
            <a href={viewAllUrl} target="_blank" rel="noreferrer"
              style={{ color: C.textMuted, fontSize: 10 }}>
              view on OpenAlex ↗
            </a>
          )}
        </div>
      )}
      {showAll && viewAllUrl && (
        <a href={viewAllUrl} target="_blank" rel="noreferrer"
          style={{ color: C.textMuted, fontSize: 10, marginTop: 2 }}>
          view all on OpenAlex ↗
        </a>
      )}
    </div>
  );
}

function Field({ label, children }) {
  if (!children) return null;
  return (
    <div>
      <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.09em", color: C.textMuted, marginBottom: 2 }}>
        {label}
      </div>
      <div style={{ color: C.textSecondary, fontSize: 11 }}>{children}</div>
    </div>
  );
}
