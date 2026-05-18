#!/usr/bin/env node

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createVideoControlServer } from "./server.js";
import { log } from "./logger.js";

const server = createVideoControlServer();
const transport = new StdioServerTransport();

process.on("uncaughtException", (error) => {
  log("Uncaught exception", { message: error instanceof Error ? error.message : String(error) });
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  log("Unhandled rejection", { message: reason instanceof Error ? reason.message : String(reason) });
  process.exit(1);
});

await server.connect(transport);
