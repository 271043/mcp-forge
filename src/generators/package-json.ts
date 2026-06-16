import type { ProjectOptions } from "../types.js";

export function generatePackageJson(options: ProjectOptions): string {
  const { projectName, transport, lang } = options;

  const deps: Record<string, string> = {
    "@modelcontextprotocol/sdk": "latest",
    zod: "^3.25.0",
  };

  if (transport === "http") {
    deps["express"] = "^4.21.0";
  }

  const devDeps: Record<string, string> = {
    "@types/node": "^20.0.0",
  };

  if (lang === "ts") {
    devDeps["tsx"] = "^4.0.0";
    devDeps["typescript"] = "^5.5.0";
  }

  if (transport === "http") {
    devDeps["@types/express"] = "^4.17.21";
  }

  const scripts: Record<string, string> =
    lang === "ts"
      ? {
          dev: "tsx --watch src/index.ts",
          build: "tsc",
          start: "node dist/index.js",
        }
      : {
          dev: "node --watch src/index.js",
          start: "node src/index.js",
        };

  const pkg = {
    name: projectName,
    version: "0.1.0",
    description: `MCP server: ${projectName}`,
    type: "module",
    scripts,
    dependencies: deps,
    devDependencies: devDeps,
    engines: { node: ">=18.0.0" },
  };

  return JSON.stringify(pkg, null, 2) + "\n";
}
