export interface ProjectOptions {
  projectName: string;
  template: "minimal" | "full";
  transport: "stdio" | "http";
  lang: "ts" | "js";
}
