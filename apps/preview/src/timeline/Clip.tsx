import type { CSSProperties } from "react";
import type { ReviewSelection } from "../api.js";

type ClipProps = {
  selection: ReviewSelection;
  index: number;
  selected?: boolean;
  onSelect: (id: string) => void;
};

export function Clip({ selection, index, selected, onSelect }: ClipProps) {
  return (
    <button
      type="button"
      className={selected ? "timeline-clip selected" : "timeline-clip"}
      style={{ "--clip-index": index } as CSSProperties}
      onClick={() => onSelect(selection.id)}
    >
      <span>{selection.label}</span>
      <code>{selection.id}</code>
    </button>
  );
}
