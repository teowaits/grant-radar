import { FX_DATE } from "./constants.js";

// Suite-shared CSV header — matches journal-overlap and journal-profiler export pattern.
// Columns that don't apply to grant records are left empty (not omitted).
const HEADERS = [
  "type",
  "source",
  "Grant Title",
  "Funder",
  "Funder Award ID",
  "PI Name",
  "PI ORCID",
  "PI Email",
  "Institution",
  "Country",
  "Start Date",
  "End Date",
  "Active Status",
  "Recency (months)",
  "Amount (native)",
  "Currency",
  "Amount (USD)",
  `FX Rate Date`,
  "Grant Size Band",
  "Topics / FOS",
  "Landing Page",
  "Work Sample DOI",
  "Note",
];

function escapeCsv(val) {
  if (val == null) return "";
  const s = String(val);
  return s.includes(",") || s.includes('"') || s.includes("\n")
    ? `"${s.replace(/"/g, '""')}"`
    : s;
}

export function downloadCsv(filename, grants, meta = {}) {
  const rows = grants.map(g => toRow(g, meta));
  const csv = [HEADERS.map(escapeCsv).join(","), ...rows.map(r => r.map(escapeCsv).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function sizeBandLabel(g) {
  if (g.amountUSD == null) return "unknown";
  if (g.amountUSD < 100_000) return "<$100k";
  if (g.amountUSD < 1_000_000) return "$100k–$1M";
  return ">$1M";
}

export function toRow(g, meta = {}) {
  const note = [
    "Grant Radar v1",
    meta.query ? `query: ${meta.query}` : "",
    "Coverage: OpenAlex Awards + OpenAIRE Graph. Asian national funders and private foundations under-represented.",
  ].filter(Boolean).join(" · ");

  return [
    "grant",
    g.source,
    g.title ?? "",
    g.funder ?? "",
    g.funderAwardId ?? "",
    g.pi?.name ?? "",
    g.pi?.orcid ?? "",
    g.pi?.email ?? "",
    g.institution ?? "",
    g.institutionCountry ?? "",
    g.startDate ?? "",
    g.endDate ?? "",
    g.active ?? "",
    g.recencyMonths ?? "",
    g.amount ?? "",
    g.currency ?? "",
    g.amountUSD ?? "",
    FX_DATE,
    sizeBandLabel(g),
    [...(g.topics ?? []), ...(g.fos ?? [])].join("; "),
    g.landingPageUrl ?? "",
    g.workSampleDOI ?? "",
    note,
  ];
}
