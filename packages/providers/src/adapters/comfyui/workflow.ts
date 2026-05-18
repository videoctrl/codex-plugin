import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, dirname, join } from "node:path";
import { z } from "zod";

export const ComfyUiWorkflowSchema = z.object({
  schemaVersion: z.literal("0.2"),
  name: z.string(),
  path: z.string(),
  promptNodeIds: z.array(z.string()),
  referenceNodeIds: z.array(z.string()),
  importedAt: z.string()
});

export type ComfyUiWorkflow = z.infer<typeof ComfyUiWorkflowSchema>;

export function defaultComfyUiWorkflowDir() {
  return process.env.VIDEOCONTROL_COMFYUI_WORKFLOWS ?? join(homedir(), ".videocontrol", "comfyui-workflows");
}

export async function importComfyUiWorkflow(input: { name: string; workflowPath: string; workflowDir?: string }) {
  const workflow = JSON.parse(await readFile(input.workflowPath, "utf8")) as Record<string, unknown>;
  const detected = detectWorkflowNodes(workflow);
  const dir = input.workflowDir ?? defaultComfyUiWorkflowDir();
  const targetPath = join(dir, `${safeName(input.name)}.json`);
  const metaPath = metadataPath(input.name, dir);
  await mkdir(dirname(targetPath), { recursive: true });
  await writeFile(targetPath, `${JSON.stringify(workflow, null, 2)}\n`, "utf8");
  const meta = ComfyUiWorkflowSchema.parse({
    schemaVersion: "0.2",
    name: input.name,
    path: targetPath,
    promptNodeIds: detected.promptNodeIds,
    referenceNodeIds: detected.referenceNodeIds,
    importedAt: new Date().toISOString()
  });
  await writeFile(metaPath, `${JSON.stringify(meta, null, 2)}\n`, "utf8");
  return {
    workflow: meta,
    message: "Registered ComfyUI workflow."
  };
}

export async function listComfyUiWorkflows(workflowDir = defaultComfyUiWorkflowDir()) {
  try {
    const entries = await readdir(workflowDir);
    const workflows = await Promise.all(
      entries
        .filter((entry) => entry.endsWith(".meta.json"))
        .map(async (entry) => ComfyUiWorkflowSchema.parse(JSON.parse(await readFile(join(workflowDir, entry), "utf8"))))
    );
    return { workflows: workflows.sort((left, right) => left.name.localeCompare(right.name)) };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { workflows: [] };
    }
    throw error;
  }
}

export async function getComfyUiWorkflow(name: string, workflowDir = defaultComfyUiWorkflowDir()) {
  const workflow = ComfyUiWorkflowSchema.parse(JSON.parse(await readFile(metadataPath(name, workflowDir), "utf8")));
  const graph = JSON.parse(await readFile(workflow.path, "utf8")) as Record<string, unknown>;
  return {
    workflow,
    graph
  };
}

export async function buildComfyUiPrompt(input: { workflowName: string; prompt: string; referencePath?: string }) {
  const { workflow, graph } = await getComfyUiWorkflow(input.workflowName);
  const nextGraph = JSON.parse(JSON.stringify(graph)) as Record<string, unknown>;
  for (const nodeId of workflow.promptNodeIds) {
    const node = nextGraph[nodeId] as { inputs?: Record<string, unknown> } | undefined;
    if (!node?.inputs) continue;
    if ("text" in node.inputs) node.inputs.text = input.prompt;
    if ("prompt" in node.inputs) node.inputs.prompt = input.prompt;
  }
  if (input.referencePath) {
    for (const nodeId of workflow.referenceNodeIds) {
      const node = nextGraph[nodeId] as { inputs?: Record<string, unknown> } | undefined;
      if (!node?.inputs) continue;
      if ("image" in node.inputs) node.inputs.image = basename(input.referencePath);
      if ("video" in node.inputs) node.inputs.video = basename(input.referencePath);
    }
  }
  return {
    workflow,
    prompt: nextGraph
  };
}

function detectWorkflowNodes(workflow: Record<string, unknown>) {
  const promptNodeIds: string[] = [];
  const referenceNodeIds: string[] = [];
  for (const [nodeId, nodeValue] of Object.entries(workflow)) {
    const node = nodeValue as { class_type?: string; inputs?: Record<string, unknown> };
    const className = (node.class_type ?? "").toLowerCase();
    const inputKeys = Object.keys(node.inputs ?? {}).map((key) => key.toLowerCase());
    if (className.includes("text") || inputKeys.includes("text") || inputKeys.includes("prompt")) {
      promptNodeIds.push(nodeId);
    }
    if (className.includes("loadimage") || inputKeys.includes("image") || inputKeys.includes("video")) {
      referenceNodeIds.push(nodeId);
    }
  }
  return { promptNodeIds, referenceNodeIds };
}

function metadataPath(name: string, workflowDir: string) {
  return join(workflowDir, `${safeName(name)}.meta.json`);
}

function safeName(name: string) {
  const safe = name.toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-|-$/g, "");
  if (!safe) {
    throw new Error("Workflow name is required.");
  }
  return safe;
}
