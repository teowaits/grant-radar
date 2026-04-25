import { OPENALEX_BASE, MAILTO } from "./config.js";

// NOTE: OpenAlex works API does not expose corresponding-author email in any
// publicly available field. Enrichment provides DOI provenance and ORCID only.
// email will always be null in v1. Editors will see an explicit "no email" indicator.

function openAlexUrl(path, params = {}) {
  const url = new URL(`${OPENALEX_BASE}${path}`);
  url.searchParams.set("mailto", MAILTO);
  for (const [k, v] of Object.entries(params)) {
    if (v != null) url.searchParams.set(k, String(v));
  }
  return url.toString();
}

async function apiFetch(url, signal) {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`OpenAlex ${res.status}`);
  return res.json();
}

// Resolve a PI name to their OpenAlex author record.
async function resolveAuthor(name, signal) {
  if (!name?.trim()) return null;
  const data = await apiFetch(
    openAlexUrl("/authors", { search: name, per_page: 1, select: "id,display_name,orcid" }),
    signal
  );
  return data.results?.[0] ?? null;
}

// Find the PI's most recent paper where they are corresponding author.
// Returns { doi, workId } or null.
async function recentCorrespondingWork(authorId, signal) {
  if (!authorId) return null;
  const shortId = authorId.replace("https://openalex.org/", "");
  const data = await apiFetch(
    openAlexUrl("/works", {
      filter: `authorships.is_corresponding:true,author.id:${shortId}`,
      sort: "publication_date:desc",
      per_page: 1,
      select: "id,doi",
    }),
    signal
  );
  const work = data.results?.[0];
  if (!work) return null;
  return { doi: work.doi ?? null, workId: work.id ?? null };
}

// Enrich a single CanonicalGrant's PI with OpenAlex author metadata.
// Designed to be called lazily (on row expand), not on page load.
//
// Returns an enrichment object to merge into grant.pi:
// { openalexId, orcid, email, emailUnavailable, workSampleDOI, enriched: true }
export async function enrichPI(grant, signal) {
  const piName = grant.pi?.name;

  // OpenAIRE records have no PI name — return explicit unavailable immediately.
  if (!piName) {
    return {
      openalexId: null,
      orcid: grant.pi?.orcid ?? null,
      email: null,
      emailUnavailable: true,
      emailUnavailableReason: grant.source === "openaire"
        ? "PI name not available in OpenAIRE v1 project records"
        : "PI name missing",
      workSampleDOI: grant.workSampleDOI ?? null,
      enriched: true,
    };
  }

  try {
    const author = await resolveAuthor(piName, signal);
    if (!author) {
      return {
        openalexId: null,
        orcid: grant.pi?.orcid ?? null,
        email: null,
        emailUnavailable: true,
        emailUnavailableReason: "Author not found in OpenAlex",
        workSampleDOI: grant.workSampleDOI ?? null,
        enriched: true,
      };
    }

    const work = await recentCorrespondingWork(author.id, signal);

    // Email is not available via OpenAlex public API.
    // workSampleDOI is provided for provenance — editors can use it to find
    // the paper's corresponding author contact from the publisher directly.
    return {
      openalexId: author.id,
      orcid: author.orcid ?? grant.pi?.orcid ?? null,
      email: null,
      emailUnavailable: true,
      emailUnavailableReason: "Corresponding-author email not exposed by OpenAlex public API",
      workSampleDOI: work?.doi ?? grant.workSampleDOI ?? null,
      enriched: true,
    };
  } catch (e) {
    if (e.name === "AbortError") throw e;
    return {
      openalexId: null,
      orcid: grant.pi?.orcid ?? null,
      email: null,
      emailUnavailable: true,
      emailUnavailableReason: "Enrichment lookup failed",
      workSampleDOI: grant.workSampleDOI ?? null,
      enriched: true,
    };
  }
}
