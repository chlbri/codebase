# @bemedev/codebase

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node.js](https://img.shields.io/badge/node-%3E%3D22-green.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)

A powerful CLI to generate and analyze your TypeScript/JavaScript codebase.
This tool allows partial importing of libraries and generates comprehensive
analyses of your source code.

## 🚀 Main Features

- **📊 Codebase analysis**: Full analysis of imports, exports and
  dependencies
- **🔧 Automatic generation**: Creates detailed JSON analysis files
- **⚡ Intuitive CLI**: Simple and effective command-line interface
- **📦 Partial import**: Selective import of library parts
- **🎯 Flexible exclusion**: Ability to exclude specific files
- **📈 Statistics**: Detailed reports about your codebase

## 📋 Prerequisites

- **Node.js** ≥ 22.0.0
- **pnpm** (recommended) or npm/yarn

## 🛠️ Installation

### Global installation (recommended)

```bash
pnpm add -g @bemedev/codebase
```

### Local installation

```bash
pnpm add @bemedev/codebase
```

### Development installation

```bash
pnpm add -D @bemedev/codebase
```

## 🎯 Usage

### CLI

#### Generate a codebase analysis

```bash
# Basic analysis - generates a codebase.json file
@bemedev/codebase

# Specify a custom output file
@bemedev/codebase --output my-analysis.json

# Exclude specific files
@bemedev/codebase --exclude node_modules dist lib build

# Use short options
@bemedev/codebase -o output.json node_modules dist
```

#### Available options

- `-o, --output <file>` : Output file (default: `codebase.json`)
- `[excludes...]` : List of files/folders to exclude

### Programmatic API

```typescript
import { generate, analyze } from '@bemedev/codebase';

// Analyze the codebase
const analysis = analyze('src');

// Generate an analysis file
await generate({
  output: 'my-codebase.json',
  excludes: ['node_modules', 'dist'],
});
```

## 📊 Output format

The generated JSON file contains:

```json
{
  "STATS": {
    "files": 42,
    "imports": 156,
    "exports": 89
  },
  "CODEBASE_ANALYSIS": {
    "src/index.ts": {
      "imports": ["./functions", "./types"],
      "relativePath": "src/index.ts",
      "text": "export * from './functions';"
    }
  }
}
```

## 🏗️ Project structure

```
src/
├── cli/           # CLI interface
├── functions/     # Core functions
│   ├── add.ts     # Add dependencies
│   ├── generate.ts # Generate analysis
│   ├── init.ts    # Initialization
│   └── remove.ts  # Removal
├── analyze.ts     # Analysis engine
├── types.ts       # TypeScript definitions
└── constants.ts   # Global constants
```

## 🧪 Development scripts

```bash
# Run tests
pnpm test

# Linting
pnpm lint

# Build
pnpm build

# Development mode with watch
pnpm dev
```

## 🎨 Examples

### Analyze a React project

```bash
@bemedev/codebase -o react-analysis.json node_modules public build
```

### Analyze a Node.js project

```bash
@bemedev/codebase -o backend-analysis.json node_modules dist coverage
```

### Integrate into an NPM script

```json
{
  "scripts": {
    "analyze": "@bemedev/codebase -o analysis/codebase.json",
    "analyze:clean": "@bemedev/codebase -o analysis/clean.json node_modules dist lib build"
  }
}
```

## 🤝 Contribution

Contributions are welcome! How to contribute:

1. Fork the project
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Contribution guidelines

- Follow commit conventions
  ([Conventional Commits](https://www.conventionalcommits.org/))
- Add tests for new features
- Update documentation when necessary
- Respect existing code style

## 🐛 Report a bug

If you find a bug, please
[open an issue](https://github.com/chlbri/codebase/issues) with:

- A clear description of the problem
- Steps to reproduce the bug
- Your environment (OS, Node.js version, etc.)
- Error logs if available

## License ([_MIT_](LICENSE))

<br/>

## [CHANGE_LOG](CHANGE_LOG.md)

<br/>

## Author

[chlbri](bri_lvi@icloud.com), my
[github](https://github.com/chlbri?tab=repositories)

[<svg width="98" height="96" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M48.854 0C21.839 0 0 22 0 49.217c0 21.756 13.993 40.172 33.405 46.69 2.427.49 3.316-1.059 3.316-2.362 0-1.141-.08-5.052-.08-9.127-13.59 2.934-16.42-5.867-16.42-5.867-2.184-5.704-5.42-7.17-5.42-7.17-4.448-3.015.324-3.015.324-3.015 4.934.326 7.523 5.052 7.523 5.052 4.367 7.496 11.404 5.378 14.235 4.074.404-3.178 1.699-5.378 3.074-6.6-10.839-1.141-22.243-5.378-22.243-24.283 0-5.378 1.94-9.778 5.014-13.2-.485-1.222-2.184-6.275.486-13.038 0 0 4.125-1.304 13.426 5.052a46.97 46.97 0 0 1 12.214-1.63c4.125 0 8.33.571 12.213 1.63 9.302-6.356 13.427-5.052 13.427-5.052 2.67 6.763.97 11.816.485 13.038 3.155 3.422 5.015 7.822 5.015 13.2 0 18.905-11.404 23.06-22.324 24.283 1.78 1.548 3.316 4.481 3.316 9.126 0 6.6-.08 11.897-.08 13.526 0 1.304.89 2.853 3.316 2.364 19.412-6.52 33.405-24.935 33.405-46.691C97.707 22 75.788 0 48.854 0z" fill="#24292f"/></svg>](https://github.com/chlbri?tab=repositories)

<br/>

## Links

- [Documentation](https://github.com/chlbri/codebase)
