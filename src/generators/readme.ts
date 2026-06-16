import type { ProjectOptions } from "../types.js";

export function generateReadme(options: ProjectOptions): string {
  const { projectName, template, transport, lang } = options;
  const ext = lang === "ts" ? "ts" : "js";
  const langLabel = lang === "ts" ? "TypeScript" : "JavaScript";
  const transportLabel =
    transport === "stdio"
      ? "stdio (Claude Desktop / local clients)"
      : "Streamable HTTP (remote/web clients)";

  const structure =
    template === "full"
      ? [
          `src/`,
          `├── index.${ext}               # server entry point`,
          `├── tools/`,
          `│   └── example-tool.${ext}`,
          `├── resources/`,
          `│   └── example-resource.${ext}`,
          `└── prompts/`,
          `    └── example-prompt.${ext}`,
        ].join("\n")
      : [`src/`, `└── index.${ext}               # server entry point with echo tool`].join("\n");

  const addToolExample = [
    "```" + (lang === "ts" ? "typescript" : "javascript"),
    `server.registerTool(`,
    `  "my-tool",`,
    `  {`,
    `    description: "What this tool does",`,
    `    inputSchema: {`,
    `      param: z.string().describe("A required parameter"),`,
    `    },`,
    `  },`,
    `  async ({ param }) => ({`,
    `    content: [{ type: "text", text: \`Result: \${param}\` }],`,
    `  })`,
    `);`,
    "```",
  ].join("\n");

  const addToolFile =
    template === "full"
      ? `\`src/tools/example-tool.${ext}\` or create a new file and register it in \`src/index.${ext}\``
      : `\`src/index.${ext}\``;

  const runSteps =
    transport === "stdio"
      ? lang === "ts"
        ? ["```bash", "npm run dev    # run with tsx (no build step needed)", "npm run build  # compile to dist/", "npm start      # run compiled output", "```"].join("\n")
        : ["```bash", "npm run dev    # run with node --watch", "npm start      # run without watch", "```"].join("\n")
      : lang === "ts"
      ? ["```bash", "npm run dev    # start HTTP server on http://localhost:3000/mcp", "npm run build  # compile to dist/", "npm start      # run compiled output", "```"].join("\n")
      : ["```bash", "npm run dev    # start HTTP server on http://localhost:3000/mcp", "npm start      # run without watch", "```"].join("\n");

  const connectSection =
    transport === "stdio"
      ? [
          "### Claude Desktop",
          "",
          "1. Run `npm run build` to compile (TypeScript only).",
          "2. Copy the contents of `claude_desktop_config.example.json` to your Claude Desktop config file:",
          "   - **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`",
          "   - **Windows**: `%APPDATA%\\Claude\\claude_desktop_config.json`",
          "3. Update the path inside to point to the actual `dist/index.js` (TS) or `src/index.js` (JS) on your machine.",
          "4. Restart Claude Desktop.",
          "",
          "### claude.ai (via Claude Code MCP)",
          "",
          "Run your server locally and use `/mcp add` in Claude Code to connect.",
        ].join("\n")
      : [
          "### Local testing with an MCP client",
          "",
          "1. Start the server: `npm run dev`",
          "2. The endpoint is `http://localhost:3000/mcp`",
          "",
          "### Claude Desktop (HTTP via mcp-remote)",
          "",
          "1. Start the server and ensure it is reachable.",
          "2. Copy `claude_desktop_config.example.json` to your Claude Desktop config.",
          "3. Restart Claude Desktop.",
          "",
          "### Remote deployment",
          "",
          "Deploy to any Node.js host (Railway, Fly.io, Render, etc.).",
          "Update `claude_desktop_config.example.json` with the deployed URL.",
          "",
          "### claude.ai Remote MCP",
          "",
          "Deploy to a public URL, then go to Settings → Integrations → Add MCP server.",
        ].join("\n");

  return [
    `# ${projectName}`,
    "",
    `MCP server built with [@modelcontextprotocol/sdk](https://github.com/modelcontextprotocol/typescript-sdk).`,
    "",
    `- **Transport**: ${transportLabel}`,
    `- **Template**: ${template}`,
    `- **Language**: ${langLabel}`,
    "",
    "## Getting started",
    "",
    "```bash",
    "npm install",
    "```",
    "",
    runSteps,
    "",
    "## Project structure",
    "",
    "```",
    structure,
    "```",
    "",
    "## Adding a new tool",
    "",
    `Edit ${addToolFile}:`,
    "",
    addToolExample,
    "",
    "## Connecting to Claude",
    "",
    connectSection,
    "",
    "## Learn more",
    "",
    "- [MCP documentation](https://modelcontextprotocol.io/docs)",
    "- [TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)",
    "- [MCP spec](https://spec.modelcontextprotocol.io)",
    "",
  ].join("\n");
}
