# TypeLens

> Debug TypeScript types like you debug code

English | [简体中文](./README.zh-CN.md)

TypeLens is a powerful VS Code extension that makes TypeScript types transparent and debuggable. Inspect complex types, compare type differences, and understand type errors visually.

## ✨ Features

- 🔍 **Type Inspector** - Visualize complex TypeScript types with an interactive tree view
- ⚖️ **Type Diff** - Compare expected vs actual types side-by-side
- 💡 **Error Context** - Quick actions to debug type errors directly from error messages
- 🎯 **Code Lens** - Inspect types with a single click
- ⚡ **Fast & Lightweight** - Built with performance in mind

## 🚀 Quick Start

### Installation

1. Open VS Code
2. Go to Extensions (`Cmd/Ctrl + Shift + X`)
3. Search for "TypeLens"
4. Click Install

### Usage

**Inspect a Type:**

- Right-click on any TypeScript identifier → "Inspect Type with TypeLens"
- Or use keyboard shortcut: `Cmd/Ctrl + Shift + T`

**Compare Types:**

- Click the 💡 lightbulb on type errors
- Select "Compare Types in TypeLens"

## 🛠️ Development

This project uses a Monorepo architecture with pnpm and Turborepo.

### Prerequisites

- Node.js >= 18.0.0
- pnpm >= 8.0.0

### Setup

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run in development mode
pnpm dev
```

### Project Structure

```
typeLens/
├── packages/
│   ├── shared/      # Shared types and utilities
│   ├── core/        # Type analysis engine
│   └── extension/   # VS Code extension
```

### Testing

```bash
# Type check
pnpm typecheck

# Run tests
pnpm test

# Lint
pnpm lint
```

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for details.

## 📄 License

MIT License - see [LICENSE](./LICENSE) for details

## 🙏 Acknowledgments

Built with:

- [TypeScript Compiler API](https://github.com/microsoft/TypeScript)
- [VS Code Extension API](https://code.visualstudio.com/api)
- [Turborepo](https://turbo.build/)

---

**Status**: 🚧 Under active development

**Roadmap**: See [PROJECT_PLAN.md](./PROJECT_PLAN.md) for detailed development plans
