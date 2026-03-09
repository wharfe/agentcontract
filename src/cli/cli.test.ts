import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { execFileSync } from "node:child_process";
import { writeFileSync, readFileSync, unlinkSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const CLI = join(import.meta.dirname, "../../dist/cli/index.js");
const TMP = join(tmpdir(), "agentcontract-test");

function run(args: string[]): { stdout: string; exitCode: number } {
  try {
    const stdout = execFileSync("node", [CLI, ...args], {
      encoding: "utf-8",
      timeout: 10_000,
    });
    return { stdout, exitCode: 0 };
  } catch (e: unknown) {
    const err = e as { stdout?: string; stderr?: string; status?: number };
    return {
      stdout: (err.stdout ?? "") + (err.stderr ?? ""),
      exitCode: err.status ?? 1,
    };
  }
}

beforeEach(() => {
  if (!existsSync(TMP)) mkdirSync(TMP, { recursive: true });
});

afterEach(() => {
  // Clean up test files
  for (const f of ["init-test.contract.yaml", "malformed.yaml", "sample-result.json"]) {
    const p = join(TMP, f);
    if (existsSync(p)) unlinkSync(p);
  }
});

// --- init ---

describe("agentcontract init", () => {
  it("creates a contract file with default name", () => {
    const out = join(TMP, "init-test.contract.yaml");
    const { stdout, exitCode } = run(["init", "--name", "init-test", "--out", out]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("Created");
    const content = readFileSync(out, "utf-8");
    expect(content).toContain("contract: init-test");
    expect(content).toContain("scenarios:");
  });
});

// --- run with malformed YAML ---

describe("agentcontract run", () => {
  it("exits 1 with descriptive error on malformed contract (scenarios not array)", () => {
    const yamlPath = join(TMP, "malformed.yaml");
    writeFileSync(yamlPath, `contract: bad\nversion: "0.1"\nmodel:\n  provider: anthropic\n  id: test\n  system: test\nscenarios: not-an-array\n`);
    const { stdout, exitCode } = run(["run", yamlPath]);
    expect(exitCode).toBe(1);
    expect(stdout).toContain("Contract validation error");
    expect(stdout).toContain("scenarios");
  });

  it("exits 1 with descriptive error when contract field is missing", () => {
    const yamlPath = join(TMP, "malformed.yaml");
    writeFileSync(yamlPath, `version: "0.1"\nmodel:\n  provider: anthropic\n  id: test\n  system: test\nscenarios: []\n`);
    const { stdout, exitCode } = run(["run", yamlPath]);
    expect(exitCode).toBe(1);
    expect(stdout).toContain("Contract validation error");
    expect(stdout).toContain("contract");
  });

  it("exits 1 when contract file does not exist", () => {
    const { exitCode } = run(["run", "/nonexistent/path.yaml"]);
    expect(exitCode).toBe(1);
  });
});

// --- show ---

describe("agentcontract show", () => {
  const sampleResult = {
    contract: "test",
    version: "0.1",
    model: { provider: "anthropic", id: "test-model", system: "test" },
    run_id: "00000000-0000-0000-0000-000000000000",
    started_at: "2026-01-01T00:00:00.000Z",
    finished_at: "2026-01-01T00:00:01.000Z",
    passed: true,
    summary: { total: 1, passed: 1, failed: 0, skipped: 0 },
    scenarios: [
      {
        name: "test scenario",
        passed: true,
        output: "hello",
        assertions: [{ type: "contains_pattern", passed: true, message: "matched" }],
        duration_ms: 100,
      },
    ],
  };

  it("displays result in text format", () => {
    const resultPath = join(TMP, "sample-result.json");
    writeFileSync(resultPath, JSON.stringify(sampleResult));
    const { stdout, exitCode } = run(["show", resultPath]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("Contract: test");
    expect(stdout).toContain("PASSED");
  });

  it("displays result in JSON format", () => {
    const resultPath = join(TMP, "sample-result.json");
    writeFileSync(resultPath, JSON.stringify(sampleResult));
    const { stdout, exitCode } = run(["show", resultPath, "--format", "json"]);
    expect(exitCode).toBe(0);
    const parsed = JSON.parse(stdout);
    expect(parsed.contract).toBe("test");
  });

  it("exits 1 on invalid --format value", () => {
    const resultPath = join(TMP, "sample-result.json");
    writeFileSync(resultPath, JSON.stringify(sampleResult));
    const { stdout, exitCode } = run(["show", resultPath, "--format", "yaml"]);
    expect(exitCode).toBe(1);
    expect(stdout).toContain("--format");
  });

  it("exits 1 when result file does not exist", () => {
    const { exitCode } = run(["show", "/nonexistent/result.json"]);
    expect(exitCode).toBe(1);
  });
});

// --- validateContractShape unit tests ---

describe("validateContractShape", async () => {
  const { validateContractShape } = await import("../core/assertions.js");

  it("throws on null", () => {
    expect(() => validateContractShape(null)).toThrow("must be a YAML mapping");
  });

  it("throws on string", () => {
    expect(() => validateContractShape("hello")).toThrow("must be a YAML mapping");
  });

  it("throws when model is missing", () => {
    expect(() => validateContractShape({ contract: "a", version: "1", scenarios: [] })).toThrow("model");
  });

  it("passes with valid minimal contract", () => {
    expect(() =>
      validateContractShape({
        contract: "a",
        version: "1",
        model: { provider: "anthropic", id: "test", system: "s" },
        scenarios: [],
      }),
    ).not.toThrow();
  });
});
