type PreviewPlayerProps = {
  src?: string;
};

export function PreviewPlayer({ src }: PreviewPlayerProps) {
  if (!src) {
    return (
      <div className="empty-preview">
        <span>No preview rendered yet</span>
      </div>
    );
  }

  return <video className="preview-video" src={src} controls playsInline />;
}
