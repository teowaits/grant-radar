export const OPENALEX_BASE = "https://api.openalex.org";
export const OPENAIRE_BASE = "https://api.openaire.eu/graph/v1";

// Polite Pool — identifies us to OpenAlex for higher rate limits.
export const MAILTO = "YOUR_EMAIL_HERE@example.com";

export const OPENALEX_PER_PAGE = 200;
export const OPENAIRE_PER_PAGE = 50;

// Maximum pages fetched per query per source (default). "Load more" increments by this.
export const MAX_PAGES_DEFAULT = 5;
export const MAX_PAGES_HARD = 50; // 10,000 result hard cap at 200/page

// Minimum ms between paged requests. Both APIs are polite-rate-limited.
export const REQUEST_DELAY_MS = 60;

// Shared rate-limit token bucket: max concurrent in-flight fetches across both adapters.
// Prevents hammering when OpenAlex + OpenAIRE run in parallel.
export const MAX_CONCURRENT = 3;
