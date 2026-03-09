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

- `docs/agentcontract-HANDOFF.md`: Architecture and spec (primary reference)
- `docs/oss-dev-guidelines.md`: OSS conventions
- `src/core/types.ts`: All type definitions

## Commands

- `npm run build`: Compile TypeScript
- `npm run typecheck`: Type check without emitting
- `npm test`: Run tests (vitest)
- `npm run lint`: Run ESLint

## Tech stack

- TypeScript (ES2022, Node16 modules)
- vitest for testing
- ajv for JSON Schema validation
- js-yaml for YAML parsing
- @anthropic-ai/sdk for LLM calls (MVP)
