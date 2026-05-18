export function createScript(input: { hook: string; proof?: string; mechanism?: string; demo?: string; takeaway?: string; cta?: string }) {
  return `# Script

hook: ${input.hook}
proof: ${input.proof ?? "Show the result early."}
mechanism: ${input.mechanism ?? "Explain the workflow in plain language."}
demo: ${input.demo ?? "Show the product or content object in motion."}
takeaway: ${input.takeaway ?? "Make the outcome reusable."}
CTA: ${input.cta ?? "Try the workflow."}
caption: ${input.hook}
platform notes: Keep the first screen legible without sound.
`;
}
