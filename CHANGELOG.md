# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added
- Core type definitions (`Contract`, `Scenario`, `AssertionResult`, `RunResult`, etc.)
- Assertion engine: `contains_pattern`, `not_contains_pattern`, `json_schema`, `scope_compliant`
- Contract shape validation (`validateContractShape`) for early error detection
- Anthropic LLM adapter (`AnthropicAdapter`)
- Contract runner (`runContract`, `runScenario`) with sequential scenario execution
- `scope_compliant` LLM-as-judge with internal fixed system prompt
- CLI commands: `init`, `run`, `show`
- GitHub Actions CI workflow (tsc + eslint + vitest + publint, Node 18/20/22)
- `docs/llms.txt` for agent discoverability
- ESLint with typescript-eslint configuration
