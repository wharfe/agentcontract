import { randomUUID } from "node:crypto";
import type {
  Contract,
  LLMAdapter,
  RunResult,
  ScenarioResult,
  Scenario,
  ModelConfig,
  ActionScope,
  JudgeModelConfig,
} from "./types.js";
import { evaluateAssertion, validateContract, type ScopeJudgeContext } from "./assertions.js";

/**
 * Run all scenarios in a contract and return the aggregated result.
 * Scenarios are executed sequentially (no parallel execution in MVP).
 */
export async function runContract(
  contract: Contract,
  adapter: LLMAdapter,
): Promise<RunResult> {
  validateContract(contract);

  const startedAt = new Date().toISOString();
  const scenarioResults: ScenarioResult[] = [];
  let skippedCount = 0;

  for (const scenario of contract.scenarios) {
    if (scenario.skip) {
      skippedCount++;
      continue;
    }

    const result = await runScenario(
      scenario,
      contract.model,
      adapter,
      contract.scope,
      contract.judge_model,
    );
    scenarioResults.push(result);
  }

  const finishedAt = new Date().toISOString();
  const passedCount = scenarioResults.filter((r) => r.passed).length;
  const failedCount = scenarioResults.filter((r) => !r.passed).length;

  return {
    contract: contract.contract,
    version: contract.version,
    model: contract.model,
    scope: contract.scope,
    run_id: randomUUID(),
    started_at: startedAt,
    finished_at: finishedAt,
    passed: failedCount === 0,
    summary: {
      total: contract.scenarios.length,
      passed: passedCount,
      failed: failedCount,
      skipped: skippedCount,
    },
    scenarios: scenarioResults,
  };
}

/**
 * Run a single scenario: call LLM, then evaluate all assertions.
 */
export async function runScenario(
  scenario: Scenario,
  model: ModelConfig,
  adapter: LLMAdapter,
  contractScope?: ActionScope,
  judgeModel?: JudgeModelConfig,
): Promise<ScenarioResult> {
  const start = performance.now();

  let output: string;
  try {
    const result = await adapter.complete({
      model: model.id,
      system: model.system,
      input: scenario.input,
      temperature: model.temperature ?? 0,
      max_tokens: model.max_tokens ?? 1024,
    });
    output = result.output;
  } catch (e) {
    const duration = performance.now() - start;
    const msg = e instanceof Error ? e.message : String(e);
    return {
      name: scenario.name,
      passed: false,
      output: "",
      assertions: [],
      duration_ms: Math.round(duration),
      error: msg,
    };
  }

  // Build judge context for scope_compliant assertions
  const resolvedJudge = judgeModel ?? model;
  const judgeContext: ScopeJudgeContext = {
    adapter,
    judgeModel: resolvedJudge.id,
    judgeProvider: resolvedJudge.provider,
    temperature: resolvedJudge.temperature ?? 0,
    maxTokens: ("max_tokens" in resolvedJudge ? resolvedJudge.max_tokens : undefined) ?? 512,
    input: scenario.input,
  };

  const assertions = [];
  for (const spec of scenario.assert) {
    const result = await evaluateAssertion(output, spec, contractScope, judgeContext);
    assertions.push(result);
  }

  const duration = performance.now() - start;
  const allPassed = assertions.every((a) => a.passed);

  return {
    name: scenario.name,
    passed: allPassed,
    output,
    assertions,
    duration_ms: Math.round(duration),
  };
}
