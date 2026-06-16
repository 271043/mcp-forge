import type { ProjectOptions } from "../types.js";

export function generateClaudeConfig(options: ProjectOptions): string {
  const { projectName, transport, lang } = options;

  let serverEntry: object;

  if (transport === "stdio") {
    // stdio: Claude Desktop runs the server process directly
    const entryFile =
      lang === "ts"
        ? `/absolute/path/to/${projectName}/dist/index.js`
        : `/absolute/path/to/${projectName}/src/index.js`;

    serverEntry = {
      command: "node",
      args: [entryFile],
      // To pass environment variables, uncomment and fill in:
      // env: { MY_API_KEY: "your-key-here" }
    };
  } else {
    // http: use mcp-remote to proxy the HTTP connection as stdio
    // The server must already be running (npm run dev or deployed URL)
    serverEntry = {
      command: "npx",
      args: ["-y", "mcp-remote", "http://localhost:3000/mcp"],
    };
  }

  const config = {
    mcpServers: {
      [projectName]: serverEntry,
    },
  };

  return JSON.stringify(config, null, 2) + "\n";
}
