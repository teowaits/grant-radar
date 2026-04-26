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
| "No public email · Most recent paper: [DOI]" | (claiming an email is available when none is) |
| "OpenAIRE coverage skews EU; results from non-EU regions may be lower than the OpenAlex count for the same query due to indexing gaps, not research activity" | (silent on the EU-skew) |

### Mandatory Results-view warning (in addition to the persistent coverage banner)

When results are displayed, the tool **must** surface a per-query, per-source asymmetry warning whenever the OpenAlex result count materially exceeds the OpenAIRE count (rule of thumb: OpenAlex returns ≥ 5× OpenAIRE). The warning sits inline with the result counts at the top of the Results view, in neutral language, and reads (or equivalent):

> *OpenAIRE returned {n} results vs {N} from OpenAlex for this query. OpenAIRE indexes EU-funded research most thoroughly; thin counts here likely reflect indexing gaps for non-EU funders rather than absence of research activity.*

This is **separate from** the persistent coverage banner. The banner is global ("here's what v1 covers"); this warning is per-query ("here's what this specific query's source split is telling you to be careful about"). Both must be present.

---

## Phase scope

| Phase | In scope | Out |
|-------|----------|-----|
| **v1 (build)** | OpenAlex `/awards` + OpenAIRE Graph `projects`. Keyword + recency + active filter + funder + size filters. 5 sortable columns. PI work-sample DOI surfaced for editorial outreach (no email available from public sources). CSV export. | Asian funder APIs, OpenAIRE topic translation, ORCID auth, alerts, saved searches. |
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
        &sort=publication_date:desc&per_page=1    → most recent paper for PI; surface DOI for editorial outreach
  /authors/{id}                                   → author canonical record (orcid, last_known_institution)
  /topics?search={q}                              → optional disambiguation for OpenAlex side

Always: per_page=200, mailto=mcavalleri@wiley.com (Polite Pool), 60ms delay between pages
Hard limit: 10,000 results per query
NEVER filter funder by free-text name — resolve to OpenAlex funder ID first

Caveats:
  - /awards is brand new (Q1 2026) — wrap in adapter, schema may shift
  - Funder coverage skews to Crossref-registered (US/EU heavy)
  - 27M of the funder→work links are extracted from full-text PDFs and probabilistic
  - OpenAlex public API does NOT expose corresponding-author emails. The `corresponding_author_ids`
    field is an array of OpenAlex Author IDs, not addresses. Do not attempt to extract emails.
    Surface the work-sample DOI instead and let editors get contact details from the publisher page.
```

---

## OpenAIRE Graph API essentials

```
Base: https://api.openaire.eu/graph/v1

Key endpoints:
  /graph/v1/projects?search={q}&page=1&pageSize=50    → project records
  /graph/v1/projects/{id}                             → single project
  /graph/v1/organizations/{id}                        → institution lookup

DO NOT USE: api.openaire.eu/search/projects (deprecated, dies 2026-05-31)
DO NOT USE: api.openaire.eu/graph/projects (returns 405 — must include /v1/)

Public access: no auth required for v1. Rate-limited but adequate for editorial use.
DO NOT embed client_secret in browser. Authenticated tier deferred to v2 (would
need a thin proxy or per-user tokens).

CORS: confirmed in Q2 2026 spike. Access-Control-Allow-Origin: * present on
both /awards (OpenAlex) and /graph/v1/projects (OpenAIRE). Static-only architecture viable.

Hard limit: 10,000 results per query (traditional paging); cursor-based for more.

Field gotchas:
  - Grant amount frequently null
  - Currency varies (EUR, GBP, USD); store native, display USD-converted
  - PI not always exposed — fall back to project coordinator
  - Subject classification uses FOS (Fields of Science), NOT OpenAlex Topics
  - Coverage skews HEAVILY to EU-funded research (Horizon Europe, ERC, national EU funders).
    Empirical Q2 2026 numbers for AIDI-relevant queries:
      "self-driving laboratory":   102 OpenAlex /  2 OpenAIRE
      "autonomous discovery":      441 OpenAlex / 29 OpenAIRE
    The Results view MUST surface this asymmetry so editors don't misread thin OpenAIRE
    counts as evidence of low non-EU activity.
