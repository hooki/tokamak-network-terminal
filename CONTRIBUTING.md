# Contributing to Tokamak Network Terminal

Thank you for your interest in contributing to the Tokamak Network Terminal! This guide will help you get started with development and understand our contribution workflow.

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Git

### Development Setup

1. Clone the repository:
```bash
git clone https://github.com/tokamak-network/tokamak-network-terminal.git
cd tokamak-network-terminal
```

2. Install dependencies:
```bash
npm install
```

3. Run tests to ensure everything is working:
```bash
npm test
```

4. Build the project:
```bash
npm run build
```

## 🛠️ Development Workflow

### Claude Code Commands

This project includes specialized Claude Code commands to streamline development:

#### `/build` Command
The `/build` command automatically handles build issues and type checking:

```bash
/build
```

**What it does:**
1. Runs `npm run build` and analyzes any errors
2. Suggests precise fixes to resolve build errors
3. After fixing, invokes the **ts-type-guardian** sub-agent for code review
4. Ensures no type-related errors remain
5. Returns the final corrected code

**Usage Example:**
- When you encounter build errors
- Before committing changes
- As part of your development workflow

#### `/commit` Command
The `/commit` command creates well-formatted commits with conventional commit messages:

```bash
/commit
/commit --no-verify  # Skip pre-commit checks
```

**What it does:**
1. Runs pre-commit checks (unless `--no-verify` is used):
   - `npm run check` - Code quality
   - `npm run test` - Test verification
   - `npm run build` - Build verification
2. Checks staged files with `git status`
3. Auto-stages all modified files if none are staged
4. Analyzes changes with `git diff`
5. Suggests splitting large commits into smaller, logical commits
6. Creates conventional commit messages with appropriate emojis

**Commit Types:**
- ✨ `feat`: New feature
- 🐛 `fix`: Bug fix
- 📝 `docs`: Documentation changes
- 💄 `style`: Code style changes
- ♻️ `refactor`: Code refactoring
- ⚡️ `perf`: Performance improvements
- ✅ `test`: Adding or fixing tests
- 🔧 `chore`: Tooling, configuration changes

### TypeScript Type Guardian

The **ts-type-guardian** is a specialized sub-agent that enforces strict TypeScript type safety and code quality.

#### Core Principles
- **Maximum Strictness**: Enables all strict TypeScript compiler options
- **No `any` Types**: Prefers `unknown`, generics, and type-narrowing guards
- **No Non-null Assertions (`!`)**: Uses safe guards and refinements
- **Type-only Boundaries**: Consistent `import type` / `export type` usage
- **Biome Integration**: Single source for formatting, linting, and import organization

#### Usage

The ts-type-guardian is automatically invoked by the `/build` command, but you can also use it manually:

```bash
# Invoke through Claude Code
"Please use ts-type-guardian to review my changes and ensure type safety"
```

#### What ts-type-guardian Does

1. **Biome Validation**
   ```bash
   biome ci .
   biome check --write .  # On failure
   biome check --write --unsafe .  # If needed
   ```

2. **TypeScript Type Checking**
   ```bash
   tsc -p tsconfig.json --noEmit
   ```

3. **Import/Export Organization**
   - Organizes and formats imports
   - Ensures proper `import type` usage
   - Removes unused imports

4. **Unsafe Pattern Cleanup**
   - Replaces `any` with `unknown` or proper types
   - Removes non-null assertions (`!`)
   - Eliminates implicit types

5. **Code Quality Enforcement**
   - Removes unused code
   - Adds explicit type annotations
   - Ensures consistent coding patterns

#### TypeScript Configuration

Our project uses strict TypeScript settings:

```json
{
  "strict": true,
  "exactOptionalPropertyTypes": true,
  "noUncheckedIndexedAccess": true,
  "noImplicitOverride": true,
  "noImplicitAny": true,
  "noImplicitReturns": true,
  "noFallthroughCasesInSwitch": true,
  "noPropertyAccessFromIndexSignature": true,
  "useUnknownInCatchVariables": true,
  "forceConsistentCasingInFileNames": true
}
```

## 🧪 Testing Guidelines

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test -- src/tools/__tests__/stake.test.ts
```

### Test Structure

Our tests follow these patterns:

```typescript
// Mock external dependencies
vi.mock('@wagmi/core', () => ({
  writeContract: vi.fn(),
  getAccount: vi.fn(),
  // ... other mocks
}));

// Use proper TypeScript types
interface MockServer {
  registerTool: MockedFunction<McpServer['registerTool']>;
}

// Test successful scenarios
expect(mockCreateSuccessResponse).toHaveBeenCalledWith(
  'Expected success message'
);

