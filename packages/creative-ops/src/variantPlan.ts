export type AdVariant = {
  id: string;
  hook: string;
  angle: string;
  visual: string;
  cta: string;
  durationSec: number;
};

export function generateVariantPlan(input: { count: number; offer: string; platform?: string }): AdVariant[] {
  const hooks = ["problem-first", "proof-first", "contrarian", "demo-first", "founder-story", "before-after"];
  return Array.from({ length: input.count }, (_, index) => ({
    id: `v${String(index + 1).padStart(3, "0")}`,
    hook: hooks[index % hooks.length],
    angle: `${input.offer} for ${input.platform ?? "social"}`,
    visual: index % 2 === 0 ? "product in motion" : "customer outcome",
    cta: "See the workflow",
    durationSec: 30
  }));
}

export function renderVariantPlan(variants: AdVariant[]) {
  return `# Ad Variant Plan

${variants
  .map(
    (variant) => `## ${variant.id}

hook: ${variant.hook}
angle: ${variant.angle}
visual: ${variant.visual}
CTA: ${variant.cta}
duration: ${variant.durationSec}s
`
  )
  .join("\n")}
`;
}
