# Contributing to EVM MCP Server

Thank you for your interest in contributing to the EVM MCP Server project! This document provides guidelines and instructions for contributing to the project.

## Project Structure

```
evm-mcp-server/
├── config/           # Configuration files
│   ├── webpack/     # Webpack configurations
│   ├── vscode/      # VSCode settings
│   └── github/      # GitHub workflows
├── docs/            # Documentation
├── src/             # Source code
│   ├── main/        # Electron main process
│   ├── renderer/    # Frontend application
│   ├── core/        # Core Bitcoin functionality
│   ├── server/      # Backend server
│   ├── types/       # TypeScript type definitions
│   ├── utils/       # Shared utilities
│   └── constants/   # Application constants
└── scripts/         # Build and development scripts
```

## Development Setup

1. **Prerequisites**
   - Node.js (v18 or later)
   - pnpm or bun package manager
   - Git

2. **Installation**
   ```bash
   git clone https://github.com/your-org/evm-mcp-server.git
   cd evm-mcp-server
   pnpm install  # or bun install
   ```

3. **Development**
   ```bash
   pnpm electron:start  # Start development server
   ```

## Code Style

- Follow TypeScript best practices
- Use ESLint and Prettier for code formatting
- Write meaningful commit messages
- Include tests for new features

## Pull Request Process

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Commit Message Format

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Test-related changes
- `chore`: Maintenance tasks

## Testing

- Run tests: `pnpm test`
- Run tests with coverage: `pnpm test:coverage`

## Documentation

- Update relevant documentation when adding new features
- Follow the existing documentation style
- Include examples where appropriate

## Questions?

Feel free to open an issue or reach out to the maintainers for any questions. 