import { C } from "../constants.js";

const SKEW_THRESHOLD = 5;

export default function SourceAsymmetryWarning({ totalFound }) {
  const oa = totalFound?.openalex ?? 0;
  const air = totalFound?.openaire ?? 0;

  if (oa === 0 || air === 0) return null;
  if (oa < SKEW_THRESHOLD * air) return null;

  return (
    <div style={{
      marginTop: 10,
      padding: "10px 14px",
      borderRadius: 6,
      background: `${C.amber}0d`,
      border: `1px solid ${C.amber}33`,
      fontSize: 11,
      color: C.amber,
      lineHeight: 1.6,
    }}>
      OpenAIRE returned {air.toLocaleString()} result{air !== 1 ? "s" : ""} vs {oa.toLocaleString()} from OpenAlex for this query.
      OpenAIRE indexes EU-funded research most thoroughly; thin counts here likely reflect
      indexing gaps for non-EU funders rather than absence of research activity.
    </div>
  );
}
