import type { ProjectOptions } from "../types.js";

type FileMap = Record<string, string>;

export function generateSourceFiles(options: ProjectOptions): FileMap {
  const { template } = options;
  const files: FileMap = {};

  if (template === "minimal") {
    files[`src/index.${options.lang === "ts" ? "ts" : "js"}`] =
      generateMinimalIndex(options);
  } else {
    const ext = options.lang === "ts" ? "ts" : "js";
    files[`src/index.${ext}`] = generateFullIndex(options);
    files[`src/tools/example-tool.${ext}`] = generateExampleTool(options);
    files[`src/resources/example-resource.${ext}`] = generateExampleResource(options);
    files[`src/prompts/example-prompt.${ext}`] = generateExamplePrompt(options);
  }

  return files;
}

// ---------------------------------------------------------------------------
// Minimal template — single file with echo tool
// ---------------------------------------------------------------------------

function generateMinimalIndex(options: ProjectOptions): string {
  const { transport, lang } = options;
  const isTs = lang === "ts";

  if (transport === "stdio") {
    return (
      `import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";\n` +
      `import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";\n` +
      `import { z } from "zod";\n` +
      `\n` +
      `// Create the MCP server with a display name and version\n` +
      `const server = new McpServer({\n` +
      `  name: "my-mcp-server",\n` +
      `  version: "1.0.0",\n` +
      `});\n` +
      `\n` +
      `// -----------------------------------------------------------------------\n` +
      `// Tool: echo\n` +
      `// A tool lets an LLM ask your server to perform an action and return data.\n` +
      `// Delete this and add your own tools below.\n` +
      `// -----------------------------------------------------------------------\n` +
      `server.registerTool(\n` +
      `  // Tool name — the LLM uses this name when it calls the tool\n` +
      `  "echo",\n` +
      `  {\n` +
      `    // description helps the LLM decide when to use this tool\n` +
      `    description: "Echoes back the message you send. Useful for testing.",\n` +
      `    // inputSchema uses Zod — arguments are validated before your handler runs\n` +
      `    inputSchema: {\n` +
      `      message: z.string().describe("The message to echo back"),\n` +
      `    },\n` +
      `  },\n` +
      `  // Handler receives validated arguments; return a content array\n` +
      `  async ({ message }) => ({\n` +
      "    content: [{ type: \"text\", text: `Echo: ${message}` }],\n" +
      `  })\n` +
      `);\n` +
      `\n` +
      `async function main()${isTs ? ": Promise<void>" : ""} {\n` +
      `  // StdioServerTransport reads from stdin and writes to stdout\n` +
      `  // This is the standard transport for Claude Desktop and local MCP clients\n` +
      `  const transport = new StdioServerTransport();\n` +
      `  await server.connect(transport);\n` +
      `  // Use console.error so output doesn't corrupt the stdio MCP protocol\n` +
      `  console.error("MCP server started on stdio");\n` +
      `}\n` +
      `\n` +
      `main().catch(console.error);\n`
    );
  }

  // HTTP transport
  return (
    `import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";\n` +
    `import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";\n` +
    `import { randomUUID } from "node:crypto";\n` +
    `import express from "express";\n` +
    `import { z } from "zod";\n` +
    `\n` +
    `// Create the MCP server with a display name and version\n` +
    `const server = new McpServer({\n` +
    `  name: "my-mcp-server",\n` +
    `  version: "1.0.0",\n` +
    `});\n` +
    `\n` +
    `// -----------------------------------------------------------------------\n` +
    `// Tool: echo\n` +
    `// A tool lets an LLM ask your server to perform an action and return data.\n` +
    `// Delete this and add your own tools below.\n` +
    `// -----------------------------------------------------------------------\n` +
    `server.registerTool(\n` +
    `  "echo",\n` +
    `  {\n` +
    `    description: "Echoes back the message you send. Useful for testing.",\n` +
    `    inputSchema: {\n` +
    `      message: z.string().describe("The message to echo back"),\n` +
    `    },\n` +
    `  },\n` +
    `  async ({ message }) => ({\n` +
    "    content: [{ type: \"text\", text: `Echo: ${message}` }],\n" +
    `  })\n` +
    `);\n` +
    `\n` +
    `// Set up Express HTTP server\n` +
    `const app = express();\n` +
    `app.use(express.json());\n` +
    `\n` +
    `// All MCP protocol messages arrive at POST /mcp (and GET for SSE stream)\n` +
    `app.all("/mcp", async (req, res) => {\n` +
    `  // A new transport per request handles the MCP session lifecycle\n` +
    `  const transport = new StreamableHTTPServerTransport({\n` +
    `    sessionIdGenerator: () => randomUUID(),\n` +
    `  });\n` +
    `  await server.connect(transport);\n` +
    `  await transport.handleRequest(req, res, req.body);\n` +
    `  res.on("finish", () => transport.close());\n` +
    `});\n` +
    `\n` +
    `const PORT = process.env["PORT"] ?? 3000;\n` +
    "app.listen(PORT, () => {\n" +
    "  console.log(`MCP HTTP server running on http://localhost:${PORT}/mcp`);\n" +
    "});\n"
  );
}

