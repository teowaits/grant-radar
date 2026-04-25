import { OPENALEX_BASE, MAILTO, OPENALEX_PER_PAGE, MAX_PAGES_DEFAULT, REQUEST_DELAY_MS } from "./config.js";
import { normaliseAward, enrichDates } from "../analytics.js";

const sleep = ms => new Promise(r => setTimeout(r, ms));

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
  if (!res.ok) throw new Error(`OpenAlex ${res.status}: ${url}`);
  return res.json();
}

// Resolve a funder display name to an OpenAlex funder ID.
// Returns null if not found. Never filter by free-text funder name directly.
export async function resolveFunderId(name, signal) {
  if (!name?.trim()) return null;
  try {
    const data = await apiFetch(openAlexUrl("/funders", { search: name, per_page: 1 }), signal);
    return data.results?.[0]?.id ?? null;
  } catch {
    return null;
  }
}

// Fetch and normalise OpenAlex awards for a keyword query.
// Returns { grants: CanonicalGrant[], fetchedAt: ISO string, total: number }
export async function searchAwards({ keywords, funderId, maxPages = MAX_PAGES_DEFAULT, signal, onProgress } = {}) {
  const today = new Date();
  const grants = [];
  let page = 1;
  let total = 0;
  let fetchedAt = null;

  while (page <= maxPages) {
    if (signal?.aborted) throw new DOMException("Cancelled", "AbortError");

    const params = {
      search: keywords || undefined,
      per_page: OPENALEX_PER_PAGE,
      page,
    };
    if (funderId) params["filter"] = `funder.id:${funderId}`;

    const url = openAlexUrl("/awards", params);
    const data = await apiFetch(url, signal);

    if (page === 1) {
      total = data.meta?.count ?? 0;
      fetchedAt = new Date().toISOString();
      onProgress?.({ source: "openalex", page: 1, total });
    }

    const raw = data.results ?? [];
    if (raw.length === 0) break;

    for (const rec of raw) {
      grants.push(enrichDates(normaliseAward(rec, "openalex"), today));
    }

    onProgress?.({ source: "openalex", page, loaded: grants.length, total });

    if (raw.length < OPENALEX_PER_PAGE) break;
    page++;
    if (page <= maxPages) await sleep(REQUEST_DELAY_MS);
  }

  return { grants, fetchedAt, total };
}

// Fetch one more page of results beyond the current cap.
// Used by the "Load more" button.
export async function loadMoreAwards({ keywords, funderId, page, signal, onProgress } = {}) {
  return searchAwards({ keywords, funderId, maxPages: 1, signal, onProgress });
}

// Resolve PI's OpenAlex author ID from a name string.
async function resolveAuthorId(name, signal) {
  if (!name) return null;
  const data = await apiFetch(openAlexUrl("/authors", { search: name, per_page: 1 }), signal);
  return data.results?.[0]?.id ?? null;
}

// Look up corresponding-author email for a PI via their most recent paper.
// Returns { email, doi, authorId } or { email: null, doi: null, authorId }
export async function lookupPIEmail(piName, signal) {
  try {
    const authorId = await resolveAuthorId(piName, signal);
    if (!authorId) return { email: null, doi: null, authorId: null };

    const shortId = authorId.replace("https://openalex.org/", "");
    const data = await apiFetch(
      openAlexUrl("/works", {
        filter: `author.id:${shortId},authorship.is_corresponding:true`,
        sort: "publication_date:desc",
        per_page: 1,
        select: "id,doi,authorships",
      }),
      signal
    );

    const work = data.results?.[0];
    if (!work) return { email: null, doi: null, authorId };

    const corresponding = (work.authorships ?? []).find(
      a => a.is_corresponding && a.author?.id === authorId
    );
    const email = corresponding?.raw_author_name ? null : null; // email not in works select
    // OpenAlex works API does not expose raw email — only DOI provenance link
    return { email: null, doi: work.doi ?? null, authorId };
  } catch {
    return { email: null, doi: null, authorId: null };
  }
}
