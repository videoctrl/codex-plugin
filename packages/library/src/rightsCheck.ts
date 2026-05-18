import { readFile } from "node:fs/promises";

export async function runRightsCheck(provenancePath: string) {
  const provenance = JSON.parse(await readFile(provenancePath, "utf8")) as {
    entries?: Array<{ rights?: { commercialUseStatus?: string; containsLikeness?: boolean } }>;
  };
  const restricted = provenance.entries?.filter((entry) => entry.rights?.commercialUseStatus === "restricted") ?? [];
  const likeness = provenance.entries?.filter((entry) => entry.rights?.containsLikeness) ?? [];
  return {
    passed: restricted.length === 0,
    restrictedCount: restricted.length,
    likenessCount: likeness.length
  };
}
