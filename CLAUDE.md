# CLAUDE.md — Grant Radar

> Full design documentation is in `CLAUDE.docx` in this directory.
> This file is the quick-reference for Claude Code sessions.

---

## What this project is

A React + Vite SPA that surfaces researchers with active or recent grants in user-defined fields, querying OpenAlex Awards and OpenAIRE Graph in parallel. Built primarily for editorial commissioning at *Advanced Intelligent Discovery* (AIDI), but the subject-area input keeps it transferable to other Wiley journals.

Stateless. Client-side only. GitHub Pages deploy. Suite-coherent with `journal-overlap` and `journal-profiler`.

Parent projects to inherit patterns from: `teowaits/journal-overlap`, `teowaits/journal-profiler`.

---

## Core constraint — coverage honesty

The v1 sources (OpenAlex Awards + OpenAIRE Graph) under-represent Asian national funders and private/philanthropic funders. The tool must surface this in-product, not just in docs. A persistent banner in the results view names the limitation in neutral language.

| ✅ Use | ❌ Never use |
|--------|-------------|
| "Coverage in v1: OpenAlex Awards + OpenAIRE Graph. Asian national funders and private foundations are under-represented." | "Comprehensive global grants database" |
| "No matching grants found in current sources" | "No grants exist for this query" |
| "Data source: OpenAlex" / "Data source: OpenAIRE" | (unattributed results) |
| "Email derived from corresponding-author metadata of [DOI]" | (unsourced PI email) |

---

## Phase scope

| Phase | In scope | Out |
|-------|----------|-----|
| **v1 (build)** | OpenAlex `/awards` + OpenAIRE Graph `projects`. Keyword + recency + active filter + funder + size filters. 5 sortable columns. PI email enrichment via corresponding-author lookup. CSV export. | Asian funder APIs, OpenAIRE topic translation, ORCID auth, alerts, saved searches. |
| **v2 (documented)** | KAKEN, NTIS, IGMS adapters; OpenAlex Topic → OpenAIRE FOS mapping; ORCID enrichment expansion; thin proxy for OpenAIRE auth tokens. | Backend, accounts. |
| **v3 (roadmap)** | Saved searches, email alerts (requires backend). Candid / 360Giving for private/philanthropic. | — |

Build only v1. Document v2/v3 in CLAUDE.docx. Do not stub v2/v3 code.

---

## Active vs not-active grant definition

```
active     := today between start_date and end_date (inclusive)
              OR (end_date missing AND start_date within recency window)
not_active := end_date in the past
```

UI exposes both as a toggle (`active` / `recently ended` / `both`). Editors often want recently ended grants too — researchers writing up.

---

## Recency window

User picker: 12, 24, 36, or 48 months. Filter applies to `start_date`, not `end_date`.

---

## Five sortable columns (cross-source)

| # | Column | Type | Notes |
|---|--------|------|-------|
| 1 | PI name | string | First listed PI from source record |
| 2 | Institution | string | Includes country code; first listed |
| 3 | Funder | string | Display name from source |
| 4 | Grant amount | numeric | Native currency + USD-converted; explicit `n/a` when missing (very common in OpenAIRE) |
| 5 | Recency | months since `start_date` | Derived consistently |

Source-specific extras (DOI of resulting works, OpenAlex Topic IDs, OpenAIRE FOS codes, project URL, abstract snippet) live in expandable row details. Each row shows a `source` badge: `OpenAlex` or `OpenAIRE`.

---

## Filters (separate from sort)

- Funder name (multi-select, populated from query results)
- Recency window (12/24/36/48 months)
- Active status (`active` / `recently ended` / `both`)
- Grant size band (`<$100k` / `$100k–$1M` / `>$1M` / unknown)
- Country (multi-select)
- Source (`OpenAlex` / `OpenAIRE` / `both`)

---

## OpenAlex API essentials

```
Base: https://api.openalex.org

Key endpoints:
  /awards?search={q}&filter=...                   → award records (NEW: first-class entity, Q1 2026)
  /awards/{id}                                    → single award
  /funders?search={name}                          → resolve funder name to ID
  /funders/{id}                                   → funder details
  /works?filter=author.id:{id},type:article
        &sort=publication_date:desc&per_page=1    → most recent corresponding-author work for PI email
  /authors/{id}                                   → author canonical record (orcid, last_known_institution)
  /topics?search={q}                              → optional disambiguation for OpenAlex side

Always: per_page=200, mailto=matteo@... (Polite Pool), 60ms delay between pages
Hard limit: 10,000 results per query
NEVER filter funder by free-text name — resolve to OpenAlex funder ID first

Caveats:
  - /awards is brand new (Q1 2026) — wrap in adapter, schema may shift
  - Funder coverage skews to Crossref-registered (US/EU heavy)
  - 27M of the funder→work links are extracted from full-text PDFs and probabilistic
```

---

## OpenAIRE Graph API essentials

```
Base: https://api.openaire.eu/graph

Key endpoints:
  /projects?search={q}&page=1&pageSize=50         → project records
  /projects/{id}                                  → single project
  /organizations/{id}                             → institution lookup

DO NOT USE: api.openaire.eu/search/projects (deprecated, dies 2026-05-31)

Public access: no auth required for v1. Rate-limited but adequate for editorial use.
DO NOT embed client_secret in browser. Authenticated tier deferred to v2 (would
need a thin proxy or per-user tokens).

CORS: confirm in spike before locking in static-only architecture. If CORS blocks
browser calls, v1 needs a Cloudflare Worker proxy (~30 LoC, no secrets stored).

Hard limit: 10,000 results per query (traditional paging); cursor-based for more.

Field gotchas:
  - Grant amount frequently null
  - Currency varies (EUR, GBP, USD); store native, display USD-converted
  - PI not always exposed — fall back to project coordinator
  - Subject classification uses FOS (Fields of Science), NOT OpenAlex Topics
```

