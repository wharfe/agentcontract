import { readFileSync, writeFileSync } from "node:fs";
import yaml from "js-yaml";
import type { Command } from "commander";
import type { Contract, RunResult } from "../core/types.js";
import { runContract } from "../core/runner.js";
import { AnthropicAdapter } from "../adapters/anthropic.js";

export function registerRun(program: Command): void {
  program
    .command("run <contract>")
    .description("Run a contract YAML file and verify all scenarios")
    .option("--output-file <path>", "Save RunResult as JSON")
    .option("--quiet", "Show summary only")
    .action(async (contractPath: string, options: { outputFile?: string; quiet?: boolean }) => {
      let contract: Contract;
      try {
        const raw = readFileSync(contractPath, "utf-8");
        contract = yaml.load(raw) as Contract;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`Error reading contract file: ${msg}`);
        process.exit(1);
      }

      const adapter = new AnthropicAdapter();
      let result: RunResult;
      try {
        result = await runContract(contract, adapter);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`Error: ${msg}`);
        process.exit(1);
      }

      if (options.outputFile) {
        writeFileSync(options.outputFile, JSON.stringify(result, null, 2), "utf-8");
        console.log(`Result saved to ${options.outputFile}`);
      }

      printResult(result, options.quiet ?? false);

      if (!result.passed) {
        process.exit(1);
      }
    });
}

function printResult(result: RunResult, quiet: boolean): void {
  if (quiet) {
    const status = result.passed ? "PASSED" : "FAILED";
    console.log(
      `${status} ${result.summary.passed}/${result.summary.total - result.summary.skipped} passed` +
      (result.summary.skipped > 0 ? ` (${result.summary.skipped} skipped)` : ""),
    );
    return;
  }

  console.log(`\nContract: ${result.contract} v${result.version}`);
  console.log(`Model: ${result.model.provider}/${result.model.id}`);
  console.log(`Run ID: ${result.run_id}`);
  console.log("");

  for (const scenario of result.scenarios) {
    const icon = scenario.passed ? "✓" : "✗";
    console.log(`  ${icon} ${scenario.name} (${scenario.duration_ms}ms)`);

    if (scenario.error) {
      console.log(`    Error: ${scenario.error}`);
      continue;
    }

    for (const assertion of scenario.assertions) {
      if (!assertion.passed) {
        console.log(`    FAIL: ${assertion.message}`);
      }
    }
  }

  console.log("");
  const status = result.passed ? "PASSED" : "FAILED";
  console.log(
    `${status} ${result.summary.passed}/${result.summary.total - result.summary.skipped} passed` +
    (result.summary.skipped > 0 ? ` (${result.summary.skipped} skipped)` : ""),
  );
}
