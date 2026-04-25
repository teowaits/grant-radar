export const C = {
  bg: "#0d111c", bgDark: "#0a0e1a", surface: "#131826", surface2: "#161b2a",
  border: "#1e2436", border2: "#2d3449",
  textPrimary: "#e2e8f0", textSecondary: "#a0aec0", textMuted: "#718096",
  blue: "#63b3ed", blueLight: "#90cdf4",
  amber: "#f6ad55", amberLight: "#fbd38d",
  green: "#9ae6b4", greenDark: "#68d391",
  red: "#fc8181",
};

export const ghostBtn = {
  padding: "8px 18px", borderRadius: 7, border: `1px solid ${C.border2}`,
  background: "transparent", color: C.textSecondary, cursor: "pointer",
  fontFamily: "inherit", fontSize: 12, transition: "all 0.15s",
};

export const RECENCY_OPTIONS = [12, 24, 36, 48];
export const DEFAULT_RECENCY = 24;
export const PAGE_LIMIT = 5;
export const PER_PAGE = 200;
export const OPENAIRE_PER_PAGE = 50;

// Static FX rates — as of 2026-04-01. Display USD-converted figures with this attribution.
export const FX_DATE = "2026-04-01";
export const FX_TO_USD = {
  USD: 1,
  EUR: 1.08,
  GBP: 1.26,
  CHF: 1.12,
  CAD: 0.73,
  AUD: 0.64,
  NZD: 0.59,
  JPY: 0.0066,
  CNY: 0.138,
  KRW: 0.00072,
  SEK: 0.095,
  DKK: 0.145,
  NOK: 0.093,
  SGD: 0.74,
  HKD: 0.128,
  INR: 0.012,
  BRL: 0.18,
};

export const SIZE_BANDS = [
  { key: "small",   label: "<$100k",      min: 0,         max: 100_000 },
  { key: "medium",  label: "$100k–$1M",   min: 100_000,   max: 1_000_000 },
  { key: "large",   label: ">$1M",        min: 1_000_000, max: Infinity },
  { key: "unknown", label: "Unknown",     min: null,      max: null },
];