```

---

## PI editorial outreach (work-sample DOI, not email)

The OpenAlex public API does **not** expose corresponding-author emails. This was an error in the original brief — the `corresponding_author_ids` field is an array of OpenAlex Author IDs, not addresses, and Crossref puts emails behind their authenticated Plus tier. The tool surfaces a work-sample DOI instead, and editors retrieve contact details from the publisher page.

```
1. Resolve PI name → OpenAlex Author ID (via /authors?search=)
2. Fetch /works?filter=author.id:{id},authorship.is_corresponding:true
        &sort=publication_date:desc&per_page=1
3. Extract the DOI from the work record (NOT an email — none is available)
4. Display in expandable row as: "No public email · Most recent paper: [DOI as link]"
5. Tooltip explains: "OpenAlex public API does not expose corresponding-author emails.
   Click the DOI to get contact details from the publisher page."
6. Fallback: if no corresponding-author work found, show "No public-domain DOI available
   for this PI" — do NOT scrape institutional pages, do NOT guess emails.
```

The enrichment fires **lazily on row expand**, never eagerly on table load. State per row: `loading | loaded | unavailable`. The `unavailable` state must be visible to editors (small grey indicator), not silently absent — otherwise editors think the lookup is broken when it's actually just doing its job on a PI who has no recent corresponding-author paper indexed.

---

## App structure

| Tab | Purpose |
|-----|---------|
| Search | Keyword + filters + run button. Topic disambiguation panel (OpenAlex only). |
| Results | Sortable table (5 columns) — PRIMARY EDITORIAL WORKING SURFACE. CSV export. Coverage banner persistent. Per-query source-asymmetry warning (see "Mandatory Results-view warning" above). Data freshness footer. |
| About | Methodology, data sources, limitations, version, link to repo. |

No saved-search UI. No accounts. No alerts. Stateless.

---

## Repo structure

```
src/
  App.jsx                 ← main app, tab routing
  constants.js            ← FX rates, filter options, recency choices, source config
  hooks/
    useSearch.js          ← AbortController, parallel fetch via Promise.allSettled, useReducer
  api/
    config.js             ← base URLs (incl. /graph/v1/), mailto, per-page values, headers
    openalex.js           ← OpenAlex fetch + normalise (single { search, fetchOne } adapter)
    openaire.js           ← OpenAIRE Graph fetch + normalise (single { search, fetchOne } adapter)
    enrichment.js         ← PI work-sample DOI lookup (NO email — see "PI editorial outreach" above)
  analytics.js            ← pure normalisation/merging (no fetch, no UI)
  csv.js                  ← shared CSV schema (suite-coherent)
  components/
    SearchPanel.jsx
    TopicDisambiguator.jsx
    ResultsTable.jsx
    SortableHeader.jsx    ← reusable column header with sort chevron
    FilterBar.jsx
    CoverageBanner.jsx       ← persistent, global
    SourceAsymmetryWarning.jsx ← per-query, inline at top of Results view
    DataFreshnessFooter.jsx
    ExpandableRow.jsx
    ProgressBar.jsx
    AboutTab.jsx
  __tests__/
    analytics.test.js
    csv.test.js
    openalex.normalise.test.js
    openaire.normalise.test.js
    fixtures/
      openalex_award.json    ← pinned live response from Q2 2026 spike
      openaire_project.json  ← pinned live response from Q2 2026 spike
      README.md              ← fixture refresh policy: re-capture every 6 months
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
  workSampleDOI                  // most-recent-paper DOI for editorial outreach
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
*Rev. April 2026 — post-spike corrections: OpenAIRE path, OpenAlex email field, EU-skew warning, repo structure aligned with built code.*