---

## PI email enrichment

Reliable path: PI's most recent paper as corresponding author.

```
1. Resolve PI name → OpenAlex Author ID (via /authors?search=)
2. Fetch /works?filter=author.id:{id},authorship.is_corresponding:true
        &sort=publication_date:desc&per_page=1
3. Extract corresponding_author_email from the work record
4. Display as mailto: with tooltip "Source: most recent paper [DOI]"
5. Fallback: ORCID public email → null (do not scrape institutional pages)
```

Privacy note: corresponding-author emails are already public in published papers. This is reuse, not new exposure. Tool must show provenance on every email.

---

## App structure

| Tab | Purpose |
|-----|---------|
| Search | Keyword + filters + run button. Topic disambiguation panel (OpenAlex only). |
| Results | Sortable table (5 columns) — PRIMARY EDITORIAL WORKING SURFACE. CSV export. Coverage banner persistent. |
| About | Methodology, data sources, limitations, version, link to repo. |

No saved-search UI. No accounts. No alerts. Stateless.

---

## Repo structure

```
src/
  App.jsx                 ← main app, tab routing
  api/
    openalex.js           ← OpenAlex fetch logic ONLY
    openaire.js           ← OpenAIRE Graph fetch logic ONLY
    enrichment.js         ← PI email lookup, ORCID fallback
  analytics.js            ← pure normalisation/merging (no fetch, no UI)
  csv.js                  ← shared CSV schema (suite-coherent)
  components/
    SearchPanel.jsx
    TopicDisambiguator.jsx
    ResultsTable.jsx
    FilterBar.jsx
    CoverageBanner.jsx
    ExpandableRow.jsx
    AboutTab.jsx
public/
  index.html
.github/workflows/        ← deploy to gh-pages
```

---

## Key functions to implement in analytics.js

```js
normaliseAward(rec, source)          → CanonicalGrant   // unifies OpenAlex + OpenAIRE
mergeAndDedupe(grants)               → CanonicalGrant[] // funder + award_id + PI key
classifyActive(grant, today)         → 'active' | 'recently_ended' | 'unknown'
monthsSince(dateStr, today)          → number | null
applyFilters(grants, filterState)    → CanonicalGrant[]
sortBy(grants, columnKey, direction) → CanonicalGrant[]
toUSD(amount, currency, fxRates)     → number | null    // static FX table acceptable in v1
```

CanonicalGrant shape:
```js
{
  source: 'openalex' | 'openaire',
  id, title, funder, funderId, country,
  pi: { name, openalexId, orcid },
  institution, institutionCountry,
  amount, amountUSD, currency,
  startDate, endDate, recencyMonths,
  active: 'active' | 'recently_ended' | 'unknown',
  topics: [], fos: [],          // source-specific
  workSampleDOI                  // for email provenance
}
```

---

## Design language

Inherit from `journal-overlap` and `journal-profiler`:

```js
bg: "#0d111c"      surface: "#131826" / "#161b2a"
border: "#1e2436"  border2: "#2d3449"
textPrimary: "#e2e8f0"   textMuted: "#718096"
blue: "#63b3ed"    amber: "#f6ad55"    green: "#9ae6b4"
fonts: IBM Plex Mono (UI) + IBM Plex Sans (labels)
```

Carry over: search input, paste modal, AbortController + cancel, progress bars, expandable rows, footer attribution, CSV export pattern, dark/light theme tokens.

Do NOT carry over: journal-overlap's intersection logic, journal-profiler's signal computation modules (different problem domain).

---

## State shape (sketch)

```js
{
  query: { keywords: '', topicIds: [], submittedAt: null },
  filters: {
    recencyMonths: 24,
    active: 'both',           // 'active' | 'recently_ended' | 'both'
    funders: [],              // multi-select
    sizeBands: [],            // multi-select
    countries: [],
    sources: ['openalex', 'openaire']
  },
  results: {
    raw: { openalex: [], openaire: [] },
    canonical: [],            // post-merge
    loading: false,
    errors: []
  },
  sort: { column: 'recency', direction: 'asc' },
  ui: { tab: 'search', expandedRow: null, theme: 'dark' }
}
```

---

## CSV export schema

Reuse the suite-shared CSV schema. Where columns don't apply to grant records (e.g. citation counts), leave empty rather than omit. Schema header must match journal-overlap and journal-profiler exports for downstream interoperability.

---

## References

- OpenAlex Awards: https://docs.openalex.org/api-entities/awards
- OpenAlex funding metadata blog: https://blog.openalex.org/funding-metadata-in-openalex/
- OpenAIRE Graph API: https://graph.openaire.eu/docs/apis/graph-api/
- OpenAIRE Search API deprecation notice: https://graph.openaire.eu/docs/apis/search-api/
- AIDI journal: https://advanced.onlinelibrary.wiley.com/journal/29439981
- Parent projects: https://github.com/teowaits/journal-overlap, https://github.com/teowaits/journal-profiler

---
*Author: teowaits · April 2026 · MIT*