// Test error scenarios  
expect(mockCreateErrorResponse).toHaveBeenCalledWith(
  'Expected error message'
);
```

### Mock Patterns

- **Success Responses**: Mock `createSuccessResponse` 
- **Error Responses**: Mock `createErrorResponse`
- **Wallet Connection**: Mock `checkWalletConnection`
- **Contract Calls**: Mock wagmi functions like `writeContract`, `readContract`

## 📝 Code Style Guidelines

### General Principles

1. **Simplicity First**: Start as simple as possible, avoid over-engineering
2. **No Unnecessary Modularization**: Keep code straightforward for new developers
3. **Conventional Tools**: Use modern CLI tools (see CLAUDE.md for tool preferences)

### Code Formatting

We use Biome for code formatting and linting:

```bash
# Check and fix formatting
npm run check

# Fix formatting only
npm run format
```

### Import/Export Patterns

```typescript
// Type-only imports
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

// Value imports
import { writeContract } from '@wagmi/core';

// Mixed imports (when needed)
import { type Address, parseAbi } from 'viem';
```

## 🔧 Build and Development

### Available Scripts

```bash
npm run build        # Build the project
npm run dev          # Development mode
npm run test         # Run tests
npm run check        # Lint and format check
npm run format       # Format code
npm run type-check   # TypeScript type checking
```

### Pre-commit Workflow

Before committing, ensure:

1. **Tests Pass**: `npm test`
2. **Code Quality**: `npm run check`
3. **Build Success**: `npm run build`
4. **Type Safety**: Use ts-type-guardian for review

## 🚨 Common Issues and Solutions

### Build Errors
- Use the `/build` command for automatic error fixing
- Check TypeScript configuration in `tsconfig.json`
- Ensure all dependencies are properly installed

### Test Failures
- Verify mock implementations match actual function signatures
- Check that response functions are correctly mocked
- Ensure proper TypeScript types in test files

### Type Errors
- Use ts-type-guardian for comprehensive type checking
- Avoid `any` types - use `unknown` and type guards instead
- Ensure proper `import type` usage for type-only imports

### Linting Issues
- Run `npm run check` to identify issues
- Use `biome check --write .` for automatic fixes
- Check that all imports are used and properly organized

## 📚 Best Practices

### Commit Messages

- Use conventional commit format: `type: description`
- Include appropriate emoji (handled by `/commit` command)
- Keep first line under 72 characters
- Use present tense, imperative mood

**Examples:**
```
✨ feat: add user authentication system
🐛 fix: resolve memory leak in rendering process
📝 docs: update API documentation with new endpoints
♻️ refactor: simplify error handling logic in parser
```

### Code Organization

```
src/
├── tools/           # MCP tools (business logic)
│   └── __tests__/   # Tool unit tests
├── utils/           # Common utilities
│   └── __tests__/   # Utility unit tests
├── constants/       # Project constants
└── abis/           # Smart contract ABIs
```

### Error Handling

```typescript
// Use createErrorResponse for user-facing errors
return createErrorResponse('Clear error message for users');

// Use createSuccessResponse for success cases
return createSuccessResponse('Operation completed successfully');

// Handle edge cases gracefully
if (!result) {
  return createErrorResponse('Required data not found');
}
```

## 🤝 Pull Request Process

1. **Fork the Repository**: Create your own fork
2. **Create Feature Branch**: `git checkout -b feature/your-feature-name`
3. **Make Changes**: Follow the development workflow
4. **Run Tests**: Ensure all tests pass
5. **Use `/commit`**: Create conventional commits
6. **Type Check**: Use ts-type-guardian for review
7. **Submit PR**: Create a pull request with clear description

### PR Guidelines

- **Clear Title**: Use conventional commit format
- **Detailed Description**: Explain what and why
- **Test Coverage**: Include tests for new features
- **Type Safety**: Ensure strict TypeScript compliance
- **Documentation**: Update docs if needed

## 📖 Additional Resources

- [Project Documentation](./docs/)
- [CLAUDE.md](./CLAUDE.md) - Development guidelines and tool preferences
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Biome Documentation](https://biomejs.dev/)
- [Conventional Commits](https://www.conventionalcommits.org/)

## 🆘 Getting Help

- **Issues**: Create a GitHub issue for bugs or feature requests
- **Discussions**: Use GitHub Discussions for questions
- **Code Review**: Use ts-type-guardian for automated code review
- **Build Issues**: Use the `/build` command for automatic fixing

## 🙏 Thank You

Thank you for contributing to the Tokamak Network Terminal! Your contributions help make the project better for everyone.