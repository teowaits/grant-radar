import { describe, it, expect } from "vitest";
import { toRow } from "../csv.js";
import { FX_DATE } from "../constants.js";

const baseGrant = {
  source: "openalex",
  title: "Autonomous Materials Discovery",
  funder: "European Commission",
  funderAwardId: "856405",
  pi: { name: "Cooper, Andrew", orcid: "0000-0001-2345-6789", email: "a.cooper@soton.ac.uk" },
  institution: "University of Southampton",
  institutionCountry: "UK",
  startDate: "2020-10-01",
  endDate: "2027-03-31",
  active: "active",
  recencyMonths: 66,
  amount: 9999283,
  currency: "EUR",
  amountUSD: 10799025,
  topics: ["machine learning", "materials science"],
  fos: [],
  landingPageUrl: "https://cordis.europa.eu/project/id/856405",
  workSampleDOI: "10.3030/856405",
};

describe("toRow", () => {
  const row = toRow(baseGrant, { query: "autonomous discovery" });

  it("first column is 'grant'", () => expect(row[0]).toBe("grant"));
  it("second column is source", () => expect(row[1]).toBe("openalex"));
  it("title in third column", () => expect(row[2]).toBe("Autonomous Materials Discovery"));
  it("funder in fourth column", () => expect(row[3]).toBe("European Commission"));
  it("PI name present", () => expect(row[5]).toBe("Cooper, Andrew"));
  it("PI ORCID present", () => expect(row[6]).toBe("0000-0001-2345-6789"));
  it("PI email present", () => expect(row[7]).toBe("a.cooper@soton.ac.uk"));
  it("FX date matches constant", () => expect(row[17]).toBe(FX_DATE));
  it("size band computed correctly (>$1M)", () => expect(row[18]).toBe(">$1M"));
  it("topics joined with semicolon", () => expect(row[19]).toBe("machine learning; materials science"));
  it("note includes coverage disclaimer", () => {
    expect(row[22]).toContain("Coverage:");
    expect(row[22]).toContain("Asian national funders");
  });
  it("note includes query", () => expect(row[22]).toContain("autonomous discovery"));

  it("null PI fields produce empty strings", () => {
    const r = toRow({ ...baseGrant, pi: { name: null, orcid: null, email: null } });
    expect(r[5]).toBe("");
    expect(r[6]).toBe("");
    expect(r[7]).toBe("");
  });

  it("unknown size band for null amountUSD", () => {
    const r = toRow({ ...baseGrant, amountUSD: null });
    expect(r[18]).toBe("unknown");
  });

  it("row length matches header count (23 columns)", () => {
    expect(row).toHaveLength(23);
  });
});