// ---------------------------------------------------------------------------
// Full template — index.ts that imports from tools/, resources/, prompts/
// ---------------------------------------------------------------------------

function generateFullIndex(options: ProjectOptions): string {
  const { transport, lang } = options;
  const isTs = lang === "ts";

  const imports =
    `import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";\n` +
    (transport === "stdio"
      ? `import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";\n`
      : `import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";\n` +
        `import { randomUUID } from "node:crypto";\n` +
        `import express from "express";\n`) +
    `import { registerEchoTool } from "./tools/example-tool.js";\n` +
    `import { registerExampleResource } from "./resources/example-resource.js";\n` +
    `import { registerExamplePrompt } from "./prompts/example-prompt.js";\n`;

  const serverSetup =
    `\n` +
    `// Create the MCP server — the name and version appear in client UIs\n` +
    `const server = new McpServer({\n` +
    `  name: "my-mcp-server",\n` +
    `  version: "1.0.0",\n` +
    `});\n` +
    `\n` +
    `// Register capabilities\n` +
    `// Add new tools/resources/prompts by creating files in their directories\n` +
    `// and calling the register function here\n` +
    `registerEchoTool(server);\n` +
    `registerExampleResource(server);\n` +
    `registerExamplePrompt(server);\n`;

  if (transport === "stdio") {
    return (
      imports +
      serverSetup +
      `\n` +
      `async function main()${isTs ? ": Promise<void>" : ""} {\n` +
      `  // StdioServerTransport communicates over stdin/stdout\n` +
      `  // Standard transport for Claude Desktop and local MCP clients\n` +
      `  const transport = new StdioServerTransport();\n` +
      `  await server.connect(transport);\n` +
      `  // Use console.error to avoid corrupting the stdio MCP protocol\n` +
      `  console.error("MCP server started on stdio");\n` +
      `}\n` +
      `\n` +
      `main().catch(console.error);\n`
    );
  }

  return (
    imports +
    serverSetup +
    `\n` +
    `const app = express();\n` +
    `app.use(express.json());\n` +
    `\n` +
    `// All MCP protocol messages arrive at POST /mcp (GET for SSE stream)\n` +
    `app.all("/mcp", async (req, res) => {\n` +
    `  const transport = new StreamableHTTPServerTransport({\n` +
    `    sessionIdGenerator: () => randomUUID(),\n` +
    `  });\n` +
    `  await server.connect(transport);\n` +
    `  await transport.handleRequest(req, res, req.body);\n` +
    `  res.on("finish", () => transport.close());\n` +
    `});\n` +
    `\n` +
    `const PORT = process.env["PORT"] ?? 3000;\n` +
    "app.listen(PORT, () => {\n" +
    "  console.log(`MCP HTTP server running on http://localhost:${PORT}/mcp`);\n" +
    "});\n"
  );
}

// ---------------------------------------------------------------------------
// Tool file
// ---------------------------------------------------------------------------

