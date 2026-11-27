import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_SCENARIOS = [
  "s1-cold-empty",
  "s2-idle-visible",
  "s2-idle-visible-100",
  "s3-scaled-small",
  "s14-agents-20",
  "s15-stream-5",
  "s14-agents-100",
];
const RAM_LIMIT_PERCENT = 15;
const BUILD_DIRECTORY_NAMES = [".codebot-build", ".openbot-build"];

interface Options {
  baseline: string;
  out: string;
  scenarios: string[];
  runs: number;
  label: string;
  rebaseline: boolean;
  summaryOnly: boolean;
  only: "both" | "baseline" | "codebot";
}

interface RunSeries {
  [metric: string]: { peak?: number; mean?: number } | undefined;
}

interface Report {
  scenarios: { scenario: string; runs: { series: RunSeries; settled: Record<string, number | undefined> }[] }[];
}

function log(text: string): void {
  process.stdout.write(`${text}\n`);
}

function usage(): never {
  process.stderr.write(
    [
      "Usage: bun run bench:compare -- --baseline=<dir of the upstream baseline tree> [options]",
      "  --baseline=<dir>     baseline tree with its own build (or set CODEBOT_BENCH_BASELINE)",
      "  --out=<dir>          where reports and summary.md go (default _measure next to the worktree folders, else .codebot-build/bench-compare)",
      `  --scenarios=a,b,c    default: ${DEFAULT_SCENARIOS.join(",")}`,
      "  --runs=<n>           runs for each scenario (default 3)",
      "  --label=<name>       label prefix for the CodeBot reports (default codebot)",
      "  --rebaseline         measure the baseline again even when its report is in <out>/baseline",
      "  --only=baseline|codebot",
      "  --summary-only       measure nothing; write summary.md from the reports already in <out>",
      "Start it from a shell where the profile is redirected (cb_sandbox <name> in Git Bash).",
    ].join("\n") + "\n",
  );
  process.exit(2);
}

function parseOptions(argv: string[]): Options {
  const values = new Map<string, string>();
  for (const argument of argv) {
    if (argument === "--help" || argument === "-h") usage();
    const match = /^--([a-z-]+)(?:=(.*))?$/.exec(argument);
    if (!match) usage();
    values.set(match[1] ?? "", match[2] ?? "true");
  }
  const baseline = values.get("baseline") ?? process.env.CODEBOT_BENCH_BASELINE;
  if (!baseline) usage();
  const only = values.get("only") ?? "both";
  if (only !== "both" && only !== "baseline" && only !== "codebot") usage();
  const runs = Number(values.get("runs") ?? "3");
  if (!Number.isInteger(runs) || runs < 1) usage();
  return {
    baseline: resolve(baseline),
    out: resolve(values.get("out") ?? join(PROJECT_ROOT, ".codebot-build", "bench-compare")),
    scenarios: values.get("scenarios")?.split(",").filter(Boolean) ?? DEFAULT_SCENARIOS,
    runs,
    label: values.get("label") ?? "codebot",
    rebaseline: values.has("rebaseline"),
    summaryOnly: values.has("summary-only"),
    only,
  };
}

function benchReportsDirectory(tree: string): string {
  const candidates = BUILD_DIRECTORY_NAMES.map((name) => join(tree, name, "dev-automation", "bench"));
  return (
    candidates.find((candidate) => existsSync(candidate)) ??
    join(tree, BUILD_DIRECTORY_NAMES[0] ?? ".codebot-build", "dev-automation", "bench")
  );
}

function runBench(tree: string, scenario: string, runs: number, label: string, compare?: string): boolean {
  const args = ["run", "dev:bench", `--scenario=${scenario}`, `--runs=${runs}`, `--label=${label}`];
  if (compare) args.push(`--compare=${compare}`);
  log(`[bench-compare] ${tree}: bun ${args.join(" ")}`);
  const result = spawnSync("bun", args, { cwd: tree, stdio: "inherit" });
  return result.status === 0;
}

