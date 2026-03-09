import { readFileSync } from "node:fs";
import type { Command } from "commander";
import type { RunResult } from "../core/types.js";

export function registerShow(program: Command): void {
  program
    .command("show <result>")
    .description("Display a saved RunResult JSON file")
    .option("--format <format>", "Output format (text or json)", "text")
    .action((resultPath: string, options: { format: string }) => {
      if (options.format !== "text" && options.format !== "json") {
        console.error(`Error: --format must be "text" or "json", got "${options.format}"`);
        process.exit(1);
      }
      let result: RunResult;
      try {
        const raw = readFileSync(resultPath, "utf-8");
        result = JSON.parse(raw) as RunResult;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`Error reading result file: ${msg}`);
        process.exit(1);
      }

      if (options.format === "json") {
        console.log(JSON.stringify(result, null, 2));
        return;
      }

      printResult(result);
    });
}

function printResult(result: RunResult): void {
  console.log(`Contract: ${result.contract} v${result.version}`);
  console.log(`Model: ${result.model.provider}/${result.model.id}`);
  console.log(`Run ID: ${result.run_id}`);
  console.log(`Started: ${result.started_at}`);
  console.log(`Finished: ${result.finished_at}`);
  console.log("");

  for (const scenario of result.scenarios) {
    const icon = scenario.passed ? "✓" : "✗";
    console.log(`  ${icon} ${scenario.name} (${scenario.duration_ms}ms)`);

    if (scenario.error) {
      console.log(`    Error: ${scenario.error}`);
      continue;
    }

    for (const assertion of scenario.assertions) {
      const aIcon = assertion.passed ? "✓" : "✗";
      console.log(`    ${aIcon} [${assertion.type}] ${assertion.message}`);
    }
  }

  console.log("");
  const status = result.passed ? "PASSED" : "FAILED";
  console.log(
    `${status} ${result.summary.passed}/${result.summary.total - result.summary.skipped} passed` +
    (result.summary.skipped > 0 ? ` (${result.summary.skipped} skipped)` : ""),
  );
}
