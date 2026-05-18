import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const repoRoot = resolve(new URL("..", import.meta.url).pathname);
const marketplacePath = resolve(repoRoot, ".agents/plugins/marketplace.json");
const marketplace = {
  name: "videocontrol-local",
  interface: {
    displayName: "VideoControl Local"
  },
  plugins: [
    {
      name: "videocontrol",
      source: {
        source: "local",
        path: "./plugins/videocontrol"
      },
      policy: {
        installation: "AVAILABLE",
        authentication: "ON_INSTALL"
      },
      category: "Design"
    }
  ]
};

await mkdir(dirname(marketplacePath), { recursive: true });
await writeFile(marketplacePath, `${JSON.stringify(marketplace, null, 2)}\n`, "utf8");
console.log(`Wrote ${marketplacePath}.`);
