const bannedPatterns = [
  "game-changing",
  "revolutionary",
  "unlock",
  "leverage",
  "seamless",
  "delve",
  "in today's fast-paced world",
  "it's not just",
  "significant",
  "arguably",
  "clearly",
  "very",
  "—"
];

export function runAvoidSlopCheck(text: string) {
  const lower = text.toLowerCase();
  const findings = bannedPatterns
    .filter((pattern) => lower.includes(pattern.toLowerCase()))
    .map((pattern) => ({ pattern, note: "Replace with a more specific line." }));
  return {
    passed: findings.length === 0,
    findings
  };
}
