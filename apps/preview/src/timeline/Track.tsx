import { ReactNode } from "react";

type TrackProps = {
  name: string;
  children: ReactNode;
};

export function Track({ name, children }: TrackProps) {
  return (
    <div className="track-row">
      <div className="track-label">{name}</div>
      <div className="track-clips">{children}</div>
    </div>
  );
}
