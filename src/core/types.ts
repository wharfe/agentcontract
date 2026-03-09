// All timestamps use ISO 8601 strings (RFC 3339)
export type IsoDatetime = string;

// Root type for the YAML contract file
export interface Contract {
  contract: string;
  version: string;
  model: ModelConfig;
  judge_model?: JudgeModelConfig;
  scope?: ActionScope;
  scenarios: Scenario[];
}

// LLM model configuration (used for scenario execution)
export interface ModelConfig {
  provider: "anthropic";
  id: string;
  system: string;
  temperature?: number;
  max_tokens?: number;
}

// Model configuration for scope_compliant judgment only.
// Does NOT have a system field — the judge uses an internal fixed prompt.
export interface JudgeModelConfig {
  provider: "anthropic";
  id: string;
  temperature?: number;
  max_tokens?: number;
}

// Minimal common form aligned with agentbond's ActionScope.
// Works as a standalone scope declaration even without agentbond.
export interface ActionScope {
  domain: string;
  operations: string[];
  resources?: string[];
}

// Individual scenario within a contract
export interface Scenario {
  name: string;
  input: string;
  assert: AssertionSpec[];
  skip?: boolean;
}

// Assertion declaration (YAML representation)
export type AssertionSpec =
  | { type: "contains_pattern"; pattern: string }
  | { type: "not_contains_pattern"; pattern: string }
  | { type: "scope_compliant"; scope?: ActionScope }
  | { type: "json_schema"; schema: Record<string, unknown> };

// Evaluation result for a single assertion
export interface AssertionResult {
  type: AssertionSpec["type"];
  passed: boolean;
  message: string;
}

// Execution result for a single scenario
export interface ScenarioResult {
  name: string;
  passed: boolean;
  output: string;
  assertions: AssertionResult[];
  duration_ms: number;
  error?: string;
}

// Overall execution result for a contract file
export interface RunResult {
  contract: string;
  version: string;
  model: ModelConfig;
  scope?: ActionScope;
  run_id: string;
  started_at: IsoDatetime;
  finished_at: IsoDatetime;
  passed: boolean;
  summary: RunSummary;
  scenarios: ScenarioResult[];
}

export interface RunSummary {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
}

// LLM adapter interface
export interface LLMAdapter {
  provider: string;
  complete(params: CompleteParams): Promise<CompleteResult>;
}

export interface CompleteParams {
  model: string;
  system: string;
  input: string;
  temperature: number;
  max_tokens: number;
}

export interface CompleteResult {
  output: string;
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
}

// Internal type for scope_compliant assertion LLM judgment.
// NOT exported from the library.
interface ScopeComplianceJudgment {
  compliant: boolean;
  reason: string;
}

// Prevent unused variable error while keeping the type internal
type _ScopeComplianceJudgment = ScopeComplianceJudgment;
