import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { createProject } from "../src/generators/index.js";
import type { ProjectOptions } from "../src/types.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function tmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "create-mcp-server-test-"));
}

function listFiles(dir: string): string[] {
  const files: string[] = [];
  function walk(current: string) {
    for (const entry of fs.readdirSync(current)) {
      const full = path.join(current, entry);
      if (fs.statSync(full).isDirectory()) {
        walk(full);
      } else {
        files.push(path.relative(dir, full).replace(/\\/g, "/"));
      }
    }
  }
  walk(dir);
  return files.sort();
}

function readFile(dir: string, filePath: string): string {
  return fs.readFileSync(path.join(dir, filePath), "utf-8");
}

function readJson(dir: string, filePath: string): Record<string, unknown> {
  return JSON.parse(readFile(dir, filePath)) as Record<string, unknown>;
}

function opts(overrides: Partial<ProjectOptions> = {}): ProjectOptions {
  return {
    projectName: "test-project",
    template: "minimal",
    transport: "stdio",
    lang: "ts",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("createProject", () => {
  let tmp: string;
  let projectDir: string;

  beforeEach(() => {
    tmp = tmpDir();
    projectDir = path.join(tmp, "test-project");
  });

  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  // ── minimal + stdio + ts ──────────────────────────────────────────────────

  describe("minimal + stdio + ts (defaults)", () => {
    it("creates expected file set", async () => {
      await createProject(projectDir, opts());
      const files = listFiles(projectDir);
      expect(files).toContain("package.json");
      expect(files).toContain("tsconfig.json");
      expect(files).toContain(".gitignore");
      expect(files).toContain("README.md");
      expect(files).toContain("claude_desktop_config.example.json");
      expect(files).toContain("src/index.ts");
      // minimal → no sub-directories for tools/resources/prompts
      expect(files).not.toContain("src/tools/example-tool.ts");
      expect(files).not.toContain("src/resources/example-resource.ts");
      expect(files).not.toContain("src/prompts/example-prompt.ts");
    });

    it("package.json has correct name, type, and scripts", async () => {
      await createProject(projectDir, opts());
      const pkg = readJson(projectDir, "package.json");
      expect(pkg["name"]).toBe("test-project");
      expect(pkg["type"]).toBe("module");
      const scripts = pkg["scripts"] as Record<string, string>;
      expect(scripts["dev"]).toContain("tsx");
      expect(scripts["build"]).toBeDefined();
      expect(scripts["start"]).toBeDefined();
    });

    it("package.json has MCP SDK and zod as dependencies", async () => {
      await createProject(projectDir, opts());
      const pkg = readJson(projectDir, "package.json");
      const deps = pkg["dependencies"] as Record<string, string>;
      expect(deps["@modelcontextprotocol/sdk"]).toBeDefined();
      expect(deps["zod"]).toBeDefined();
      expect(deps["express"]).toBeUndefined();
    });

    it("package.json has tsx and typescript as devDependencies", async () => {
      await createProject(projectDir, opts());
      const pkg = readJson(projectDir, "package.json");
      const dev = pkg["devDependencies"] as Record<string, string>;
      expect(dev["tsx"]).toBeDefined();
      expect(dev["typescript"]).toBeDefined();
    });

    it("src/index.ts uses StdioServerTransport and registers echo tool", async () => {
      await createProject(projectDir, opts());
      const content = readFile(projectDir, "src/index.ts");
      expect(content).toContain("StdioServerTransport");
      expect(content).toContain("registerTool");
      expect(content).toContain('"echo"');
      expect(content).toContain("z.string()");
      expect(content).not.toContain("StreamableHTTPServerTransport");
    });

    it("tsconfig.json is valid JSON with strict mode", async () => {
      await createProject(projectDir, opts());
      const cfg = readJson(projectDir, "tsconfig.json");
      const co = cfg["compilerOptions"] as Record<string, unknown>;
      expect(co["strict"]).toBe(true);
      expect(co["outDir"]).toBe("./dist");
    });

    it("claude_desktop_config uses node command with dist/index.js path", async () => {
      await createProject(projectDir, opts());
      const cfg = readJson(projectDir, "claude_desktop_config.example.json");
      const servers = cfg["mcpServers"] as Record<string, Record<string, unknown>>;
      const server = servers["test-project"];
      expect(server["command"]).toBe("node");
      const args = server["args"] as string[];
      expect(args[0]).toContain("dist/index.js");
    });
  });

  // ── minimal + stdio + js ──────────────────────────────────────────────────

  describe("minimal + stdio + js", () => {
    it("creates src/index.js, not .ts; no tsconfig", async () => {
      await createProject(projectDir, opts({ lang: "js" }));
      const files = listFiles(projectDir);
      expect(files).toContain("src/index.js");
      expect(files).not.toContain("src/index.ts");
      expect(files).not.toContain("tsconfig.json");
    });

    it("package.json uses node --watch and has no tsx/typescript devDeps", async () => {
      await createProject(projectDir, opts({ lang: "js" }));
      const pkg = readJson(projectDir, "package.json");
      const scripts = pkg["scripts"] as Record<string, string>;
      expect(scripts["dev"]).toContain("node --watch");
      expect(scripts["build"]).toBeUndefined();
      const dev = pkg["devDependencies"] as Record<string, string>;
      expect(dev["tsx"]).toBeUndefined();
      expect(dev["typescript"]).toBeUndefined();
    });

    it("claude_desktop_config uses src/index.js path for JS", async () => {
      await createProject(projectDir, opts({ lang: "js" }));
      const cfg = readJson(projectDir, "claude_desktop_config.example.json");
      const servers = cfg["mcpServers"] as Record<string, Record<string, unknown>>;
      const args = servers["test-project"]["args"] as string[];
      expect(args[0]).toContain("src/index.js");
    });
  });

  // ── minimal + http + ts ───────────────────────────────────────────────────

  describe("minimal + http + ts", () => {
    it("package.json includes express dep and @types/express devDep", async () => {
      await createProject(projectDir, opts({ transport: "http" }));
      const pkg = readJson(projectDir, "package.json");
      const deps = pkg["dependencies"] as Record<string, string>;
      const dev = pkg["devDependencies"] as Record<string, string>;
      expect(deps["express"]).toBeDefined();
      expect(dev["@types/express"]).toBeDefined();
    });

    it("src/index.ts uses StreamableHTTPServerTransport and express", async () => {
      await createProject(projectDir, opts({ transport: "http" }));
      const content = readFile(projectDir, "src/index.ts");
      expect(content).toContain("StreamableHTTPServerTransport");
      expect(content).toContain("express");
      expect(content).toContain("/mcp");
      expect(content).not.toContain("StdioServerTransport");
    });

    it("claude_desktop_config uses mcp-remote for HTTP transport", async () => {
      await createProject(projectDir, opts({ transport: "http" }));
      const cfg = readJson(projectDir, "claude_desktop_config.example.json");
      const servers = cfg["mcpServers"] as Record<string, Record<string, unknown>>;
      const server = servers["test-project"];
      expect(server["command"]).toBe("npx");
      const args = server["args"] as string[];
      expect(args).toContain("mcp-remote");
    });
  });

  // ── minimal + http + js ───────────────────────────────────────────────────

  describe("minimal + http + js", () => {
    it("src/index.js has HTTP transport, no tsconfig", async () => {
      await createProject(projectDir, opts({ transport: "http", lang: "js" }));
      const files = listFiles(projectDir);
      expect(files).toContain("src/index.js");
      expect(files).not.toContain("tsconfig.json");
      const content = readFile(projectDir, "src/index.js");
      expect(content).toContain("StreamableHTTPServerTransport");
    });
  });

  // ── full + stdio + ts ─────────────────────────────────────────────────────

  describe("full + stdio + ts", () => {
    it("creates all template files", async () => {
      await createProject(projectDir, opts({ template: "full" }));
      const files = listFiles(projectDir);
      expect(files).toContain("src/index.ts");
      expect(files).toContain("src/tools/example-tool.ts");
      expect(files).toContain("src/resources/example-resource.ts");
      expect(files).toContain("src/prompts/example-prompt.ts");
    });

    it("index.ts imports from tools, resources, prompts", async () => {
      await createProject(projectDir, opts({ template: "full" }));
      const content = readFile(projectDir, "src/index.ts");
      expect(content).toContain("example-tool");
      expect(content).toContain("example-resource");
      expect(content).toContain("example-prompt");
      expect(content).toContain("registerEchoTool");
      expect(content).toContain("registerExampleResource");
      expect(content).toContain("registerExamplePrompt");
    });

    it("example-tool.ts has McpServer type, zod schema, registerTool call", async () => {
      await createProject(projectDir, opts({ template: "full" }));
      const content = readFile(projectDir, "src/tools/example-tool.ts");
      expect(content).toContain("McpServer");
      expect(content).toContain("registerTool");
      expect(content).toContain("z.string()");
      expect(content).toContain("registerEchoTool");
    });

    it("example-resource.ts imports and uses ResourceTemplate", async () => {
      await createProject(projectDir, opts({ template: "full" }));
      const content = readFile(projectDir, "src/resources/example-resource.ts");
      expect(content).toContain("ResourceTemplate");
      expect(content).toContain("registerResource");
      expect(content).toContain("registerExampleResource");
    });

    it("example-prompt.ts has argsSchema with zod fields", async () => {
      await createProject(projectDir, opts({ template: "full" }));
      const content = readFile(projectDir, "src/prompts/example-prompt.ts");
      expect(content).toContain("registerPrompt");
      expect(content).toContain("argsSchema");
      expect(content).toContain("registerExamplePrompt");
      expect(content).toContain("z.string()");
    });
  });

  // ── full + stdio + js ─────────────────────────────────────────────────────

  describe("full + stdio + js", () => {
    it("creates .js files, not .ts", async () => {
      await createProject(projectDir, opts({ template: "full", lang: "js" }));
      const files = listFiles(projectDir);
      expect(files).toContain("src/tools/example-tool.js");
      expect(files).toContain("src/resources/example-resource.js");
      expect(files).toContain("src/prompts/example-prompt.js");
      expect(files).not.toContain("src/tools/example-tool.ts");
    });

    it("js tool file has no TypeScript types", async () => {
      await createProject(projectDir, opts({ template: "full", lang: "js" }));
      const content = readFile(projectDir, "src/tools/example-tool.js");
      expect(content).not.toContain(": McpServer");
      expect(content).not.toContain(": void");
      expect(content).toContain("registerEchoTool");
    });
  });

  // ── full + http + ts ──────────────────────────────────────────────────────

  describe("full + http + ts", () => {
    it("index.ts uses HTTP transport and imports all modules", async () => {
      await createProject(projectDir, opts({ template: "full", transport: "http" }));
      const content = readFile(projectDir, "src/index.ts");
      expect(content).toContain("StreamableHTTPServerTransport");
      expect(content).toContain("express");
      expect(content).toContain("registerEchoTool");
      expect(content).toContain("registerExampleResource");
      expect(content).toContain("registerExamplePrompt");
    });

    it("package.json has express and @types/express", async () => {
      await createProject(projectDir, opts({ template: "full", transport: "http" }));
      const pkg = readJson(projectDir, "package.json");
      const deps = pkg["dependencies"] as Record<string, string>;
      const dev = pkg["devDependencies"] as Record<string, string>;
      expect(deps["express"]).toBeDefined();
      expect(dev["@types/express"]).toBeDefined();
    });
  });

  // ── full + http + js ──────────────────────────────────────────────────────

  describe("full + http + js", () => {
    it("creates all js files with http transport", async () => {
      await createProject(projectDir, opts({ template: "full", transport: "http", lang: "js" }));
      const files = listFiles(projectDir);
      expect(files).toContain("src/index.js");
      expect(files).toContain("src/tools/example-tool.js");
      expect(files).toContain("src/resources/example-resource.js");
      expect(files).toContain("src/prompts/example-prompt.js");
      expect(files).not.toContain("tsconfig.json");
    });
  });

  // ── project name is used correctly ────────────────────────────────────────

  describe("project name propagation", () => {
    it("package.json name matches provided project name", async () => {
      const dir = path.join(tmp, "cool-mcp");
      await createProject(dir, opts({ projectName: "cool-mcp" }));
      const pkg = readJson(dir, "package.json");
      expect(pkg["name"]).toBe("cool-mcp");
    });

    it("claude_desktop_config key matches project name", async () => {
      const dir = path.join(tmp, "cool-mcp");
      await createProject(dir, opts({ projectName: "cool-mcp" }));
      const cfg = readJson(dir, "claude_desktop_config.example.json");
      const servers = cfg["mcpServers"] as Record<string, unknown>;
      expect(Object.keys(servers)).toContain("cool-mcp");
    });
  });
});