function copyReports(tree: string, directory: string, label: string): void {
  mkdirSync(directory, { recursive: true });
  const source = benchReportsDirectory(tree);
  for (const suffix of ["json", "md", "compare.md"]) {
    const file = join(source, `${label}.${suffix}`);
    if (existsSync(file)) copyFileSync(file, join(directory, `${label}.${suffix}`));
  }
}

function median(values: number[]): number | undefined {
  if (values.length === 0) return undefined;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2;
}

function medianOf(
  report: Report,
  scenario: string,
  metric: string,
  stat: "peak" | "mean" | "settled",
): number | undefined {
  const entry = report.scenarios.find((candidate) => candidate.scenario === scenario);
  const values = (entry?.runs ?? [])
    .map((run) => (stat === "settled" ? run.settled[metric] : run.series[metric]?.[stat]))
    .filter((value): value is number => typeof value === "number");
  return median(values);
}

function readReport(file: string): Report | null {
  try {
    const parsed: Report = JSON.parse(readFileSync(file, "utf8"));
    return parsed;
  } catch {
    return null;
  }
}

function summarize(options: Options): { markdown: string; passed: boolean } {
  const lines = [
    "# Bench comparison",
    "",
    `RAM limit: ${RAM_LIMIT_PERCENT}% over the baseline (PRD 4.7), checked on the median of mem.total (mean and settled).`,
    "",
    "| Scenario | Stat | Baseline MB | CodeBot MB | Change | Verdict |",
    "| --- | --- | ---: | ---: | ---: | --- |",
  ];
  let passed = true;
  for (const scenario of options.scenarios) {
    const before = readReport(join(options.out, "baseline", `baseline-${scenario}.json`));
    const after = readReport(join(options.out, options.label, `${options.label}-${scenario}.json`));
    for (const stat of ["mean", "settled"] as const) {
      const baselineValue = before ? medianOf(before, scenario, "mem.total", stat) : undefined;
      const codebotValue = after ? medianOf(after, scenario, "mem.total", stat) : undefined;
      if (baselineValue === undefined || codebotValue === undefined || baselineValue === 0) {
        lines.push(`| ${scenario} | ${stat} | ${baselineValue ?? "-"} | ${codebotValue ?? "-"} | - | no data |`);
        passed = false;
        continue;
      }
      const change = ((codebotValue - baselineValue) / baselineValue) * 100;
      const ok = change <= RAM_LIMIT_PERCENT;
      if (!ok) passed = false;
      lines.push(
        `| ${scenario} | ${stat} | ${baselineValue} | ${codebotValue} | ${change >= 0 ? "+" : ""}${change.toFixed(1)}% | ${ok ? "pass" : "FAIL"} |`,
      );
    }
  }
  lines.push("", `Result: ${passed ? "pass" : "fail"}`, "");
  return { markdown: lines.join("\n"), passed };
}

function main(): void {
  const options = parseOptions(process.argv.slice(2));
  const baselineDirectory = join(options.out, "baseline");
  const codebotDirectory = join(options.out, options.label);
  mkdirSync(options.out, { recursive: true });
  let failed = false;
  for (const scenario of options.summaryOnly ? [] : options.scenarios) {
    const baselineLabel = `baseline-${scenario}`;
    const saved = join(baselineDirectory, `${baselineLabel}.json`);
    if (options.only !== "codebot" && (options.rebaseline || !existsSync(saved))) {
      if (!runBench(options.baseline, scenario, options.runs, baselineLabel)) failed = true;
      copyReports(options.baseline, baselineDirectory, baselineLabel);
    }
    if (options.only !== "baseline") {
      const compare = existsSync(saved) ? saved : undefined;
      const codebotLabel = `${options.label}-${scenario}`;
      if (!runBench(PROJECT_ROOT, scenario, options.runs, codebotLabel, compare)) failed = true;
      copyReports(PROJECT_ROOT, codebotDirectory, codebotLabel);
    }
  }
  const summary = summarize(options);
  writeFileSync(join(options.out, "summary.md"), summary.markdown);
  log(summary.markdown);
  log(`[bench-compare] summary: ${join(options.out, "summary.md")}`);
  process.exit(failed || (options.only === "both" && !summary.passed) ? 1 : 0);
}

main();
