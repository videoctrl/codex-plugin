export type OverlayRendererProps = {
  text?: string;
};

export function OverlayRenderer({ text }: OverlayRendererProps) {
  if (!text) {
    return null;
  }

  return <div className="overlay-text">{text}</div>;
}
