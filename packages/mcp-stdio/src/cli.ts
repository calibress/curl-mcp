#!/usr/bin/env node
import { createRequire } from "node:module";
import type { PackageJson } from "./types.js";

const require = createRequire(import.meta.url);
const pkg = require("../package.json") as PackageJson;

const args = process.argv.slice(2);
const useHttp = args.includes("--http");

if (args.includes("--version") || args.includes("-v")) {
  const version = pkg.version ?? "0.0.0";
  console.log(`curl-mcp version ${version}`);
  process.exit(0);
}

// Start the requested transport
if (useHttp) {
  await import("./http-server.js");
} else {
  await import("./server.js");
}