function generateExampleTool(options: ProjectOptions): string {
  const isTs = options.lang === "ts";

  if (isTs) {
    return (
      `import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";\n` +
      `import { z } from "zod";\n` +
      `\n` +
      `/**\n` +
      ` * Register the echo tool on the given server.\n` +
      ` * Call this from src/index.ts after creating your McpServer.\n` +
      ` *\n` +
      ` * To add a new tool:\n` +
      ` *   1. Copy the server.registerTool() call below\n` +
      ` *   2. Change the tool name, description, inputSchema, and handler\n` +
      ` *   3. Export a new register function and call it from index.ts\n` +
      ` */\n` +
      `export function registerEchoTool(server: McpServer): void {\n` +
      `  server.registerTool(\n` +
      `    // Tool name — the LLM uses this exact string when it calls the tool\n` +
      `    "echo",\n` +
      `    {\n` +
      `      // description: tell the LLM when and why to use this tool\n` +
      `      description: "Echoes back the message you send. Useful for testing.",\n` +
      `      // inputSchema: Zod object shape — all arguments are validated here\n` +
      `      // before your handler function ever runs\n` +
      `      inputSchema: {\n` +
      `        message: z.string().describe("The message to echo back"),\n` +
      `        // More examples:\n` +
      `        // count: z.number().int().min(1).max(10).optional(),\n` +
      `        // format: z.enum(["plain", "json"]).default("plain"),\n` +
      `      },\n` +
      `    },\n` +
      `    // Handler: receives validated { message } and returns a content array.\n` +
      `    // You can call APIs, read files, query DBs, run code — anything async.\n` +
      `    async ({ message }) => ({\n` +
      `      content: [\n` +
      `        {\n` +
      `          // type can be "text", "image", or "resource"\n` +
      `          type: "text",\n` +
      "          text: `Echo: ${message}`,\n" +
      `        },\n` +
      `      ],\n` +
      `    })\n` +
      `  );\n` +
      `}\n`
    );
  }

  return (
    `import { z } from "zod";\n` +
    `\n` +
    `/**\n` +
    ` * Register the echo tool on the given server.\n` +
    ` * Call this from src/index.js after creating your McpServer.\n` +
    ` */\n` +
    `export function registerEchoTool(server) {\n` +
    `  server.registerTool(\n` +
    `    "echo",\n` +
    `    {\n` +
    `      description: "Echoes back the message you send. Useful for testing.",\n` +
    `      inputSchema: {\n` +
    `        message: z.string().describe("The message to echo back"),\n` +
    `      },\n` +
    `    },\n` +
    `    async ({ message }) => ({\n` +
    `      content: [\n` +
    `        {\n` +
    `          type: "text",\n` +
    "          text: `Echo: ${message}`,\n" +
    `        },\n` +
    `      ],\n` +
    `    })\n` +
    `  );\n` +
    `}\n`
  );
}

// ---------------------------------------------------------------------------
// Resource file
// ---------------------------------------------------------------------------

function generateExampleResource(options: ProjectOptions): string {
  const isTs = options.lang === "ts";

  if (isTs) {
    return (
      `import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";\n` +
      `\n` +
      `/**\n` +
      ` * Register example resources on the given server.\n` +
      ` *\n` +
      ` * Resources expose read-only data that clients can surface to users or LLMs.\n` +
      ` * Think of them as file-system-like endpoints with URI addresses.\n` +
      ` *\n` +
      ` * Two patterns shown below:\n` +
      ` *   1. Static resource  — fixed URI, always the same content\n` +
      ` *   2. Dynamic resource — URI template with parameters (like REST path params)\n` +
      ` */\n` +
      `export function registerExampleResource(server: McpServer): void {\n` +
      `  // ── Static resource ────────────────────────────────────────────────\n` +
      `  // Fixed URI: clients request "info://server" to get this content.\n` +
      `  // Good for: config data, documentation, system status.\n` +
      `  server.registerResource(\n` +
      `    "server-info",          // resource name (shown in client UIs)\n` +
      `    "info://server",        // URI clients use to request this resource\n` +
      `    {\n` +
      `      description: "Information about this MCP server",\n` +
      `      mimeType: "text/plain",\n` +
      `    },\n` +
      `    async (uri) => ({\n` +
      `      contents: [\n` +
      `        {\n` +
      `          uri: uri.href,\n` +
      `          mimeType: "text/plain",\n` +
      `          text: "This is an example MCP server. Edit me to return real data.",\n` +
      `        },\n` +
      `      ],\n` +
      `    })\n` +
      `  );\n` +
      `\n` +
      `  // ── Dynamic resource ───────────────────────────────────────────────\n` +
      `  // URI template: {name} is extracted and passed as a handler argument.\n` +
      `  // Good for: user records, file contents, per-ID data.\n` +
      `  server.registerResource(\n` +
      `    "greeting",\n` +
      `    new ResourceTemplate(\n` +
      `      "greeting://{name}",  // {name} becomes a parameter\n` +
      `      { list: undefined }   // set list: async () => ({resources:[...]}) to enable listing\n` +
      `    ),\n` +
      `    {\n` +
      `      description: "A personalised greeting for any name",\n` +
      `      mimeType: "text/plain",\n` +
      `    },\n` +
      `    // uri  = the full requested URI object\n` +
      `    // name = extracted from the URI template\n` +
      `    async (uri, { name }) => ({\n` +
      `      contents: [\n` +
      `        {\n` +
      `          uri: uri.href,\n` +
      `          mimeType: "text/plain",\n` +
      "          text: `Hello, ${name}! Welcome to MCP.`,\n" +
      `        },\n` +
      `      ],\n` +
      `    })\n` +
      `  );\n` +
      `}\n`
    );
  }

  return (
    `import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";\n` +
    `\n` +
    `/**\n` +
    ` * Register example resources on the given server.\n` +
    ` * Resources expose read-only data that clients can surface to users or LLMs.\n` +
    ` */\n` +
    `export function registerExampleResource(server) {\n` +
    `  // Static resource — fixed URI, always the same content\n` +
    `  server.registerResource(\n` +
    `    "server-info",\n` +
    `    "info://server",\n` +
    `    {\n` +
    `      description: "Information about this MCP server",\n` +
    `      mimeType: "text/plain",\n` +
    `    },\n` +
    `    async (uri) => ({\n` +
    `      contents: [\n` +
    `        {\n` +
    `          uri: uri.href,\n` +
    `          mimeType: "text/plain",\n` +
    `          text: "This is an example MCP server. Edit me to return real data.",\n` +
    `        },\n` +
    `      ],\n` +
    `    })\n` +
    `  );\n` +
    `\n` +
    `  // Dynamic resource — {name} extracted from URI and passed to handler\n` +
    `  server.registerResource(\n` +
    `    "greeting",\n` +
    `    new ResourceTemplate("greeting://{name}", { list: undefined }),\n` +
    `    {\n` +
    `      description: "A personalised greeting for any name",\n` +
    `      mimeType: "text/plain",\n` +
    `    },\n` +
    `    async (uri, { name }) => ({\n` +
    `      contents: [\n` +
    `        {\n` +
    `          uri: uri.href,\n` +
    `          mimeType: "text/plain",\n` +
    "          text: `Hello, ${name}! Welcome to MCP.`,\n" +
    `        },\n` +
    `      ],\n` +
    `    })\n` +
    `  );\n` +
    `}\n`
  );
}

