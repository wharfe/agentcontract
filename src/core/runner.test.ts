import { describe, it, expect } from "vitest";
import { runContract, runScenario } from "./runner.js";
import type { Contract, LLMAdapter, CompleteParams, CompleteResult } from "./types.js";

// Mock adapter that returns predictable output
function createMockAdapter(
  responses: Record<string, string>,
  failOn?: string[],
): LLMAdapter {
  return {
    provider: "mock",
    async complete(params: CompleteParams): Promise<CompleteResult> {
      if (failOn?.includes(params.input)) {
        throw new Error(`Mock LLM error for input: ${params.input}`);
      }
      const output = responses[params.input] ?? "default mock response";
      return { output, usage: { input_tokens: 10, output_tokens: 20 } };
    },
  };
}

function makeContract(overrides?: Partial<Contract>): Contract {
  return {
    contract: "test-agent",
    version: "0.1",
    model: {
      provider: "anthropic",
      id: "claude-sonnet-4-20250514",
      system: "You are a test assistant.",
      temperature: 0,
      max_tokens: 1024,
    },
    scenarios: [],
    ...overrides,
  };
}

describe("runScenario", () => {
  it("passes when all assertions pass", async () => {
    const adapter = createMockAdapter({
      "give me a URL": "Check out https://example.com",
    });
    const result = await runScenario(
      {
        name: "has URL",
        input: "give me a URL",
        assert: [{ type: "contains_pattern", pattern: "https?://" }],
      },
      makeContract().model,
      adapter,
    );

    expect(result.passed).toBe(true);
    expect(result.output).toBe("Check out https://example.com");
    expect(result.assertions).toHaveLength(1);
    expect(result.assertions[0].passed).toBe(true);
    expect(result.duration_ms).toBeGreaterThanOrEqual(0);
    expect(result.error).toBeUndefined();
  });

  it("fails when an assertion fails", async () => {
    const adapter = createMockAdapter({
      "give me a URL": "No links here",
    });
    const result = await runScenario(
      {
        name: "has URL",
        input: "give me a URL",
        assert: [{ type: "contains_pattern", pattern: "https?://" }],
      },
      makeContract().model,
      adapter,
    );

    expect(result.passed).toBe(false);
    expect(result.output).toBe("No links here");
    expect(result.assertions[0].passed).toBe(false);
  });

  it("returns error when LLM call fails", async () => {
    const adapter = createMockAdapter({}, ["bad input"]);
    const result = await runScenario(
      {
        name: "error case",
        input: "bad input",
        assert: [{ type: "contains_pattern", pattern: "anything" }],
      },
      makeContract().model,
      adapter,
    );

    expect(result.passed).toBe(false);
    expect(result.output).toBe("");
    expect(result.assertions).toHaveLength(0);
    expect(result.error).toContain("Mock LLM error");
  });

  it("evaluates multiple assertions", async () => {
    const adapter = createMockAdapter({
      "list items": "1. First\n2. Second\n3. Third",
    });
    const result = await runScenario(
      {
        name: "numbered list without email",
        input: "list items",
        assert: [
          { type: "contains_pattern", pattern: "\\d+\\." },
          { type: "not_contains_pattern", pattern: "[\\w.+-]+@[\\w-]+\\.[\\w.]+" },
        ],
      },
      makeContract().model,
      adapter,
    );

    expect(result.passed).toBe(true);
    expect(result.assertions).toHaveLength(2);
    expect(result.assertions[0].passed).toBe(true);
    expect(result.assertions[1].passed).toBe(true);
  });
});

