# mcp-forge

CLI scaffolding tool for [Model Context Protocol](https://modelcontextprotocol.io) servers.

```bash
npx mcp-forge my-server
```

## Usage

```bash
# Interactive mode — answers prompts to choose options
npx mcp-forge my-server

# Non-interactive — pass all flags to skip prompts
npx mcp-forge my-server --template full --transport stdio --lang ts
```

## Options

| Flag | Values | Description |
|------|--------|-------------|
| `--template` | `minimal`, `full` | `minimal`: one echo tool. `full`: tool + resource + prompt examples |
| `--transport` | `stdio`, `http` | `stdio`: Claude Desktop / local. `http`: Streamable HTTP for remote |
| `--lang` | `ts`, `js` | TypeScript or JavaScript |

## Generated project

After running, you get a ready-to-run project:

```
my-server/
├── package.json
├── tsconfig.json          (TypeScript only)
├── .gitignore
├── README.md
├── claude_desktop_config.example.json
└── src/
    ├── index.ts           (server entry point)
    ├── tools/
    │   └── example-tool.ts
    ├── resources/
    │   └── example-resource.ts
    └── prompts/
        └── example-prompt.ts
```

Then:

```bash
cd my-server
npm install
npm run dev
```

## Development

```bash
npm install
npm run dev -- my-test-server    # run CLI locally
npm test                          # run unit tests
npm run build                     # compile to dist/
```

## Links

- [MCP documentation](https://modelcontextprotocol.io/docs)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [MCP specification](https://spec.modelcontextprotocol.io)

## License

MIT
