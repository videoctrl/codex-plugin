export function log(message: string, metadata: Record<string, unknown> = {}) {
  const payload = Object.keys(metadata).length > 0 ? ` ${JSON.stringify(metadata)}` : "";
  process.stderr.write(`[videocontrol] ${message}${payload}\n`);
}
