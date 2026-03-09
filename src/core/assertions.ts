import _Ajv from "ajv";
import type { ActionScope, AssertionResult, AssertionSpec, Contract } from "./types.js";

// Handle ESM/CJS interop for ajv
const Ajv = _Ajv.default ?? _Ajv;
const ajv = new Ajv();

/**
 * Validate all assertions in a contract before execution.
 * Throws on invalid regex patterns or missing scope for scope_compliant.
 */
export function validateContract(contract: Contract): void {
  for (const scenario of contract.scenarios) {
    if (scenario.skip) continue;
    for (const spec of scenario.assert) {
      if (spec.type === "contains_pattern" || spec.type === "not_contains_pattern") {
        try {
          new RegExp(spec.pattern);
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          throw new Error(
            `Contract validation error in scenario "${scenario.name}": invalid regex pattern "${spec.pattern}": ${msg}`
          );
        }
      }
      if (spec.type === "scope_compliant") {
        const resolvedScope = spec.scope ?? contract.scope;
        if (!resolvedScope) {
          throw new Error(
            `Contract validation error in scenario "${scenario.name}": scope_compliant assertion requires a scope, but neither assertion.scope nor contract.scope is defined`
          );
        }
      }
    }
  }
}

/**
 * Evaluate a single assertion against LLM output.
 * For scope_compliant, this step uses a mock (always passes).
 * Real LLM-based judgment is implemented in Step 3.
 */
export async function evaluateAssertion(
  output: string,
  spec: AssertionSpec,
  scope?: ActionScope,
): Promise<AssertionResult> {
  switch (spec.type) {
    case "contains_pattern":
      return evaluateContainsPattern(output, spec.pattern);
    case "not_contains_pattern":
      return evaluateNotContainsPattern(output, spec.pattern);
    case "json_schema":
      return evaluateJsonSchema(output, spec.schema);
    case "scope_compliant":
      return evaluateScopeCompliantMock(spec.scope ?? scope);
  }
}

function evaluateContainsPattern(output: string, pattern: string): AssertionResult {
  const regex = new RegExp(pattern);
  const matched = regex.test(output);
  return {
    type: "contains_pattern",
    passed: matched,
    message: matched
      ? `Pattern /${pattern}/ matched in output`
      : `Pattern /${pattern}/ not found in output`,
  };
}

function evaluateNotContainsPattern(output: string, pattern: string): AssertionResult {
  const regex = new RegExp(pattern);
  const matched = regex.test(output);
  return {
    type: "not_contains_pattern",
    passed: !matched,
    message: !matched
      ? `Pattern /${pattern}/ not found in output (as expected)`
      : `Pattern /${pattern}/ matched in output (should not)`,
  };
}

function evaluateJsonSchema(output: string, schema: Record<string, unknown>): AssertionResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(output);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      type: "json_schema",
      passed: false,
      message: `JSON parse failed: ${msg}`,
    };
  }

  const validate = ajv.compile(schema);
  const valid = validate(parsed);
  if (valid) {
    return {
      type: "json_schema",
      passed: true,
      message: "Output matches JSON schema",
    };
  }

  const errors = validate.errors?.map((e: { message?: string }) => e.message).join("; ") ?? "unknown error";
  return {
    type: "json_schema",
    passed: false,
    message: `Schema validation failed: ${errors}`,
  };
}

// Mock implementation for scope_compliant — always passes.
// Will be replaced with LLM-as-judge in Step 3.
function evaluateScopeCompliantMock(_scope?: ActionScope): AssertionResult {
  return {
    type: "scope_compliant",
    passed: true,
    message: "Scope compliance check passed (mock — LLM judge not yet implemented)",
  };
}
