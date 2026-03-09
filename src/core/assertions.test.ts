import { describe, it, expect } from "vitest";
import { evaluateAssertion, validateContract } from "./assertions.js";
import type { Contract, AssertionSpec, ActionScope } from "./types.js";

// Helper to build a minimal contract for validation tests
function makeContract(
  scenarios: Contract["scenarios"],
  scope?: ActionScope,
): Contract {
  return {
    contract: "test-agent",
    version: "0.1",
    model: {
      provider: "anthropic",
      id: "claude-sonnet-4-20250514",
      system: "You are a test assistant.",
    },
    scope,
    scenarios,
  };
}

// --- contains_pattern ---

describe("contains_pattern", () => {
  it("passes when pattern matches output", async () => {
    const result = await evaluateAssertion(
      "Visit https://example.com for details",
      { type: "contains_pattern", pattern: "https?://" },
    );
    expect(result.passed).toBe(true);
    expect(result.type).toBe("contains_pattern");
    expect(result.message).toContain("matched");
  });

  it("fails when pattern does not match output", async () => {
    const result = await evaluateAssertion(
      "No links here",
      { type: "contains_pattern", pattern: "https?://" },
    );
    expect(result.passed).toBe(false);
    expect(result.message).toContain("not found");
  });

  it("supports numbered list pattern", async () => {
    const result = await evaluateAssertion(
      "1. First item\n2. Second item",
      { type: "contains_pattern", pattern: "\\d+\\." },
    );
    expect(result.passed).toBe(true);
  });
});

// --- not_contains_pattern ---

describe("not_contains_pattern", () => {
  it("passes when pattern does not match output", async () => {
    const result = await evaluateAssertion(
      "I cannot provide personal information",
      { type: "not_contains_pattern", pattern: "[\\w.+-]+@[\\w-]+\\.[\\w.]+" },
    );
    expect(result.passed).toBe(true);
    expect(result.message).toContain("as expected");
  });

  it("fails when pattern matches output", async () => {
    const result = await evaluateAssertion(
      "Contact user@example.com",
      { type: "not_contains_pattern", pattern: "[\\w.+-]+@[\\w-]+\\.[\\w.]+" },
    );
    expect(result.passed).toBe(false);
    expect(result.message).toContain("should not");
  });
});

// --- json_schema ---

describe("json_schema", () => {
  const schema: AssertionSpec & { type: "json_schema" } = {
    type: "json_schema",
    schema: {
      type: "object",
      required: ["title", "url"],
      properties: {
        title: { type: "string" },
        url: { type: "string" },
      },
    },
  };

  it("passes when output is valid JSON matching schema", async () => {
    const output = JSON.stringify({ title: "Paper", url: "https://arxiv.org/1234" });
    const result = await evaluateAssertion(output, schema);
    expect(result.passed).toBe(true);
    expect(result.message).toBe("Output matches JSON schema");
  });

  it("fails when output is not valid JSON", async () => {
    const result = await evaluateAssertion("not json at all", schema);
    expect(result.passed).toBe(false);
    expect(result.message).toContain("JSON parse failed");
  });

  it("fails when JSON does not match schema (missing required field)", async () => {
    const output = JSON.stringify({ title: "Paper" });
    const result = await evaluateAssertion(output, schema);
    expect(result.passed).toBe(false);
    expect(result.message).toContain("Schema validation failed");
  });

  it("fails when JSON has wrong type", async () => {
    const output = JSON.stringify({ title: 123, url: "https://example.com" });
    const result = await evaluateAssertion(output, schema);
    expect(result.passed).toBe(false);
    expect(result.message).toContain("Schema validation failed");
  });

  it("fails when output has code fence wrapping", async () => {
    const output = '```json\n{"title":"Paper","url":"https://example.com"}\n```';
    const result = await evaluateAssertion(output, schema);
    expect(result.passed).toBe(false);
    expect(result.message).toContain("JSON parse failed");
  });
});

// --- scope_compliant ---

describe("scope_compliant", () => {
  const scope: ActionScope = {
    domain: "api.example.com",
    operations: ["read"],
  };

  it("fails without judge context", async () => {
    const result = await evaluateAssertion(
      "I will read the data",
      { type: "scope_compliant" },
      scope,
    );
    expect(result.passed).toBe(false);
    expect(result.type).toBe("scope_compliant");
    expect(result.message).toContain("No judge context");
  });

  it("fails without scope", async () => {
    const result = await evaluateAssertion(
      "I will read the data",
      { type: "scope_compliant" },
    );
    expect(result.passed).toBe(false);
    expect(result.message).toContain("No scope defined");
  });
});

// --- validateContract ---

describe("validateContract", () => {
  it("passes with valid contract", () => {
    const contract = makeContract([
      {
        name: "test",
        input: "hello",
        assert: [{ type: "contains_pattern", pattern: "hello" }],
      },
    ]);
    expect(() => validateContract(contract)).not.toThrow();
  });

  it("throws on invalid regex in contains_pattern", () => {
    const contract = makeContract([
      {
        name: "bad regex",
        input: "hello",
        assert: [{ type: "contains_pattern", pattern: "[invalid(" }],
      },
    ]);
    expect(() => validateContract(contract)).toThrow("Contract validation error");
    expect(() => validateContract(contract)).toThrow("invalid regex pattern");
  });

  it("throws on invalid regex in not_contains_pattern", () => {
    const contract = makeContract([
      {
        name: "bad regex",
        input: "hello",
        assert: [{ type: "not_contains_pattern", pattern: "(?<" }],
      },
    ]);
    expect(() => validateContract(contract)).toThrow("Contract validation error");
  });

  it("throws when scope_compliant has no scope available", () => {
    const contract = makeContract([
      {
        name: "no scope",
        input: "hello",
        assert: [{ type: "scope_compliant" }],
      },
    ]);
    expect(() => validateContract(contract)).toThrow("scope_compliant assertion requires a scope");
  });

  it("passes when scope_compliant uses contract-level scope", () => {
    const contract = makeContract(
      [
        {
          name: "with contract scope",
          input: "hello",
          assert: [{ type: "scope_compliant" }],
        },
      ],
      { domain: "api.example.com", operations: ["read"] },
    );
    expect(() => validateContract(contract)).not.toThrow();
  });

  it("passes when scope_compliant uses assertion-level scope", () => {
    const contract = makeContract([
      {
        name: "with inline scope",
        input: "hello",
        assert: [
          {
            type: "scope_compliant",
            scope: { domain: "api.example.com", operations: ["read"] },
          },
        ],
      },
    ]);
    expect(() => validateContract(contract)).not.toThrow();
  });

  it("skips validation for skipped scenarios", () => {
    const contract = makeContract([
      {
        name: "skipped bad regex",
        input: "hello",
        assert: [{ type: "contains_pattern", pattern: "[invalid(" }],
        skip: true,
      },
    ]);
    expect(() => validateContract(contract)).not.toThrow();
  });
});
