import { exportReproBundle } from "./reproBundle.js";

export async function publishToLibrary(input: { projectDir: string; slug: string; visibility?: "private" | "public"; redact?: boolean }) {
  const bundle = await exportReproBundle(input);
  return {
    ...bundle,
    message: input.visibility === "public" ? "Prepared public library bundle." : "Prepared private library bundle."
  };
}
