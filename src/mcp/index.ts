#!/usr/bin/env npx ts-node
/**
 * MCP Server Entry Point
 */

import { RabitMcpServer } from "./server";

const server = new RabitMcpServer();
server.run().catch((error) => {
  console.error("Fatal error running MCP server:", error);
  process.exit(1);
});
