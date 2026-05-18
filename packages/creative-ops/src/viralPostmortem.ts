export function runViralPostmortem(text: string) {
  const lines = text.split(/\r?\n/).map((line, index) => ({ line: index + 1, text: line })).filter((line) => line.text.trim());
  const pick = (offset: number) => lines[Math.min(offset, Math.max(0, lines.length - 1))] ?? { line: 1, text: "" };
  return {
    hookMove: pick(0),
    credibility: pick(1),
    screenshottableLine: pick(2),
    saveWorthyLine: pick(3),
    replyShareTrigger: pick(4),
    weakestPart: pick(lines.length - 1)
  };
}
