import { OPENAIRE_BASE, OPENAIRE_PER_PAGE, MAX_PAGES_DEFAULT, REQUEST_DELAY_MS } from "./config.js";
import { normaliseAward, enrichDates } from "../analytics.js";

// NOTE: correct base path is /graph/v1 — CLAUDE.md has a typo (/graph/projects is 405).

const sleep = ms => new Promise(r => setTimeout(r, ms));

function openAireUrl(path, params = {}) {
  const url = new URL(`${OPENAIRE_BASE}${path}`);
  for (const [k, v] of Object.entries(params)) {
    if (v != null) url.searchParams.set(k, String(v));
  }
  return url.toString();
}

async function apiFetch(url, signal) {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`OpenAIRE ${res.status}: ${url}`);
  return res.json();
}

// Fetch and normalise OpenAIRE projects for a keyword query.
// Returns { grants: CanonicalGrant[], fetchedAt: ISO string, total: number }
export async function searchProjects({ keywords, maxPages = MAX_PAGES_DEFAULT, signal, onProgress } = {}) {
  const today = new Date();
  const grants = [];
  let page = 1;
  let total = 0;
  let fetchedAt = null;

  while (page <= maxPages) {
    if (signal?.aborted) throw new DOMException("Cancelled", "AbortError");

    const url = openAireUrl("/projects", {
      search: keywords || undefined,
      page,
      pageSize: OPENAIRE_PER_PAGE,
    });

    const data = await apiFetch(url, signal);

    if (page === 1) {
      total = data.header?.numFound ?? 0;
      fetchedAt = new Date().toISOString();
      onProgress?.({ source: "openaire", page: 1, total });
    }

    const raw = data.results ?? [];
    if (raw.length === 0) break;

    for (const rec of raw) {
      grants.push(enrichDates(normaliseAward(rec, "openaire"), today));
    }

    onProgress?.({ source: "openaire", page, loaded: grants.length, total });

    if (raw.length < OPENAIRE_PER_PAGE) break;
    page++;
    if (page <= maxPages) await sleep(REQUEST_DELAY_MS);
  }

  return { grants, fetchedAt, total };
}
