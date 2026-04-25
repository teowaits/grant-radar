import { describe, it, expect } from "vitest";
import {
  monthsSince, classifyActive, toUSD,
  normaliseAward, enrichDates, applyFilters, sortBy,
} from "../analytics.js";
import openalexFixture from "./fixtures/openalex_awards.json";
import openaireFixture from "./fixtures/openaire_projects.json";

const TODAY = new Date("2026-04-25");

// ─── monthsSince ─────────────────────────────────────────────────────────────

describe("monthsSince", () => {
  it("returns 0 for today", () => {
    expect(monthsSince("2026-04-25", TODAY)).toBe(0);
  });
  it("counts whole months back", () => {
    expect(monthsSince("2024-04-25", TODAY)).toBe(24);
  });
  it("returns null for null input", () => {
    expect(monthsSince(null, TODAY)).toBeNull();
  });
  it("returns null for invalid date string", () => {
    expect(monthsSince("not-a-date", TODAY)).toBeNull();
  });
  it("never returns negative", () => {
    expect(monthsSince("2030-01-01", TODAY)).toBe(0);
  });
});

// ─── classifyActive ──────────────────────────────────────────────────────────

describe("classifyActive", () => {
  it("active when today is between start and end", () => {
    expect(classifyActive({ startDate: "2025-01-01", endDate: "2027-01-01" }, TODAY)).toBe("active");
  });
  it("recently_ended when end is in the past", () => {
    expect(classifyActive({ startDate: "2023-01-01", endDate: "2025-01-01" }, TODAY)).toBe("recently_ended");
  });
  it("active when no end date and start within recency window", () => {
    const g = { startDate: "2025-06-01", endDate: null, recencyMonths: 24 };
    expect(classifyActive(g, TODAY)).toBe("active");
  });
  it("recently_ended when no end date and start outside window", () => {
    const g = { startDate: "2020-01-01", endDate: null, recencyMonths: 24 };
    expect(classifyActive(g, TODAY)).toBe("recently_ended");
  });
  it("unknown when no start date", () => {
    expect(classifyActive({ startDate: null, endDate: null }, TODAY)).toBe("unknown");
  });
});

// ─── toUSD ───────────────────────────────────────────────────────────────────

describe("toUSD", () => {
  it("returns same value for USD", () => {
    expect(toUSD(1000, "USD")).toBe(1000);
  });
  it("converts EUR at known rate", () => {
    expect(toUSD(1000, "EUR")).toBe(1080);
  });
  it("returns null for null amount", () => {
    expect(toUSD(null, "USD")).toBeNull();
  });
  it("returns null for unknown currency", () => {
    expect(toUSD(1000, "XYZ")).toBeNull();
  });
  it("handles lowercase currency", () => {
    expect(toUSD(1000, "eur")).toBe(1080);
  });
});

// ─── normaliseAward (OpenAlex) ────────────────────────────────────────────────

describe("normaliseAward — openalex", () => {
  const rec = openalexFixture.results[0];
  const g = normaliseAward(rec, "openalex");

  it("source is openalex", () => expect(g.source).toBe("openalex"));
  it("has id", () => expect(g.id).toBeTruthy());
  it("has title", () => expect(g.title).toBeTruthy());
  it("has funder display name", () => expect(g.funder).toBeTruthy());
  it("has funderId", () => expect(g.funderId).toBeTruthy());
  it("has currency", () => expect(g.currency).toBeTruthy());
  it("computes amountUSD when amount and currency present", () => {
    if (g.amount && g.currency) expect(typeof g.amountUSD).toBe("number");
  });
  it("has startDate", () => expect(g.startDate).toBeTruthy());
  it("pi is object with name/openalexId/orcid keys", () => {
    expect(g.pi).toHaveProperty("name");
    expect(g.pi).toHaveProperty("openalexId");
    expect(g.pi).toHaveProperty("orcid");
  });
  it("active and recencyMonths are null before enrichDates", () => {
    expect(g.active).toBeNull();
    expect(g.recencyMonths).toBeNull();
  });
});

// ─── normaliseAward (OpenAIRE) ───────────────────────────────────────────────

