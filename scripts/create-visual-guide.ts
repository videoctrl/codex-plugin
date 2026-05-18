import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

type GuideCard = {
  slug: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  command?: string;
  bullets: string[];
  screenshotMode: "hero" | "intent" | "timeline" | "selected" | "none";
  accent: string;
};

const repoRoot = resolve(new URL("..", import.meta.url).pathname);
const guideDir = resolve(repoRoot, "docs/visual-guide");
const pageDir = resolve(guideDir, "pages");
const imageDir = resolve(guideDir, "images");
const screenshotPath = resolve(guideDir, "screenshots/product-demo-review.png");

const cards: GuideCard[] = [
  {
    slug: "01-quickstart",
    eyebrow: "Quickstart",
    title: "Start inside Codex",
    subtitle: "Install the local plugin, check readiness, then let @videocontrol create the first reviewable project.",
    command: "@videocontrol check provider readiness, create a test video project, render a tiny preview, and tell me what is ready.",
    bullets: ["Codex is the main workspace.", "No backend server is needed for the plugin.", "FFmpeg powers local previews and exports."],
    screenshotMode: "none",
    accent: "#f0b84a"
  },
  {
    slug: "02-provider-readiness",
    eyebrow: "Provider Readiness",
    title: "Know what is ready before generation",
    subtitle: "The agent checks local tools and external providers, then continues with local work when live generation is not connected.",
    command: "provider_readiness_reminder",
    bullets: ["Local VideoControl can still plan, edit, preview, render, and package.", "Missing providers show clear setup steps.", "No provider result is claimed until it is recorded."],
    screenshotMode: "hero",
    accent: "#2f6f6d"
  },
  {
    slug: "03-project-intent",
    eyebrow: "Project Intent",
    title: "Carry creative direction forward",
    subtitle: "Project intent keeps review notes, caption rules, safe zones, platform targets, and patterns to avoid.",
    command: "update_project_intent",
    bullets: ["Read project-intent.md before follow-up edits.", "Attach notes to exact review selections.", "Later changes keep the same direction."],
    screenshotMode: "intent",
    accent: "#d84f31"
  },
  {
    slug: "04-reference-prompt",
    eyebrow: "Reference + Prompt",
    title: "Prepare assets before provider work",
    subtitle: "Reference media is inspected and registered before rough requests become provider-ready prompts.",
    command: "prepare_reference_asset -> enhance_asset_prompt",
    bullets: ["Product shots, screenshots, logos, and previous ads are tracked.", "Unsafe remote URLs are blocked.", "Prompts include project intent and saved preferences."],
    screenshotMode: "selected",
    accent: "#6b8f3a"
  },
  {
    slug: "05-generation-jobs",
    eyebrow: "Generation Jobs",
    title: "Submit once, import when ready",
    subtitle: "Slow provider jobs are recorded so Codex can check status and import the finished asset into the content record.",
    command: "submit_creative_asset_job -> import_creative_asset_job",
    bullets: ["Provider job ids are saved.", "Timeouts do not trigger blind retries.", "Imported generated assets appear in review.json."],
    screenshotMode: "selected",
    accent: "#8b5cf6"
  },
  {
    slug: "06-timeline-view",
    eyebrow: "Timeline View",
    title: "Review exact clips and captions",
    subtitle: "The timeline shows stable selection ids for clips, captions, variants, assets, and handoffs.",
    command: "open_preview",
    bullets: ["Click a clip or caption to target edits.", "Selection ids are reused in intent notes.", "Every timeline change should be validated before preview."],
    screenshotMode: "timeline",
    accent: "#e16b3a"
  },
  {
    slug: "07-review-console",
    eyebrow: "Review Console",
    title: "Preview, inspect, and hand off",
    subtitle: "The review console keeps the current preview, contact sheet, selected item, intent, variants, verification, and handoff status together.",
    command: "get_project_review -> open_preview",
    bullets: ["The review file loads directly into the UI.", "Generated assets become selectable after import.", "Handoffs stay approval-aware."],
    screenshotMode: "hero",
    accent: "#111111"
  },
  {
    slug: "08-comfyui-local",
    eyebrow: "Local ComfyUI",
    title: "Use local workflows when available",
    subtitle: "ComfyUI is optional, but registered workflows give Codex a local path for generated product visuals.",
    command: "import_comfyui_workflow -> submit_creative_asset_job(provider: comfyui)",
    bullets: ["Register API-format workflow JSON.", "Run local image generation through the provider router.", "Import finished files before timeline use."],
    screenshotMode: "hero",
    accent: "#0f766e"
  }
];

