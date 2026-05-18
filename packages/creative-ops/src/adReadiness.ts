export type RubricScore = 0 | 1 | 2;

export type RubricRow = {
  key: string;
  label: string;
  score: RubricScore;
  note: string;
};

const rows = [
  "hook visible in first 1.5 seconds",
  "offer understandable without sound",
  "proof appears before midpoint",
  "CTA is visible and specific",
  "safe-zone compliant",
  "brand appears without overwhelming the story",
  "visual supports the promise",
  "platform constraints pass"
];

export function scoreAdReadiness(input: { text: string; platformValidationPassed?: boolean }) {
  const lower = input.text.toLowerCase();
  const scored: RubricRow[] = rows.map((label) => {
    const score = scoreRow(label, lower, input.platformValidationPassed);
    return { key: label.replace(/[^a-z0-9]+/g, "_"), label, score, note: score === 2 ? "Strong" : score === 1 ? "Present but weak" : "Missing" };
  });
  const total = scored.reduce((sum, row) => sum + row.score, 0);
  return {
    total,
    max: rows.length * 2,
    rows: scored,
    verdict: total >= 12 ? "ship" : total >= 8 ? "fix and re-score" : "kill",
    specificFix: scored.find((row) => row.score === 0)?.label ?? "Tighten the first screen."
  };
}

function scoreRow(label: string, lower: string, platformValidationPassed?: boolean): RubricScore {
  if (label.includes("platform")) {
    return platformValidationPassed ? 2 : 1;
  }
  const terms = label.split(" ").filter((word) => word.length > 3);
  const hits = terms.filter((term) => lower.includes(term.replace("-", "")) || lower.includes(term)).length;
  if (hits >= 2) return 2;
  if (hits >= 1) return 1;
  return 0;
}
