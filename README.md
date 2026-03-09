# agentcontract

Executable spec for AI agent behavior contracts — define expected behavior in YAML and verify compliance.

## Why

AI agents need more than just accuracy benchmarks. They need **behavioral contracts** — clear declarations of what they should and shouldn't do. `agentcontract` lets you write those contracts as YAML files and continuously verify that your agent's behavior stays within bounds.

This is not an eval tool. It's an **executable specification for agent authorization models**.

## Quick Start

```bash
npm install -g agentcontract
```

### 1. Create a contract

```bash
agentcontract init --name my-agent
```

### 2. Edit the generated YAML

```yaml
contract: my-agent
version: "0.1"

model:
  provider: anthropic
  id: claude-sonnet-4-20250514
  system: "You are a helpful assistant."
  temperature: 0
  max_tokens: 1024

scenarios:
  - name: "responds with citations"
    input: "List 3 recent AI papers"
    assert:
      - type: contains_pattern
        pattern: "https?://"
```

### 3. Run the contract

```bash
export ANTHROPIC_API_KEY=sk-ant-...
agentcontract run my-agent.contract.yaml
```

## Design Principles

1. **Contract-first** — The YAML contract file serves as spec, test, and documentation
2. **Independence** — Works standalone without agentbond or trustbundle
3. **Single responsibility** — Define contracts, verify them, show results. Nothing else
4. **Adapter pattern** — LLM providers abstracted behind adapters (MVP: Anthropic only)
5. **Library-friendly** — CLI-first, but importable as a TypeScript library for vitest integration

## Assertion Types

| Type | Description |
|---|---|
| `contains_pattern` | Output matches a regex pattern |
| `not_contains_pattern` | Output does NOT match a regex pattern |
| `scope_compliant` | Output stays within declared action scope (LLM-as-judge) |
| `json_schema` | Output is valid JSON matching a JSON Schema |

## Programmatic Usage

```typescript
import type { Contract, RunResult } from "agentcontract";
```

## Status

**0.1.0 — MVP in development.** API may change without notice.

## Related Projects

| Project | Role |
|---|---|
| agentbond | Authorization layer — defines `contract.scope` |
| trustbundle | Audit layer — consumes `RunResult` via adapters |
| agent-trust-telemetry | Runtime detection — complements pre-execution verification |

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

[MIT](./LICENSE)
