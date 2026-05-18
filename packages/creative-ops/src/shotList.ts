export function createShotList(input: { shots?: string[] }) {
  const shots = input.shots?.length ? input.shots : ["Opening hook", "Product proof", "Workflow close-up", "Result screen", "CTA end card"];
  return `# Shot List

${shots.map((shot, index) => `- ${index + 1}. ${shot}`).join("\n")}
`;
}
