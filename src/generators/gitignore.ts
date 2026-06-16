export function generateGitignore(): string {
  return `node_modules/
dist/
*.js.map
.env
.DS_Store
`;
}
