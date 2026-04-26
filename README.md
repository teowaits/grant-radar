# Grant Radar

A private, browser-based tool for **early identification of researchers with active or recent grants** in user-defined fields, powered by the [OpenAlex](https://openalex.org) Awards endpoint and the [OpenAIRE](https://graph.openaire.eu) Graph API.

Given a set of subject-area keywords (and optionally a constrained set of OpenAlex Topics for disambiguation), the app queries both sources in parallel, merges results into a sortable and filterable table with explicit per-row source attribution, surfaces a work-sample DOI for each principal investigator, and exports the current view as a CSV.

> **Private tool** — intended to run locally. Not deployed as a public page. Built primarily for editorial commissioning at *Advanced Intelligent Discovery* (AIDI), but the keyword input keeps it transferable to any subject area.

---

## Features

| Mode | What it does |
|------|-------------|
| **Keyword search** | Free-text query against OpenAlex `/awards` and OpenAIRE `/graph/v1/projects` in parallel. AbortController-backed Run/Cancel. |
| **Topic disambiguation** | Optional collapsible panel suggesting OpenAlex Topic IDs from the user's keywords. Selecting topics narrows the OpenAlex query (AND with keywords). OpenAIRE side stays keyword-driven in v1. |
| **Sortable results table** | Five columns — PI name, institution, funder, grant amount (USD-converted), recency in months. Per-row source badge (OpenAlex / OpenAIRE). |
| **Filters** | Funder name (multi-select), recency window (12 / 24 / 36 / 48 months), active status (active / recently ended / both), grant size band, country, source. |
| **EU-skew warning** | Per-query inline warning when OpenAlex returns ≥ 5× more results than OpenAIRE. OpenAIRE indexes EU-funded research most thoroughly; thin counts on non-EU queries reflect indexing gaps, not research activity. |
| **Expandable rows** | On demand: work-sample DOI for the PI, OpenAlex Topic IDs, OpenAIRE FOS codes, project URL, abstract snippet, currency-of-record. Lazy-loaded; nothing fetched until you expand. |
| **CSV export** | 23-column suite-coherent schema (compatible with journal-overlap and journal-profile-analyser). Coverage disclaimer carried in the Note column on every row, so the file remains honest about its provenance after it leaves the tool. |

---

## Running Locally

**Requirements:** Node.js 18+ and npm.

```bash
# 1. Clone the repo
git clone https://github.com/teowaits/grant-radar.git
cd grant-radar

# 2. Install dependencies
npm install

# 3. Set your contact email for the OpenAlex Polite Pool (see Configuration)
#    Edit src/api/config.js and replace YOUR_EMAIL_HERE with your email.

# 4. Start the dev server
npm run dev
```

Then open [http://localhost:5173/grant-radar/](http://localhost:5173/grant-radar/) in your browser.

```bash
# Build for production
npm run build

# Preview the production build
npm run preview
```

No API key is required for either OpenAlex or OpenAIRE — both are free and open. For sustained heavy usage you can register a polite-pool email at [openalex.org/settings/api](https://openalex.org/settings/api).

---

## Configuration

Before running, open `src/api/config.js` and replace the placeholder email:

```js
// Before:
mailto: 'YOUR_EMAIL_HERE@example.com',

// After (use your own contact email):
mailto: 'you@example.com',
```

OpenAlex uses this header to put your requests in their Polite Pool, which gives you better rate limits. It is not authentication and not a secret — but it should be **your** address rather than a placeholder, so OpenAlex can reach you if your usage pattern triggers a question on their end.

---

## How It Works

1. **Parallel querying** — every search runs against OpenAlex `/awards` and OpenAIRE `/graph/v1/projects` concurrently via `Promise.allSettled`. A failure or empty result on one source does not block the other.
2. **Normalisation** — each source's response is mapped to a canonical grant shape with consistent field names, currencies captured in source form, USD-converted figures derived from a static FX table snapshot, and an `active` classification (`active` / `recently_ended` / `unknown`) computed from `start_date` and `end_date`.
3. **Source merging** — v1 keeps duplicates with explicit source badges rather than fuzzy-merging across sources. A grant funded by Horizon Europe that appears in both OpenAlex and OpenAIRE will show as two rows with different badges. This keeps the tool honest about what each source actually returned.
4. **Filters and sort** — applied client-side over the merged result set. Filter values populate from the actual results (only funders that appear in this query are shown in the funder filter dropdown).
5. **Per-query EU-skew warning** — when OpenAlex result count is at least 5× the OpenAIRE count, an inline neutral-language banner appears at the top of the Results view. This is in addition to the persistent global coverage banner.
6. **Lazy enrichment** — when a row is expanded, the tool fetches the PI's most recent corresponding-author paper from OpenAlex Works and surfaces the DOI for editorial outreach. The OpenAlex public API does not expose corresponding-author email addresses; editors click through to the publisher page to retrieve contact details from the published article.
7. **Cancellation** — every in-flight request is bound to a single AbortController. Hitting Cancel (or starting a new search) aborts both sources cleanly.
8. **Export** — the CSV writes the currently filtered, currently sorted view. What you see is what you get.

### Practical limits

| Cap | Value |
|-----|-------|
| Default results per source per search | 1,000 (5 pages × 200) |
| "Load more" cap per source | 10,000 (OpenAlex / OpenAIRE hard ceiling) |
| Inter-request delay | 60 ms |
| Recency windows | 12 / 24 / 36 / 48 months |

---

## Important Limitations

This tool is honest about what it does not cover. Reading this section before forming conclusions from any search is strongly recommended.

**OpenAIRE coverage skews heavily to EU-funded research.** OpenAIRE indexes Horizon Europe, the ERC, and EU national funders most thoroughly. For research areas that are predominantly non-EU, OpenAIRE counts can be much lower than OpenAlex counts for the same query — this reflects indexing gaps, not absence of research activity. Empirical examples from Q2 2026:

| Query | OpenAlex | OpenAIRE |
|-------|----------|----------|
| `self-driving laboratory` | 102 | 2 |
| `autonomous discovery` | 441 | 29 |

The tool surfaces a per-query warning whenever this asymmetry triggers. Take it seriously.

**No principal-investigator emails.** The OpenAlex public API does not expose corresponding-author email addresses (the `corresponding_author_ids` field is an array of OpenAlex Author IDs, not email addresses). The tool surfaces the most-recent-paper DOI for each PI instead, with a clear "No public email · Most recent paper: [DOI]" indicator. Editors retrieve contact details from the publisher page. This is one extra click and is honest about what the API can and cannot deliver.

**Asian national funders and private/philanthropic foundations are under-represented in v1.** OpenAlex coverage of Crossref-registered funders skews to the US and EU; KAKEN (Japan), NTIS (South Korea), IGMS (Singapore), Open Philanthropy, Schmidt Sciences and Wellcome are documented v2 targets but are not searched in v1. The OpenAlex Wellcome-funded global funder integration project, announced January 2026, is improving this on the OpenAlex side independently of Grant Radar.

**OpenAlex `/awards` is a new endpoint (Q1 2026).** The schema may evolve. The adapter pattern in `api/openalex.js` contains the impact of any change to a single file, and `__tests__/fixtures/` pins reference responses captured during the v1 build. Refresh fixtures every six months.

**Grant amount is heterogeneous.** Currencies vary; many records have no amount at all (especially OpenAIRE). The tool stores native currency, displays a USD-converted figure from a static FX snapshot, and renders `n/a` explicitly rather than zero when the amount is missing. The static FX table is fine for editorial use but is not real-time.

---

## How to Use It Well

A few practical notes from building and using the tool:

1. **Start broad, then narrow.** Run an initial query without topic disambiguation and look at the overall result count split between sources. If OpenAlex returns 400+ and OpenAIRE returns under 30, the EU-skew warning will fire — that's expected for non-EU-heavy fields, not a problem with your query.
2. **Use the recency window as a primary lever.** 12 months catches the freshest grants where output is still pending; 24 months is the default sweet spot; 36 and 48 broaden the net for slower-moving fields.
3. **Read source badges.** Every row tells you which source it came from. A grant appearing in both sources will appear as two rows — this is intentional in v1, and keeps you honest about what each source actually returned.
4. **Treat thin OpenAIRE counts as an indexing signal, not a research signal.** For research areas that are predominantly non-EU, OpenAIRE will return very few results. The tool warns about this; don't infer that "Europe is barely doing this" from a low OpenAIRE count.
5. **Use the work-sample DOI.** When you expand a row, the DOI link takes you to the most recent paper from that PI as corresponding author. Click through to the publisher page for contact details — that's the contact path, not a missing feature.

---

## Companion Tools

| Tool | Purpose |
|------|---------|
| [journal-overlap](https://github.com/teowaits/journal-overlap) | Authorship overlap between two sets of journals |
| journal-profile-analyser | Topic and venue profiling for a journal (in development) |
| [gem-finder](https://github.com/teowaits/gem_finder) | Recent preprint discovery on arXiv and chemRxiv |

All four tools share a CSV schema for cross-tool import/export.

---

## Roadmap

| Version | Status | Scope |
|---------|--------|-------|
| **v1** | Released (April 2026) | OpenAlex Awards + OpenAIRE Graph; keyword + filters; sortable table; CSV export; lazy DOI enrichment; local-only |
| **v2** | Documented in `CLAUDE.docx` | Asian funder adapters (KAKEN, NTIS, IGMS); cross-source topic translation (OpenAlex Topics → OpenAIRE FOS); ORCID enrichment expansion |
| **v3** | Roadmap | Saved searches and email alerts (requires backend); Candid / 360Giving for private and philanthropic funders |

Feature suggestions and use-case feedback welcome via [GitHub Issues](https://github.com/teowaits/grant-radar/issues).

---

## Data & Acknowledgements

Scholarly metadata is provided by:

- **[OpenAlex](https://openalex.org)** — a fully open, free index of global research output maintained by [OurResearch](https://ourresearch.org). OpenAlex data is released under the [CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/) public domain dedication.
- **[OpenAIRE Graph](https://graph.openaire.eu)** — an open scholarly knowledge graph aggregating publications, datasets, software, and projects. Funded by the European Commission and operated by the OpenAIRE consortium.

> Priem, J., Piwowar, H., & Orr, R. (2022). OpenAlex: A fully-open index of the world's research. *arXiv*. https://doi.org/10.48550/arXiv.2205.01833

> Manghi, P., Bardi, A., Atzori, C., Baglioni, M., Manola, N., Schirrwagen, J., & Principe, P. (2019). The OpenAIRE Research Graph Data Model. *Lecture Notes in Computer Science*. https://doi.org/10.1007/978-3-030-30760-8_28

---

## Created By

**[teowaits](https://github.com/teowaits)**

This tool was built with the assistance of [Claude Sonnet 4.6](https://www.anthropic.com/claude) by Anthropic, following OpenAlex and OpenAIRE API best practices:

- Adapter-per-source design so any schema shift is a one-file change
- `Promise.allSettled` so a failure on one source does not block the other
- Pre-flight CORS verification at the start of the build to confirm static-only viability
- Lazy enrichment on row expand rather than eager enrichment at table render
- Pinned response fixtures for unit tests against pure-function normalisers
- AbortController cancellation on every in-flight request
- Honest in-product surfacing of source-coverage asymmetry rather than silent merging

The design rationale for every non-obvious decision is captured in [`CLAUDE.docx`](./CLAUDE.docx); the lean machine-readable brief for Claude Code sessions is in [`CLAUDE.md`](./CLAUDE.md).

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| **1.0.0** | 2026-04-26 | Initial release — parallel OpenAlex Awards + OpenAIRE Graph queries, keyword search with optional OpenAlex Topic disambiguation, five sortable columns, full filter set, per-query EU-skew warning, lazy DOI enrichment, 23-column suite-coherent CSV export, 61 unit tests against pinned fixtures, local-only |

---

## License

[MIT](LICENSE)
