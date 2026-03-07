# my-first-extension

My first TypeScript extension for Gemini CLI.

## Project Structure

- `src/index.ts`: Entry point for the MCP server.
- `src/tools/`: Custom tool definitions (TypeScript).
- `src/prompts/`: Custom prompt definitions.
- `gemini-extension.json`: Extension manifest.
- `package.json`: Node.js dependencies and scripts.
- `tsconfig.json`: TypeScript configuration.
- `dist/`: Compiled build artifacts (generated).

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Build the Extension

```bash
npm run build
```

### 3. Link the Extension to Gemini CLI

```bash
gemini extensions link .
```

### 4. Use the Extension

You can now use the `hello_world` tool and `extension-helper` prompt in Gemini CLI.

```bash
gemini "say hello to Gemini using my-first-extension"
```

## Development

Run the watcher to automatically rebuild on changes:

```bash
npm run watch
```