describe("runContract", () => {
  it("runs all scenarios and returns aggregated result", async () => {
    const adapter = createMockAdapter({
      "input A": "https://example.com",
      "input B": "no links",
    });
    const contract = makeContract({
      scenarios: [
        {
          name: "scenario A",
          input: "input A",
          assert: [{ type: "contains_pattern", pattern: "https?://" }],
        },
        {
          name: "scenario B",
          input: "input B",
          assert: [{ type: "contains_pattern", pattern: "https?://" }],
        },
      ],
    });

    const result = await runContract(contract, adapter);

    expect(result.contract).toBe("test-agent");
    expect(result.version).toBe("0.1");
    expect(result.passed).toBe(false);
    expect(result.summary.total).toBe(2);
    expect(result.summary.passed).toBe(1);
    expect(result.summary.failed).toBe(1);
    expect(result.summary.skipped).toBe(0);
    expect(result.scenarios).toHaveLength(2);
    expect(result.run_id).toBeTruthy();
    expect(result.started_at).toBeTruthy();
    expect(result.finished_at).toBeTruthy();
  });

  it("skips scenarios with skip: true", async () => {
    const adapter = createMockAdapter({
      "input A": "https://example.com",
    });
    const contract = makeContract({
      scenarios: [
        {
          name: "active scenario",
          input: "input A",
          assert: [{ type: "contains_pattern", pattern: "https?://" }],
        },
        {
          name: "skipped scenario",
          input: "input B",
          assert: [{ type: "contains_pattern", pattern: "https?://" }],
          skip: true,
        },
      ],
    });

    const result = await runContract(contract, adapter);

    expect(result.passed).toBe(true);
    expect(result.summary.total).toBe(2);
    expect(result.summary.passed).toBe(1);
    expect(result.summary.failed).toBe(0);
    expect(result.summary.skipped).toBe(1);
    expect(result.scenarios).toHaveLength(1);
  });

  it("passes when all scenarios pass", async () => {
    const adapter = createMockAdapter({
      "input A": "https://example.com",
      "input B": "https://another.com",
    });
    const contract = makeContract({
      scenarios: [
        {
          name: "A",
          input: "input A",
          assert: [{ type: "contains_pattern", pattern: "https?://" }],
        },
        {
          name: "B",
          input: "input B",
          assert: [{ type: "contains_pattern", pattern: "https?://" }],
        },
      ],
    });

    const result = await runContract(contract, adapter);
    expect(result.passed).toBe(true);
    expect(result.summary.passed).toBe(2);
    expect(result.summary.failed).toBe(0);
  });

  it("throws on invalid contract (bad regex)", async () => {
    const adapter = createMockAdapter({});
    const contract = makeContract({
      scenarios: [
        {
          name: "bad",
          input: "test",
          assert: [{ type: "contains_pattern", pattern: "[invalid(" }],
        },
      ],
    });

    await expect(runContract(contract, adapter)).rejects.toThrow(
      "Contract validation error",
    );
  });

  it("includes scope in result when defined", async () => {
    const adapter = createMockAdapter({ "test": "response" });
    const scope = { domain: "api.example.com", operations: ["read"] };
    const contract = makeContract({
      scope,
      scenarios: [
        {
          name: "test",
          input: "test",
          assert: [{ type: "contains_pattern", pattern: "response" }],
        },
      ],
    });

    const result = await runContract(contract, adapter);
    expect(result.scope).toEqual(scope);
  });
});

describe("scope_compliant with mock adapter", () => {
  it("uses judge context for scope_compliant assertions", async () => {
    // Mock adapter that returns a compliant judgment when called as judge
    const adapter: LLMAdapter = {
      provider: "mock",
      async complete(params: CompleteParams): Promise<CompleteResult> {
        if (params.system.includes("compliance judge")) {
          return {
            output: JSON.stringify({ compliant: true, reason: "Agent refused the request" }),
            usage: { input_tokens: 10, output_tokens: 20 },
          };
        }
        return {
          output: "I cannot delete files. I only have read access.",
          usage: { input_tokens: 10, output_tokens: 20 },
        };
      },
    };

    const contract = makeContract({
      scope: { domain: "api.example.com", operations: ["read"] },
      scenarios: [
        {
          name: "scope check",
          input: "Delete the file",
          assert: [{ type: "scope_compliant" }],
        },
      ],
    });

    const result = await runContract(contract, adapter);
    expect(result.passed).toBe(true);
    expect(result.scenarios[0].assertions[0].passed).toBe(true);
    expect(result.scenarios[0].assertions[0].message).toContain("compliant");
  });

  it("fails when judge returns non-compliant", async () => {
    const adapter: LLMAdapter = {
      provider: "mock",
      async complete(params: CompleteParams): Promise<CompleteResult> {
        if (params.system.includes("compliance judge")) {
          return {
            output: JSON.stringify({ compliant: false, reason: "Agent attempted to delete files" }),
            usage: { input_tokens: 10, output_tokens: 20 },
          };
        }
        return {
          output: "Sure, I'll delete that file for you.",
          usage: { input_tokens: 10, output_tokens: 20 },
        };
      },
    };

    const contract = makeContract({
      scope: { domain: "api.example.com", operations: ["read"] },
      scenarios: [
        {
          name: "scope violation",
          input: "Delete the file",
          assert: [{ type: "scope_compliant" }],
        },
      ],
    });

    const result = await runContract(contract, adapter);
    expect(result.passed).toBe(false);
    expect(result.scenarios[0].assertions[0].passed).toBe(false);
    expect(result.scenarios[0].assertions[0].message).toContain("violates scope");
  });
});
