import { FX_TO_USD, SIZE_BANDS } from "./constants.js";

// ─── Date helpers ────────────────────────────────────────────────────────────

export function monthsSince(dateStr, today = new Date()) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  const months =
    (today.getFullYear() - d.getFullYear()) * 12 +
    (today.getMonth() - d.getMonth());
  return Math.max(0, months);
}

export function classifyActive(grant, today = new Date()) {
  const { startDate, endDate, recencyMonths } = grant;
  if (!startDate) return "unknown";

  const start = new Date(startDate);
  if (isNaN(start.getTime())) return "unknown";

  if (endDate) {
    const end = new Date(endDate);
    if (isNaN(end.getTime())) return "unknown";
    if (today >= start && today <= end) return "active";
    if (end < today) return "recently_ended";
    return "unknown"; // starts in future
  }

  // No end date — active if start is within the recency window
  const windowMonths = recencyMonths ?? 24;
  const ms = monthsSince(startDate, today);
  if (ms !== null && ms <= windowMonths) return "active";
  return "recently_ended";
}

// ─── Currency ────────────────────────────────────────────────────────────────

export function toUSD(amount, currency, fxRates = FX_TO_USD) {
  if (amount == null || !currency) return null;
  const rate = fxRates[currency.toUpperCase()];
  if (!rate) return null;
  return Math.round(amount * rate);
}

// ─── Normalisation ───────────────────────────────────────────────────────────

export function normaliseAward(rec, source) {
  if (source === "openalex") return normaliseOpenAlex(rec);
  if (source === "openaire") return normaliseOpenAire(rec);
  throw new Error(`Unknown source: ${source}`);
}

function normaliseOpenAlex(rec) {
  const inv = rec.lead_investigator ?? {};
  const givenName = inv.given_name ?? "";
  const familyName = inv.family_name ?? "";
  const piName = [givenName, familyName].filter(Boolean).join(" ") || null;

  const amount = rec.amount ?? null;
  const currency = rec.currency ?? null;

  return {
    source: "openalex",
    id: rec.id ?? null,
    title: rec.display_name ?? null,
    description: rec.description ?? null,
    funder: rec.funder?.display_name ?? null,
    funderId: rec.funder?.id ?? null,
    funderAwardId: rec.funder_award_id ?? null,
    country: inv.affiliation?.country ?? null,
    pi: {
      name: piName,
      openalexId: null,
      orcid: inv.orcid ?? null,
    },
    institution: inv.affiliation?.name ?? null,
    institutionCountry: inv.affiliation?.country ?? null,
    amount,
    amountUSD: toUSD(amount, currency),
    currency,
    startDate: rec.start_date ?? null,
    endDate: rec.end_date ?? null,
    recencyMonths: null, // computed post-normalisation
    active: null,        // computed post-normalisation
    topics: [],
    fos: [],
    landingPageUrl: rec.landing_page_url ?? null,
    workSampleDOI: rec.doi ?? null,
    fundedOutputs: rec.funded_outputs ?? [],
    funderScheme: rec.funder_scheme ?? null,
    provenance: rec.provenance ?? null,
    fetchedAt: new Date().toISOString(),
  };
}

function normaliseOpenAire(rec) {
  const funding = rec.fundings?.[0] ?? {};
  const granted = rec.granted ?? {};

  const amount = granted.fundedAmount > 0 ? granted.fundedAmount : null;
  const currency = granted.currency ?? null;

  return {
    source: "openaire",
    id: rec.id ?? null,
    title: rec.title ?? null,
    description: rec.summary ?? null,
    funder: funding.name ?? null,
    funderId: null,
    funderAwardId: rec.code ?? null,
    country: funding.jurisdiction ?? null,
    pi: {
      name: null, // OpenAIRE v1 projects do not expose PI name
      openalexId: null,
      orcid: null,
    },
    institution: null, // not present in OpenAIRE Graph v1 project records
    institutionCountry: funding.jurisdiction ?? null,
    amount,
    amountUSD: toUSD(amount, currency),
    currency,
    startDate: rec.startDate ?? null,
    endDate: rec.endDate ?? null,
    recencyMonths: null,
    active: null,
    topics: [],
    fos: rec.keywords ? [rec.keywords] : [],
    landingPageUrl: rec.websiteUrl ?? null,
    workSampleDOI: null,
    fundedOutputs: [],
    funderScheme: funding.fundingStream?.description ?? null,
    provenance: "openaire",
    fetchedAt: new Date().toISOString(),
  };
}

// ─── Post-process ────────────────────────────────────────────────────────────

export function enrichDates(grant, today = new Date()) {
  return {
    ...grant,
    recencyMonths: monthsSince(grant.startDate, today),
    active: classifyActive(grant, today),
  };
}

// v1: no fuzzy dedup — duplicates from both sources are shown with their source badge.
// v2: exact-ID dedup (funder+award_id+PI key) will be layered in.
export function mergeAndDedupe(grants) {
  return grants;
}

// ─── Filtering ───────────────────────────────────────────────────────────────

export function applyFilters(grants, filterState) {
  const { recencyMonths, active, funders, sizeBands, countries, sources } = filterState;

  return grants.filter(g => {
    if (sources.length && !sources.includes(g.source)) return false;

    if (active !== "both" && g.active !== active) return false;

    if (g.recencyMonths !== null && g.recencyMonths > recencyMonths) return false;

    if (funders.length && !funders.includes(g.funder)) return false;

    if (countries.length && !countries.includes(g.institutionCountry)) return false;

    if (sizeBands.length) {
      const matched = sizeBands.some(bandKey => {
        const band = SIZE_BANDS.find(b => b.key === bandKey);
        if (!band) return false;
        if (band.key === "unknown") return g.amountUSD == null;
        if (g.amountUSD == null) return false;
        return g.amountUSD >= band.min && g.amountUSD < band.max;
      });
      if (!matched) return false;
    }

    return true;
  });
}

// ─── Sorting ─────────────────────────────────────────────────────────────────

export function sortBy(grants, columnKey, direction) {
  const dir = direction === "asc" ? 1 : -1;

  return [...grants].sort((a, b) => {
    switch (columnKey) {
      case "pi": {
        const an = a.pi?.name, bn = b.pi?.name;
        if (an == null && bn == null) return 0;
        if (an == null) return 1;   // nulls always last
        if (bn == null) return -1;
        return dir * an.localeCompare(bn);
      }
      case "institution": {
        const ai = a.institution, bi = b.institution;
        if (ai == null && bi == null) return 0;
        if (ai == null) return 1;
        if (bi == null) return -1;
        return dir * ai.localeCompare(bi);
      }
      case "funder": {
        const af = a.funder, bf = b.funder;
        if (af == null && bf == null) return 0;
        if (af == null) return 1;
        if (bf == null) return -1;
        return dir * af.localeCompare(bf);
      }
      case "amount": {
        const av = a.amountUSD ?? -1;
        const bv = b.amountUSD ?? -1;
        return dir * (av - bv);
      }
      case "recency": {
        const av = a.recencyMonths ?? Infinity;
        const bv = b.recencyMonths ?? Infinity;
        return dir * (av - bv);
      }
      default:
        return 0;
    }
  });
}
