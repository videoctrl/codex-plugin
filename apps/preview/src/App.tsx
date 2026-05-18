import {
  Captions,
  CheckCircle2,
  FileText,
  Film,
  FolderOpen,
  Image,
  Layers3,
  MousePointer2,
  PackageCheck,
  RefreshCw,
  Route,
  ShieldCheck,
  Sparkles,
  Target
} from "lucide-react";
import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { type ProjectReview, type ReviewSelection, readPreviewQuery, viteFileUrl } from "./api.js";
import { TimelineView } from "./timeline/TimelineView.js";
import { PreviewPlayer } from "./player/PreviewPlayer.js";

export function App() {
  const query = readPreviewQuery();
  const [review, setReview] = useState<ProjectReview | undefined>();
  const [loadError, setLoadError] = useState<string | undefined>();
  const [selectedId, setSelectedId] = useState<string | undefined>();

  useEffect(() => {
    const reviewUrl = viteFileUrl(query.review);
    if (!reviewUrl) {
      return;
    }
    let cancelled = false;
    fetch(reviewUrl)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Could not open review file.`);
        }
        return response.json() as Promise<ProjectReview>;
      })
      .then((nextReview) => {
        if (cancelled) {
          return;
        }
        setReview(nextReview);
        setSelectedId((current) => current ?? nextReview.selections[0]?.id);
      })
      .catch((error) => {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : String(error));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [query.review]);

  const selections = review?.selections ?? [];
  const selected = useMemo(
    () => selections.find((selection) => selection.id === selectedId) ?? selections[0],
    [selectedId, selections]
  );
  const videoUrl = viteFileUrl(review?.media.previewPath ?? query.video);
  const contactSheetUrl = viteFileUrl(review?.media.contactSheetPath ?? query.contactSheet);
  const intent = review?.intent;

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">VideoControl</p>
          <h1>Review console</h1>
        </div>
        <button className="icon-button" aria-label="Refresh preview" onClick={() => window.location.reload()}>
          <RefreshCw size={18} />
        </button>
      </header>

      {loadError ? <div className="notice">{loadError}</div> : null}

      <section className="workspace">
        <IntentPane intent={intent} reviewPath={query.review} />

        <div className="main-review">
          <div className="preview-pane">
            <PreviewPlayer src={videoUrl} />
          </div>
          {contactSheetUrl ? (
            <figure className="contact-sheet">
              <img src={contactSheetUrl} alt="Contact sheet" />
            </figure>
          ) : null}
        </div>

        <SelectedItemPane selected={selected} selections={selections} onSelect={setSelectedId} />
      </section>

      <TimelineView selections={selections} selectedId={selected?.id} onSelect={setSelectedId} />

      <section className="review-grid" aria-label="Creative review">
        <ReviewPanel
          icon={<FolderOpen size={18} />}
          title="Project"
          rows={[
            ["name", review?.project.name ?? query.project ?? "No project selected"],
            ["folder", review?.project.projectDir ?? query.project ?? "No project selected"],
            ["timeline", review?.timeline.version ?? query.timelineVersion ?? "No version selected"],
            ["duration", review?.timeline.durationSec ? `${review.timeline.durationSec}s` : "Not set"]
          ]}
        />
        <ReviewPanel
          icon={<Route size={18} />}
          title="Content record"
          rows={[
            ["name", query.content ?? "Untitled"],
            ["route", query.route ?? "Not selected"],
            ["state", query.state ?? "Review"],
            ["next", query.next ?? "Human review"],
            ["platform", query.platform ?? intent?.platformTargets[0] ?? "Not selected"]
          ]}
        />
        <ReviewPanel
          icon={<FileText size={18} />}
          title="Brief"
          rows={[
            ["status", query.brief ?? "Not loaded"],
            ["reader", "Set in brief"],
            ["proof", "Set in brief"],
            ["risk", "Check before approval"]
          ]}
        />
        <ReviewPanel
          icon={<Sparkles size={18} />}
          title="Variants"
          rows={[
            ["status", query.variants ?? countByKind(selections, "variant")],
            ["current", review?.timeline.version ?? query.timelineVersion ?? "None"],
            ["winner", "Pending"],
            ["feedback", latestNote(intent) ?? "Pending"]
          ]}
        />
        <ReviewPanel
          icon={<ShieldCheck size={18} />}
          title="Verification"
          rows={[
            ["status", query.verification ?? "Not scored"],
            ["voice", intent?.brandFeel[0] ?? "Needs review"],
            ["platform", intent?.platformTargets[0] ?? "Needs review"],
            ["approval", intent?.approvalNotes.at(-1) ?? "Needed"]
          ]}
        />
        <ReviewPanel
          icon={<PackageCheck size={18} />}
          title="Handoff"
          rows={[
            ["status", query.handoff ?? countByKind(selections, "handoff")],
            ["package", query.platform ?? intent?.platformTargets[0] ?? "Not selected"],
            ["caption", intent?.captionRules[0] ?? "Draft needed"],
            ["approval", "Needed"]
          ]}
        />
      </section>
    </main>
  );
}

function IntentPane({ intent, reviewPath }: { intent?: ProjectReview["intent"]; reviewPath?: string }) {
  return (
    <aside className="intent-pane" aria-label="Intent">
      <div className="panel-title">
        <Target size={18} />
        <h2>Intent</h2>
      </div>
      <p className="intent-summary">{intent?.summary ?? "No project intent loaded yet."}</p>
      <IntentGroup title="Visual style" items={intent?.visualStyle} />
      <IntentGroup title="Captions" items={intent?.captionRules} />
      <IntentGroup title="Safe zones" items={intent?.safeZoneRules} />
      <IntentGroup title="Platforms" items={intent?.platformTargets} />
      <IntentGroup title="Keep avoiding" items={intent?.avoid} />
      <div className="intent-note">
        <span>Review file</span>
        <strong>{reviewPath ?? "Open a project review"}</strong>
      </div>
    </aside>
  );
}

function IntentGroup({ title, items }: { title: string; items?: string[] }) {
  return (
    <section className="intent-group">
      <h3>{title}</h3>
      {(items?.length ?? 0) > 0 ? (
        <ul>
          {items?.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        <p>Not set yet.</p>
      )}
    </section>
  );
}

function SelectedItemPane({
  selected,
  selections,
  onSelect
}: {
  selected?: ReviewSelection;
  selections: ReviewSelection[];
  onSelect: (id: string) => void;
}) {
  return (
    <aside className="selected-pane" aria-label="Selected item">
      <div className="panel-title">
        <MousePointer2 size={18} />
        <h2>Selected item</h2>
      </div>

      {selected ? (
        <div className="selected-card">
          <span>{selected.kind}</span>
          <strong>{selected.label}</strong>
          <code>{selected.id}</code>
          <p>{selected.status ?? selected.note ?? "Ready for review."}</p>
        </div>
      ) : (
        <p className="empty-copy">Select a clip, caption, variant, asset, or handoff.</p>
      )}

      <div className="selection-list">
        {selections.map((selection) => (
          <button
            key={selection.id}
            type="button"
            className={selection.id === selected?.id ? "selection-row selected" : "selection-row"}
            onClick={() => onSelect(selection.id)}
          >
            {iconForSelection(selection.kind)}
            <span>{selection.label}</span>
          </button>
        ))}
      </div>
    </aside>
  );
}

function ReviewPanel({ icon, title, rows }: { icon: React.ReactNode; title: string; rows: Array<[string, string]> }) {
  return (
    <article className="review-panel">
      <div className="review-heading">
        {icon}
        <h2>{title}</h2>
      </div>
      <dl>
        {rows.map(([label, value]) => (
          <div key={`${label}-${value}`}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </article>
  );
}

function iconForSelection(kind: ReviewSelection["kind"]) {
  if (kind === "caption") return <Captions size={16} />;
  if (kind === "variant") return <Layers3 size={16} />;
  if (kind === "handoff") return <CheckCircle2 size={16} />;
  if (kind === "asset") return <Image size={16} />;
  return <Film size={16} />;
}

function countByKind(selections: ReviewSelection[], kind: ReviewSelection["kind"]) {
  const count = selections.filter((selection) => selection.kind === kind).length;
  return count === 0 ? "None yet" : `${count} ready`;
}

function latestNote(intent?: ProjectReview["intent"]) {
  return intent?.reviewNotes.at(-1)?.note;
}
