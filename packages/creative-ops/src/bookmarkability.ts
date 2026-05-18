import { RubricRow } from "./adReadiness.js";

const rubric = [
  "saves the reader a future task",
  "includes proof",
  "gives a reusable takeaway",
  "has a specific audience and job-to-be-done",
  "can be applied without the creator being present",
  "has a strong screenshot or visual"
];

export function scoreBookmarkability(text: string) {
  const lower = text.toLowerCase();
  const rows: RubricRow[] = rubric.map((label) => {
    const score = rowScore(label, lower);
    return { key: label.replace(/[^a-z0-9]+/g, "_"), label, score, note: score === 2 ? "Strong" : score === 1 ? "Present" : "Missing" };
  });
  const total = rows.reduce((sum, row) => sum + row.score, 0);
  const strongest = rows.find((row) => row.score === 2) ?? rows[0];
  const weakest = [...rows].reverse().find((row) => row.score === 0) ?? rows.at(-1)!;
  return {
    total,
    max: 12,
    rows,
    strongestRow: strongest.label,
    weakestRow: weakest.label,
    verdict: total >= 8 ? "ship" : total >= 5 ? "fix and re-score" : "kill",
    specificFix: `Strengthen: ${weakest.label}.`
  };
}

function rowScore(label: string, lower: string): 0 | 1 | 2 {
  const terms = label.split(" ").filter((word) => word.length > 3);
  const hits = terms.filter((term) => lower.includes(term)).length;
  if (hits >= 2) return 2;
  if (hits === 1) return 1;
  return 0;
}
