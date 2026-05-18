import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { updateProjectIntentFromNote } from "@videocontrol/content-os";
import { createProject } from "./tools/createProject.js";
import { importAssets } from "./tools/importAssets.js";
import { inspectAsset } from "./tools/inspectAsset.js";
import { getTimeline } from "./tools/getTimeline.js";
import { patchTimeline } from "./tools/patchTimeline.js";
import { validateTimeline } from "./tools/validateTimeline.js";
import { previewRange } from "./tools/previewRange.js";
import { renderExport } from "./tools/renderExport.js";
import { openPreview } from "./tools/openPreview.js";
import { listVersions } from "./tools/listVersions.js";
import { compareVersions } from "./tools/compareVersions.js";
import { registerCreativeOsTools } from "./tools/creativeOsTools.js";
import { writeCurrentProjectReview } from "./tools/projectReview.js";

const jsonPatchOperationSchema = z.object({
  op: z.enum(["add", "remove", "replace", "move", "copy", "test"]),
  path: z.string(),
  value: z.unknown().optional(),
  from: z.string().optional()
});

export function createVideoControlServer() {
  const server = new McpServer({
    name: "videocontrol",
    version: "0.2.0"
  }, {
    instructions: [
      "Use VideoControl directly inside Codex with these MCP tools as the primary workflow.",
      "At the start of a creative run, call provider_readiness_reminder or provider_status so the user knows what is ready.",
      "If external generation providers are missing, continue with local planning, imports, timeline edits, previews, renders, handoffs, and project intent. Do not claim a provider generated media unless a provider result or imported asset is recorded.",
      "Before live generation, use enhance_asset_prompt and prepare_reference_asset when reference media is involved. Submit long-running generation with submit_creative_asset_job, check the recorded job, then import the finished asset into the content object so it appears in .videocontrol/review.json.",
      "Treat Hermes as optional. Keep Codex review, intent, and content-object records as the source of truth."
    ].join("\n")
  });

  server.tool(
    "create_project",
    "Create a local VideoControl project.",
    {
      projectDir: z.string(),
      name: z.string(),
      width: z.number().int().positive().optional(),
      height: z.number().int().positive().optional(),
      fps: z.number().positive().optional()
    },
    async (input) => asToolResult(await createProject(input))
  );

  server.tool(
    "import_assets",
    "Import local media into a VideoControl project.",
    {
      projectDir: z.string(),
      paths: z.array(z.string()).min(1),
      copyIntoProject: z.boolean().optional()
    },
    async (input) => asToolResult(await importAssets(input))
  );

  server.tool(
    "inspect_asset",
    "Read media details for an imported asset.",
    {
      projectDir: z.string(),
      assetId: z.string()
    },
    async (input) => asToolResult(await inspectAsset(input))
  );

  server.tool(
    "get_timeline",
    "Read the current project timeline.",
    {
      projectDir: z.string()
    },
    async (input) => asToolResult(await getTimeline(input))
  );

  server.tool(
    "patch_timeline",
    "Apply a JSON Patch change to the timeline and create a new version.",
    {
      projectDir: z.string(),
      baseVersion: z.string(),
      rationale: z.string(),
      patch: z.array(jsonPatchOperationSchema),
      dryRun: z.boolean().optional()
    },
    async (input) => asToolResult(await patchTimeline(input))
  );

  server.tool(
    "validate_timeline",
    "Validate the current timeline.",
    {
      projectDir: z.string()
    },
    async (input) => asToolResult(await validateTimeline(input))
  );

  server.tool(
    "preview_range",
    "Render a short preview and contact sheet.",
    {
      projectDir: z.string(),
      startSec: z.number().nonnegative(),
      endSec: z.number().positive(),
      quality: z.enum(["draft", "standard"]).optional()
    },
    async (input) => asToolResult(await previewRange(input))
  );

  server.tool(
    "render_export",
    "Render a final local export.",
    {
      projectDir: z.string(),
      preset: z.enum(["720p", "1080p", "4k"]).optional(),
      outputPath: z.string().optional()
    },
    async (input) => asToolResult(await renderExport(input))
  );

  server.tool(
    "open_preview",
    "Return the local preview app URL for a project.",
    {
      projectDir: z.string()
    },
    async (input) => asToolResult(await openPreview(input))
  );

  server.tool(
    "update_project_intent",
    "Record a review note in the project intent pack.",
    {
      projectDir: z.string(),
      note: z.string(),
      selectionId: z.string().optional(),
      source: z.string().optional()
    },
    async (input) => asToolResult(await updateProjectIntentFromNote(input))
  );

  server.tool(
    "get_project_review",
    "Update and read the project review file used by the preview app.",
    {
      projectDir: z.string()
    },
    async (input) => asToolResult(await writeCurrentProjectReview(input))
  );

  server.tool(
    "list_versions",
    "List timeline versions for a project.",
    {
      projectDir: z.string()
    },
    async (input) => asToolResult(await listVersions(input))
  );

  server.tool(
    "compare_versions",
    "Compare two timeline versions.",
    {
      projectDir: z.string(),
      fromVersion: z.string(),
      toVersion: z.string()
    },
    async (input) => asToolResult(await compareVersions(input))
  );

  registerCreativeOsTools(server, asToolResult);

  return server;
}

function asToolResult(value: unknown): { content: Array<{ type: "text"; text: string }> } {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(value, null, 2)
      }
    ]
  };
}
