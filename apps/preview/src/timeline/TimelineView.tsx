import { Clip } from "./Clip.js";
import { Playhead } from "./Playhead.js";
import { Track } from "./Track.js";
import type { ReviewSelection } from "../api.js";

export function TimelineView({
  selections,
  selectedId,
  onSelect
}: {
  selections: ReviewSelection[];
  selectedId?: string;
  onSelect: (id: string) => void;
}) {
  const tracks = [
    { name: "Clips", selections: selections.filter((selection) => selection.kind === "clip") },
    { name: "Captions", selections: selections.filter((selection) => selection.kind === "caption") },
    { name: "Variants", selections: selections.filter((selection) => selection.kind === "variant") },
    { name: "Handoffs", selections: selections.filter((selection) => selection.kind === "handoff") }
  ];
  return (
    <section className="timeline-panel" aria-label="Timeline">
      <div className="timeline-header">
        <h2>Timeline</h2>
        <span>{selections.length === 0 ? "No selections yet" : `${selections.length} review targets`}</span>
      </div>
      <div className="timeline-surface">
        <Playhead />
        {tracks.map((track) => (
          <Track key={track.name} name={track.name}>
            {track.selections.length === 0 ? <span className="empty-track">Not ready yet</span> : null}
            {track.selections.map((selection, index) => (
              <Clip
                key={selection.id}
                selection={selection}
                index={index}
                selected={selection.id === selectedId}
                onSelect={onSelect}
              />
            ))}
          </Track>
        ))}
      </div>
    </section>
  );
}