// ---------------------------------------------------------------------------
// Prompt file
// ---------------------------------------------------------------------------

function generateExamplePrompt(options: ProjectOptions): string {
  const isTs = options.lang === "ts";

  if (isTs) {
    return (
      `import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";\n` +
      `import { z } from "zod";\n` +
      `\n` +
      `/**\n` +
      ` * Register example prompts on the given server.\n` +
      ` *\n` +
      ` * Prompts are reusable message templates that help users interact with\n` +
      ` * LLMs consistently. Clients show them in a prompt picker UI.\n` +
      ` *\n` +
      ` * argsSchema  — Zod shape defining what the user fills in\n` +
      ` * handler     — builds the messages array from those arguments\n` +
      ` */\n` +
      `export function registerExamplePrompt(server: McpServer): void {\n` +
      `  server.registerPrompt(\n` +
      `    // Prompt name — displayed in the client's prompt picker\n` +
      `    "summarize",\n` +
      `    {\n` +
      `      description: "Summarize the provided text in a chosen length",\n` +
      `      // argsSchema: the fields the user fills in when selecting this prompt\n` +
      `      argsSchema: {\n` +
      `        text: z.string().describe("The text to summarize"),\n` +
      `        length: z\n` +
      `          .enum(["short", "medium", "long"])\n` +
      `          .default("medium")\n` +
      `          .describe("Desired summary length"),\n` +
      `      },\n` +
      `    },\n` +
      `    // Return the messages array that will be sent to the LLM\n` +
      `    ({ text, length }) => ({\n` +
      `      messages: [\n` +
      `        {\n` +
      `          role: "user" as const,\n` +
      `          content: {\n` +
      `            type: "text" as const,\n` +
      "            text: `Please summarize the following text in a ${length} format:\\n\\n${text}`,\n" +
      `          },\n` +
      `        },\n` +
      `      ],\n` +
      `    })\n` +
      `  );\n` +
      `}\n`
    );
  }

  return (
    `import { z } from "zod";\n` +
    `\n` +
    `/**\n` +
    ` * Register example prompts on the given server.\n` +
    ` * Prompts are reusable message templates shown in the client's prompt picker.\n` +
    ` */\n` +
    `export function registerExamplePrompt(server) {\n` +
    `  server.registerPrompt(\n` +
    `    "summarize",\n` +
    `    {\n` +
    `      description: "Summarize the provided text in a chosen length",\n` +
    `      argsSchema: {\n` +
    `        text: z.string().describe("The text to summarize"),\n` +
    `        length: z\n` +
    `          .enum(["short", "medium", "long"])\n` +
    `          .default("medium")\n` +
    `          .describe("Desired summary length"),\n` +
    `      },\n` +
    `    },\n` +
    `    ({ text, length }) => ({\n` +
    `      messages: [\n` +
    `        {\n` +
    `          role: "user",\n` +
    `          content: {\n` +
    `            type: "text",\n` +
    "            text: `Please summarize the following text in a ${length} format:\\n\\n${text}`,\n" +
    `          },\n` +
    `        },\n` +
    `      ],\n` +
    `    })\n` +
    `  );\n` +
    `}\n`
  );
}
