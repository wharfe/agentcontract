# CLAUDE.md

## About this repository

agentcontract is an executable spec tool for AI agent behavior contracts.
Single-package TypeScript project (not a monorepo).

## Architecture

```
CLI Layer → Contract Runner → Assertion Engine → Provider Adapter Layer
```

Core concepts: Contract, Scenario, AssertionResult, RunResult.

## Implementation rules

- Type-only files must not contain implementation logic
- Do not add fields not in the spec
- JudgeModelConfig does NOT have a system field — never reuse ModelConfig.system for the judge
- ScopeComplianceJudgment is internal — do not export from the library
- Invalid regex in assertions must be caught as contract validation errors (before run starts)
- When unclear, stop and ask rather than guessing
- Commits use Conventional Commits format

## Key files

- `docs/agentcontract-HANDOFF.md`: Architecture and spec (primary reference, gitignored)
- `docs/oss-dev-guidelines.md`: OSS conventions (gitignored)
- `src/core/types.ts`: All type definitions
- `src/core/assertions.ts`: Assertion engine + contract validation
- `src/core/runner.ts`: Contract/scenario runner
- `src/adapters/anthropic.ts`: Anthropic LLM adapter
- `src/cli/`: CLI commands (init, run, show)

## Commands

- `npm run build`: Compile TypeScript (excludes test files)
- `npm run typecheck`: Type check all files including tests
- `npm test`: Run tests (vitest, 42 tests)
- `npm run lint`: Run ESLint

## Build configuration

- `tsconfig.json`: Build config (excludes `*.test.ts`)
- `tsconfig.check.json`: Type check config (includes all files)
- Test files are excluded from npm package via tsconfig exclude

## Tech stack

- TypeScript (ES2022, Node16 modules)
- vitest for testing
- ajv for JSON Schema validation
- js-yaml for YAML parsing
- commander for CLI
- @anthropic-ai/sdk for LLM calls (MVP)
- ESLint + typescript-eslint for linting
- publint for package structure validation
