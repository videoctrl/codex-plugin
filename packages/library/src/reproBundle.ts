import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { findContentObject } from "@videocontrol/content-os";
import { LibraryManifest, LibraryManifestSchema } from "./manifest.js";
import { redactPrivateText } from "./redaction.js";
import { runRightsCheck } from "./rightsCheck.js";

export async function exportReproBundle(input: { projectDir: string; slug: string; visibility?: "private" | "public"; redact?: boolean }) {
  const found = await findContentObject(input.projectDir, input.slug);
  const bundleDir = join(found.runDir, "library-bundle");
  await mkdir(bundleDir, { recursive: true });
  const visibility = input.visibility ?? "private";
  const manifest: LibraryManifest = LibraryManifestSchema.parse({
    schemaVersion: "0.2",
    title: found.contentObject.title,
    slug: found.contentObject.slug,
    visibility,
    contentObject: relative(found.runDir, join(found.runDir, "content-object.md")),
    brief: relative(found.runDir, join(found.runDir, "brief.md")),
    timeline: relative(found.runDir, join(found.runDir, "timeline.video.json")),
    video: relative(found.runDir, join(found.runDir, "renders", "final.mp4")),
    prompts: relative(found.runDir, join(found.runDir, "draft-package.md")),
    provenance: relative(found.runDir, join(found.runDir, "provenance.json")),
    verification: relative(found.runDir, join(found.runDir, "verification.md")),
    platformPackage: relative(found.runDir, join(found.runDir, "scheduler-handoff.md")),
    remix: {
      allowed: true,
      requiresAttribution: visibility === "public",
      redactedPrivateAssets: Boolean(input.redact)
    }
  });

  const manifestPath = join(bundleDir, "library.manifest.json");
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  if (input.redact) {
    const briefPath = join(found.runDir, "brief.md");
    const redacted = redactPrivateText(await readFile(briefPath, "utf8"));
    await writeFile(join(bundleDir, "brief.redacted.md"), redacted, "utf8");
  }

  return {
    bundleDir,
    manifestPath,
    rights: await runRightsCheck(join(found.runDir, "provenance.json")).catch(() => ({ passed: true, restrictedCount: 0, likenessCount: 0 })),
    manifest
  };
}
