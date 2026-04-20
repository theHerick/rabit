/**
 * Rabit MCP Server
 * Exposes Rabit's persistent memory to external MCP clients (like Claude Code CLI).
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { searchMemories, remember, listAll } from "../db/memory";
import { MemoryRecord } from "../tools/types";

/**
 * MCP Server Implementation
 */
export class RabitMcpServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: "rabit-memory",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupTools();
  }

  private setupTools() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: "mem_search",
          description: "Search Rabit's persistent memory semantically using a query string.",
          inputSchema: {
            type: "object",
            properties: {
              query: { type: "string", description: "The search query" },
              category: { 
                type: "string", 
                enum: ["observation", "summary", "decision", "command"],
                description: "Optional category to filter by" 
              },
              limit: { type: "number", description: "Max results (default 5)" }
            },
            required: ["query"],
          },
        },
        {
          name: "mem_record",
          description: "Record a new observation or discovery into Rabit's memory.",
          inputSchema: {
            type: "object",
            properties: {
              content: { type: "string", description: "The content to remember" },
              projectId: { type: "string", description: "Optional project ID associated with this memory" },
              category: { 
                type: "string", 
                enum: ["observation", "decision"],
                default: "observation"
              }
            },
            required: ["content"],
          },
        },
        {
          name: "mem_get_recent",
          description: "Retrieve chronological recent memories (summaries and observations).",
          inputSchema: {
            type: "object",
            properties: {
              limit: { type: "number", description: "Max results (default 10)" },
              projectId: { type: "string", description: "Filter by project ID" }
            }
          },
        }
      ],
    }));

    // Handle tool execution
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case "mem_search": {
            const { query, category, limit } = args as any;
            const results = await searchMemories(query, { category, limit });
            return {
              content: [{ type: "text", text: this.formatMemories(results) }],
            };
          }

          case "mem_record": {
            const { content, projectId, category } = args as any;
            const memory = await remember({
              category: category || "observation",
              content,
              metadata: { projectId, source: "mcp-external" }
            });
            return {
              content: [{ type: "text", text: `Memory recorded successfully with ID: ${memory.id}` }],
            };
          }

          case "mem_get_recent": {
            const { limit = 10, projectId } = args as any;
            let memories = await listAll();
            if (projectId) {
              memories = memories.filter(m => m.metadata?.projectId === projectId);
            }
            const recent = memories.reverse().slice(0, limit);
            return {
              content: [{ type: "text", text: this.formatMemories(recent) }],
            };
          }

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  private formatMemories(memories: MemoryRecord[]): string {
    if (memories.length === 0) return "No relevant memories found.";
    return memories
      .map(
        (m) =>
          `[${m.timestamp}] ID: ${m.id} | Type: ${m.category}\nContent: ${m.content}\n---`
      )
      .join("\n\n");
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("Rabit Memory MCP server running on stdio");
  }
}
