import fs from "node:fs";
import path from "node:path";
import type { ProjectOptions } from "../types.js";
import { generatePackageJson } from "./package-json.js";
import { generateTsConfig } from "./tsconfig.js";
import { generateGitignore } from "./gitignore.js";
import { generateReadme } from "./readme.js";
import { generateClaudeConfig } from "./claude-config.js";
import { generateSourceFiles } from "./source-files.js";

export async function createProject(
  targetDir: string,
  options: ProjectOptions
): Promise<void> {
  fs.mkdirSync(targetDir, { recursive: true });

  function write(filePath: string, content: string): void {
    const fullPath = path.join(targetDir, filePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content, "utf-8");
    console.log(`  created  ${filePath}`);
  }

  write("package.json", generatePackageJson(options));

  if (options.lang === "ts") {
    write("tsconfig.json", generateTsConfig());
  }

  write(".gitignore", generateGitignore());
  write("README.md", generateReadme(options));
  write("claude_desktop_config.example.json", generateClaudeConfig(options));

  const sourceFiles = generateSourceFiles(options);
  for (const [filePath, content] of Object.entries(sourceFiles)) {
    write(filePath, content);
  }
}