describe("normaliseAward — openaire", () => {
  const rec = openaireFixture.results[0];
  const g = normaliseAward(rec, "openaire");

  it("source is openaire", () => expect(g.source).toBe("openaire"));
  it("has id", () => expect(g.id).toBeTruthy());
  it("has title", () => expect(g.title).toBeTruthy());
  it("pi.name is null (not in v1 schema)", () => expect(g.pi.name).toBeNull());
  it("has funder from fundings[0]", () => expect(g.funder).toBeTruthy());
  it("active and recencyMonths are null before enrichDates", () => {
    expect(g.active).toBeNull();
    expect(g.recencyMonths).toBeNull();
  });
});

// ─── enrichDates ─────────────────────────────────────────────────────────────

describe("enrichDates", () => {
  it("populates recencyMonths and active", () => {
    const raw = normaliseAward(openalexFixture.results[0], "openalex");
    const g = enrichDates(raw, TODAY);
    expect(typeof g.recencyMonths).toBe("number");
    expect(["active", "recently_ended", "unknown"]).toContain(g.active);
  });
});

// ─── applyFilters ─────────────────────────────────────────────────────────────

describe("applyFilters", () => {
  const base = {
    source: "openalex", active: "active", recencyMonths: 18,
    funder: "European Commission", amountUSD: 500_000, institutionCountry: "UK",
  };

  const defaultFilters = {
    recencyMonths: 24, active: "both", funders: [], sizeBands: [], countries: [], sources: [],
  };

  it("passes all grants with default filters", () => {
    expect(applyFilters([base], defaultFilters)).toHaveLength(1);
  });

  it("filters by source", () => {
    const f = { ...defaultFilters, sources: ["openaire"] };
    expect(applyFilters([base], f)).toHaveLength(0);
  });

  it("filters by active status", () => {
    const f = { ...defaultFilters, active: "recently_ended" };
    expect(applyFilters([base], f)).toHaveLength(0);
  });

  it("filters by recency window", () => {
    const f = { ...defaultFilters, recencyMonths: 12 };
    expect(applyFilters([base], f)).toHaveLength(0);
  });

  it("filters by funder", () => {
    const f = { ...defaultFilters, funders: ["NIH"] };
    expect(applyFilters([base], f)).toHaveLength(0);
  });

  it("filters by size band — medium passes", () => {
    const f = { ...defaultFilters, sizeBands: ["medium"] };
    expect(applyFilters([base], f)).toHaveLength(1);
  });

  it("filters by size band — large excluded", () => {
    const f = { ...defaultFilters, sizeBands: ["large"] };
    expect(applyFilters([base], f)).toHaveLength(0);
  });

  it("unknown band matches null amountUSD", () => {
    const g = { ...base, amountUSD: null };
    const f = { ...defaultFilters, sizeBands: ["unknown"] };
    expect(applyFilters([g], f)).toHaveLength(1);
  });

  it("filters by country", () => {
    const f = { ...defaultFilters, countries: ["DE"] };
    expect(applyFilters([base], f)).toHaveLength(0);
  });
});

// ─── sortBy ──────────────────────────────────────────────────────────────────

describe("sortBy", () => {
  const grants = [
    { pi: { name: "Zebra, Ann" }, institution: "MIT", funder: "NSF", amountUSD: 200_000, recencyMonths: 6 },
    { pi: { name: "Apple, Bob" }, institution: "Oxford", funder: "ERC", amountUSD: 900_000, recencyMonths: 24 },
    { pi: { name: null },         institution: null,    funder: null, amountUSD: null,    recencyMonths: null },
  ];

  it("sorts by PI name asc", () => {
    const r = sortBy(grants, "pi", "asc");
    expect(r[0].pi.name).toBe("Apple, Bob");
  });
  it("sorts by amount desc", () => {
    const r = sortBy(grants, "amount", "desc");
    expect(r[0].amountUSD).toBe(900_000);
  });
  it("null amounts sort last in desc", () => {
    const r = sortBy(grants, "amount", "desc");
    expect(r[r.length - 1].amountUSD).toBeNull();
  });
  it("sorts by recency asc (most recent first)", () => {
    const r = sortBy(grants, "recency", "asc");
    expect(r[0].recencyMonths).toBe(6);
  });
  it("does not mutate original array", () => {
    const original = [...grants];
    sortBy(grants, "pi", "asc");
    expect(grants).toEqual(original);
  });
});
