# Test Fixtures

Pinned API responses used for unit tests. Do **not** fetch live in tests.

## Refresh policy

Target: every **6 months**. Procedure:
1. Run `curl` commands below, overwrite the file.
2. Re-run the test suite — if schema fields changed, update the normaliser in `src/api/openalex.js` or `src/api/openaire.js` and then `src/analytics.js`.
3. Commit fixture + normaliser changes together.

## Commands

```sh
# OpenAlex Awards (2 records, query: autonomous discovery)
curl -s "https://api.openalex.org/awards?search=autonomous+discovery&per_page=2&mailto=mcavalleri@wiley.com" \
  > src/__tests__/fixtures/openalex_awards.json

# OpenAIRE Graph v1 Projects (2 records, query: self-driving laboratory)
curl -s "https://api.openaire.eu/graph/v1/projects?search=self-driving+laboratory&pageSize=2" \
  > src/__tests__/fixtures/openaire_projects.json
```

## Known schema notes (as of 2026-04-25)

- `openalex /awards`: `lead_investigator.given_name` and `family_name` are often null — PI name is sparse.
- `openaire /graph/v1/projects`: no PI field at all. `granted.fundedAmount` may be 0 even if a real amount exists.
- `openaire` base path is `/graph/v1/` — NOT `/graph/` (CLAUDE.md has a typo).
