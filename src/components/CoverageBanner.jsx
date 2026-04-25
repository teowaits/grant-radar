import { C } from "../constants.js";

export default function CoverageBanner() {
  return (
    <div style={{
      padding: "10px 18px",
      background: `${C.amber}11`,
      border: `1px solid ${C.amber}33`,
      borderRadius: 8,
      fontSize: 11,
      color: C.amber,
      lineHeight: 1.6,
    }}>
      <strong>Coverage in v1:</strong> OpenAlex Awards + OpenAIRE Graph.
      {" "}Asian national funders (NSFC, JST, NRF-Korea) and private/philanthropic foundations
      are under-represented. Results reflect what these sources index, not the global grant landscape.
    </div>
  );
}
