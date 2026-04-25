import { C } from "../constants.js";

export default function SortableHeader({ label, columnKey, sort, onSort, style = {} }) {
  const active = sort.column === columnKey;
  const chevron = active ? (sort.direction === "asc" ? " ↑" : " ↓") : "";

  return (
    <div
      onClick={() => onSort(columnKey)}
      style={{
        cursor: "pointer", userSelect: "none",
        color: active ? C.textPrimary : C.textMuted,
        fontWeight: active ? 600 : 400,
        fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em",
        transition: "color 0.15s",
        ...style,
      }}
    >
      {label}{chevron}
    </div>
  );
}
