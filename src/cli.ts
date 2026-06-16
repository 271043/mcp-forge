import prompts from "prompts";
import path from "node:path";
import fs from "node:fs";
import { createProject } from "./generators/index.js";
import type { ProjectOptions } from "./types.js";

const VERSION = "0.1.0";

function printHelp(): void {
  console.log(`
@sharpbits/create-mcp-server v${VERSION}

Usage:
  npx @sharpbits/create-mcp-server <project-name> [options]

Options:
  --template <minimal|full>    minimal: echo tool only. full: tool + resource + prompt
  --transport <stdio|http>     stdio: local clients. http: Streamable HTTP remote server
  --lang <ts|js>               TypeScript or JavaScript
  --help                       Show this help message
  --version                    Show version

Examples:
  npx @sharpbits/create-mcp-server my-server
  npx @sharpbits/create-mcp-server my-server --template full --transport stdio --lang ts
`);
}

interface ParsedArgs {
  projectName?: string;
  template?: "minimal" | "full";
  transport?: "stdio" | "http";
  lang?: "ts" | "js";
  help?: boolean;
  version?: boolean;
}

function parseArgs(argv: string[]): ParsedArgs {
  const args = argv.slice(2);
  const result: ParsedArgs = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--help" || arg === "-h") {
      result.help = true;
    } else if (arg === "--version" || arg === "-v") {
      result.version = true;
    } else if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const next = args[i + 1];
      let value: string | undefined;

      if (arg.includes("=")) {
        const [k, v] = arg.slice(2).split("=", 2);
        value = v;
        // Re-assign key is not used here; just use the split
        if (k === "template" && (v === "minimal" || v === "full")) result.template = v;
        else if (k === "transport" && (v === "stdio" || v === "http")) result.transport = v;
        else if (k === "lang" && (v === "ts" || v === "js")) result.lang = v;
      } else if (next && !next.startsWith("--")) {
        value = next;
        i++;
        if (key === "template" && (value === "minimal" || value === "full"))
          result.template = value;
        else if (key === "transport" && (value === "stdio" || value === "http"))
          result.transport = value;
        else if (key === "lang" && (value === "ts" || value === "js")) result.lang = value;
      }
    } else if (!result.projectName && !arg.startsWith("-")) {
      result.projectName = arg;
    }
  }

  return result;
}

function validateProjectName(name: string): string | true {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(name)) {
    return "Use lowercase letters, numbers, and hyphens only (must start with a letter or digit)";
  }
  return true;
}

async function main(): Promise<void> {
  console.log("");

  const parsed = parseArgs(process.argv);

  if (parsed.help) {
    printHelp();
    process.exit(0);
  }

  if (parsed.version) {
    console.log(VERSION);
    process.exit(0);
  }

  console.log("create-mcp-server\n");

  // Prompt for project name if not provided
  let projectName = parsed.projectName;
  if (!projectName) {
    const answer = await prompts(
      {
        type: "text",
        name: "projectName",
        message: "Project name:",
        initial: "my-mcp-server",
        validate: validateProjectName,
      },
      { onCancel: () => process.exit(1) }
    );
    projectName = answer.projectName as string;
  } else {
    const validation = validateProjectName(projectName);
    if (validation !== true) {
      console.error(`Error: ${validation}`);
      process.exit(1);
    }
  }

  // Prompt for any options not provided via flags
  const questions: prompts.PromptObject[] = [];

  if (!parsed.template) {
    questions.push({
      type: "select",
      name: "template",
      message: "Template:",
      choices: [
        {
          title: "minimal  — single echo tool, best starting point",
          value: "minimal",
        },
        {
          title: "full     — echo tool + resource + prompt template examples",
          value: "full",
        },
      ],
    });
  }

  if (!parsed.transport) {
    questions.push({
      type: "select",
      name: "transport",
      message: "Transport:",
      choices: [
        {
          title: "stdio  — for Claude Desktop and local MCP clients",
          value: "stdio",
        },
        {
          title: "http   — Streamable HTTP for remote/web deployment",
          value: "http",
        },
      ],
    });
  }

  if (!parsed.lang) {
    questions.push({
      type: "select",
      name: "lang",
      message: "Language:",
      choices: [
        { title: "TypeScript  (recommended)", value: "ts" },
        { title: "JavaScript", value: "js" },
      ],
    });
  }

  const answers =
    questions.length > 0
      ? await prompts(questions, { onCancel: () => process.exit(1) })
      : {};

  const options: ProjectOptions = {
    projectName,
    template: parsed.template ?? (answers.template as "minimal" | "full"),
    transport: parsed.transport ?? (answers.transport as "stdio" | "http"),
    lang: parsed.lang ?? (answers.lang as "ts" | "js"),
  };

  // Guard: if somehow we still don't have answers (user ctrl+c'd midway)
  if (!options.template || !options.transport || !options.lang) {
    process.exit(1);
  }

  const targetDir = path.resolve(process.cwd(), options.projectName);

  if (fs.existsSync(targetDir)) {
    console.error(`\nError: Directory "${options.projectName}" already exists.`);
    process.exit(1);
  }

  console.log(`\nScaffolding project in ${targetDir} ...\n`);

  await createProject(targetDir, options);

  const devCmd = options.lang === "ts" ? "npm run dev" : "npm run dev";

  console.log(`
Done! Next steps:

  cd ${options.projectName}
  npm install
  ${devCmd}

${
  options.transport === "http"
    ? `Then open http://localhost:3000/mcp in an MCP client.\n`
    : `Then connect via Claude Desktop or another MCP client.\n`
}Docs: https://modelcontextprotocol.io/docs
SDK:  https://github.com/modelcontextprotocol/typescript-sdk
`);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
