export function createStoryboard(input: { title: string; beats?: string[] }) {
  const beats = input.beats?.length ? input.beats : ["Hook", "Proof", "Mechanism", "Demo", "CTA"];
  return `# Storyboard

${beats.map((beat, index) => `## ${index + 1}. ${beat}\n\nvisual:\ntext:\nnotes:\n`).join("\n")}
`;
}
