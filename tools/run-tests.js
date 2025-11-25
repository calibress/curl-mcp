#!/usr/bin/env node
/**
 * Integration Test Printer for curl-mcp (multi-client friendly)
 * -------------------------------------------------------------
 * This script doesn't execute HTTP requests.
 * It prints each test in docs/integration-tests.json so an AI agent
 * (ChatGPT Desktop, Roo Code, Cursor, Cline, Continue.dev, etc.)
 * can read and run them via the `curl_request` tool.
 */

const fs = require("fs");
const path = require("path");

const testsPath = path.join(process.cwd(), "docs/integration-tests.json");
const raw = fs.readFileSync(testsPath, "utf8");
const suite = JSON.parse(raw);

console.log("curl-mcp Integration Tests");
console.log("==========================");
console.log(`Loaded ${suite.tests.length} test cases.\n`);

for (const test of suite.tests) {
  console.log("----------------------------------------");
  console.log(`Test ID:       ${test.id}`);
  console.log(`Category:      ${test.category}`);
  console.log(`Description:   ${test.description}`);
  console.log("\nMCP Input (use this with curl_request):");
  console.log(JSON.stringify(test.input, null, 2));
  console.log("\nExpected Pattern:");
  console.log(JSON.stringify(test.expected, null, 2));
  console.log("----------------------------------------\n");
}

console.log("Instructions:");
console.log("- Use an MCP client (ChatGPT Desktop, Roo Code, Cursor, Cline, Continue.dev, Claude Desktop, etc.)");
console.log("- For each test, call the curl_request tool with the provided input.");
console.log("- Compare with the expected pattern.");
console.log("- This script is intentionally simple (no dependencies).");