await mkdir(resolve(guideDir, "source"), { recursive: true });
await mkdir(pageDir, { recursive: true });
await mkdir(imageDir, { recursive: true });

for (const card of cards) {
  const htmlPath = resolve(pageDir, `${card.slug}.html`);
  const imagePath = resolve(imageDir, `${card.slug}.png`);
  await writeFile(htmlPath, renderCard(card), "utf8");
  await chromeScreenshot(htmlPath, imagePath);
}

console.log(`Created ${cards.length} visual guide images in ${imageDir}.`);

function renderCard(card: GuideCard) {
  const labelColor = card.accent === "#111111" ? "#f0b84a" : card.accent;
  const screenshot = card.slug === "01-quickstart"
    ? `<img class="cover-image" src="../source/imagegen-quickstart-cover.png" alt="">`
    : screenshotMarkup(card.screenshotMode);

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    @font-face {
      font-family: "GeistPixelCircle";
      src: url("../../apps/preview/public/fonts/GeistPixel-Circle.woff2") format("woff2");
    }
    @font-face {
      font-family: "GeistPixelSquare";
      src: url("../../apps/preview/public/fonts/GeistPixel-Square.woff2") format("woff2");
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      width: 1600px;
      height: 1000px;
      overflow: hidden;
      background: #f3f0e8;
      color: #171717;
      font-family: "GeistPixelSquare", system-ui, sans-serif;
      letter-spacing: 0;
    }
    .card {
      width: 1600px;
      height: 1000px;
      padding: 52px;
      display: grid;
      grid-template-rows: auto 1fr;
      gap: 28px;
      border-top: 18px solid ${card.accent};
    }
    .header {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 420px;
      gap: 40px;
      align-items: end;
    }
    .eyebrow {
      margin: 0 0 12px;
      color: #775c48;
      font-size: 24px;
    }
    h1 {
      margin: 0;
      font-family: "GeistPixelCircle", system-ui, sans-serif;
      font-size: 72px;
      line-height: 0.95;
      letter-spacing: 0;
    }
    .subtitle {
      margin: 18px 0 0;
      max-width: 920px;
      font-size: 28px;
      line-height: 1.18;
      color: #3a332d;
    }
    .badge {
      justify-self: end;
      border: 2px solid #171717;
      border-radius: 8px;
      background: #fffdf7;
      padding: 20px;
      font-size: 22px;
      line-height: 1.2;
    }
    .body {
      display: grid;
      grid-template-columns: 470px minmax(0, 1fr);
      gap: 34px;
      min-height: 0;
    }
    .side {
      display: grid;
      grid-template-rows: auto auto 1fr;
      gap: 20px;
    }
    .command {
      border: 2px solid #171717;
      border-radius: 8px;
      background: #111111;
      color: #fffdf7;
      padding: 22px;
      font-size: 21px;
      line-height: 1.28;
      overflow-wrap: anywhere;
    }
    .steps {
      border: 2px solid #171717;
      border-radius: 8px;
      background: #fffdf7;
      padding: 24px;
    }
    .steps h2 {
      margin: 0 0 18px;
      font-family: "GeistPixelCircle", system-ui, sans-serif;
      font-size: 34px;
      letter-spacing: 0;
    }
    .steps ul {
      margin: 0;
      padding: 0;
      list-style: none;
      display: grid;
      gap: 16px;
    }
    .steps li {
      display: grid;
      grid-template-columns: 34px minmax(0, 1fr);
      gap: 12px;
      align-items: start;
      font-size: 23px;
      line-height: 1.18;
    }
    .dot {
      width: 28px;
      height: 28px;
      border: 2px solid #171717;
      border-radius: 50%;
      background: ${labelColor};
      margin-top: 1px;
    }
    .shot-frame {
      min-width: 0;
      min-height: 0;
      border: 2px solid #171717;
      border-radius: 8px;
      background: #fffdf7;
      overflow: hidden;
      position: relative;
      box-shadow: 10px 10px 0 #171717;
    }
    .shot-frame.hero img,
    .shot-frame.intent img,
    .shot-frame.selected img,
    .shot-frame.timeline img {
      width: 100%;
      display: block;
    }
    .shot-frame.hero img { transform: translateY(0); }
    .shot-frame.intent img { width: 1720px; transform: translate(-10px, -84px); }
    .shot-frame.selected img { width: 1500px; transform: translate(-500px, -76px); }
    .shot-frame.timeline img { width: 1420px; transform: translate(-18px, -615px); }
    .shot-label {
      position: absolute;
      left: 22px;
      top: 22px;
      padding: 10px 14px;
      border: 2px solid #171717;
      border-radius: 8px;
      background: ${labelColor};
      font-size: 20px;
    }
    .cover-wrap {
      min-width: 0;
      min-height: 0;
      border: 2px solid #171717;
      border-radius: 8px;
      background: #111111;
      overflow: hidden;
      box-shadow: 10px 10px 0 #171717;
    }
    .cover-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
  </style>
</head>
<body>
  <main class="card">
    <section class="header">
      <div>
        <p class="eyebrow">${escapeHtml(card.eyebrow)}</p>
        <h1>${escapeHtml(card.title)}</h1>
        <p class="subtitle">${escapeHtml(card.subtitle)}</p>
      </div>
      <div class="badge">VideoControl for Codex<br>Visual guide</div>
    </section>
    <section class="body">
      <aside class="side">
        ${card.command ? `<div class="command">${escapeHtml(card.command)}</div>` : ""}
        <div class="steps">
          <h2>What to check</h2>
          <ul>
            ${card.bullets.map((bullet) => `<li><span class="dot"></span><span>${escapeHtml(bullet)}</span></li>`).join("")}
          </ul>
        </div>
      </aside>
      ${card.slug === "01-quickstart" ? `<div class="cover-wrap">${screenshot}</div>` : screenshot}
    </section>
  </main>
</body>
</html>`;
}

function screenshotMarkup(mode: GuideCard["screenshotMode"]) {
  if (mode === "none") return "";
  const label = mode === "timeline" ? "Timeline selection ids" : mode === "intent" ? "Project intent" : mode === "selected" ? "Selected item" : "Review console";
  return `<div class="shot-frame ${mode}"><img src="../screenshots/product-demo-review.png" alt=""><div class="shot-label">${label}</div></div>`;
}

function chromeScreenshot(htmlPath: string, imagePath: string) {
  return new Promise<void>((resolvePromise, reject) => {
    const chrome = spawn("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", [
      "--headless=new",
      "--disable-gpu",
      "--hide-scrollbars",
      "--run-all-compositor-stages-before-draw",
      "--window-size=1600,1000",
      `--screenshot=${imagePath}`,
      `file://${htmlPath}`
    ], { stdio: "pipe" });
    let stderr = "";
    chrome.stderr.setEncoding("utf8");
    chrome.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    chrome.on("error", reject);
    chrome.on("close", (code) => {
      if (code === 0) resolvePromise();
      else reject(new Error(`Chrome screenshot failed for ${htmlPath}: ${stderr}`));
    });
  });
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
