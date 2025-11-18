# Contributing to TypeLens

First off, thank you for considering contributing to TypeLens! 🎉

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Setup](#development-setup)
- [Pull Request Process](#pull-request-process)
- [Coding Guidelines](#coding-guidelines)

## Code of Conduct

This project adheres to a [Code of Conduct](./CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## How Can I Contribute?

### 🐛 Reporting Bugs

Before creating bug reports, please check existing issues. When creating a bug report, include:

- Clear and descriptive title
- Steps to reproduce the issue
- Expected vs actual behavior
- TypeScript version and VS Code version
- Code samples (if applicable)

### 💡 Suggesting Features

Feature requests are welcome! Please:

- Check if the feature has already been suggested
- Provide a clear use case
- Explain why this would be useful to most users

### 🔧 Pull Requests

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to your branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Development Setup

### Prerequisites

- Node.js >= 18.0.0
- pnpm >= 8.0.0
- VS Code

### Installation

```bash
# Clone the repository
git clone https://github.com/lyw405/typeLens.git
cd typeLens

# Install dependencies
pnpm install

# Build packages
pnpm build
```

### Running the Extension

1. Open the project in VS Code
2. Press `F5` to start debugging
3. A new VS Code window will open with the extension loaded

### Running Tests

```bash
# Type check
pnpm typecheck

# Run tests
pnpm test

# Lint
pnpm lint
```

## Pull Request Process

1. **Update Documentation**: Update README.md if you changed functionality
2. **Add Tests**: Ensure your changes are covered by tests
3. **Follow Code Style**: Run `pnpm lint` before committing
4. **Type Check**: Run `pnpm typecheck` to ensure no type errors
5. **Update Changelog**: Add a note to the unreleased section

### Commit Message Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add type history feature
fix: resolve crash when inspecting recursive types
docs: update installation guide
chore: upgrade dependencies
```

## Coding Guidelines

### TypeScript

- Use TypeScript strict mode
- Prefer interfaces over types for object shapes
- Add JSDoc comments for public APIs
- Avoid `any` - use `unknown` when type is truly unknown

### Code Style

- Use Prettier for formatting (configured in `.prettierrc`)
- Use ESLint rules (configured in `.eslintrc.js`)
- Follow existing code patterns

### Package Structure

```
packages/
├── shared/      # No dependencies on other packages
├── core/        # Depends only on shared
└── extension/   # Depends on core and shared
```

## Project Architecture

- **@typelens/shared**: Shared types and utilities
- **@typelens/core**: Type serialization and diffing engine
- **@typelens/extension**: VS Code extension implementation

## Getting Help

- 💬 Open a [Discussion](https://github.com/lyw405/typeLens/discussions)
- 🐛 Report bugs via [Issues](https://github.com/lyw405/typeLens/issues)
- 📧 Contact maintainers (see package.json)

## Recognition

Contributors will be recognized in:

- README.md contributors section
- GitHub releases
- Extension marketplace listing

---

Thank you for contributing to TypeLens! 🚀
