# RAM and CPU measurement (PRD 4.7, 19.6)

Rule (PRD 4.7): RAM must not grow more than 15% over the OpenBot baseline with the same number of agents.
The check uses the median `mem.total` (mean and settled) of 3 runs per scenario.

## Run the comparison (one command)

Needs a built tree for both sides. The baseline tree is a checkout of upstream OpenBot at the fork
point with its own `bun install` and `bun run build`; only `scripts/dev-automation/` differs from upstream.

```
# Git Bash on Windows; macOS and Linux use the same command in a normal shell
source "<root>/_tools/env.sh"
cb_sandbox bench                 # redirects the profile, so the real profile is never touched
cb_wait_for_memory 12            # at least 12 GB free before starting
cd <codebot worktree>
bun run bench:compare -- --baseline=<root>/_baseline
```

Options: `--scenarios=a,b`, `--runs=3`, `--label=codebot`, `--rebaseline` (measure the baseline again),
`--only=baseline|codebot`, `--summary-only` (write `summary.md` from existing reports), `--out=<dir>`. Without `--out` the reports go to `_measure` next to the
worktree folders, else `.codebot-build/bench-compare`. The command starts the Auth API itself, runs the
scenarios one after the other (never in parallel), writes `summary.md` and exits with 1 when a scenario
is more than 15% over the baseline. Default scenarios: s1-cold-empty, s2-idle-visible,
s2-idle-visible-100, s3-scaled-small, s14-agents-20, s15-stream-5, s14-agents-100. All use fake providers
and a fake Codex; no model tokens are used. A full run takes 1 to 2 hours.

Single scenario: `bun run dev:bench --scenario=<id> --runs=3 --label=<name> [--compare=<baseline.json>]`.
Process tree live: `bun run dev:memory`, `bun run dev:cpu` (while `bun run dev` runs).
Harness test: `bun run test:bench-harness`.

## How it measures on Windows

- Process table through the Toolhelp snapshot and per-process handles (koffi), with macOS (`ps`) and Linux (`/proc`) readers.
  The tree walk compares creation times, so a reused PID is not counted.
- `mem.*` is private working set; `rss.*` is the working set. Peak, mean and settled (last 10 s) per run.
- CPU comes from `GetProcessTimes` (steps of 15.6 ms); a 10 s settled window has steps of 0.16 %.
- Each report records `host.cpu` and `host.mem.free`, because other work on the computer changes the numbers.
- Do one warm-up run for each tree: the first sign-in of a new bench account has one page fewer, and the first start after a build is slow.
- The app starts real CLIs it finds on the computer (for example `claude --version`); they show in the peaks at start.

## OpenBot baseline (Windows 11, 24 logical CPUs, 3 runs, median with min to max)

Reports: `_measure/baseline/*.md` and `.json`. `mem.total` in MB.

| Scenario | Peak | Mean | Settled | cpu.total settled % |
| --- | ---: | ---: | ---: | ---: |
| s1-cold-empty | 2143 (2036-2212) | 1618 (1608-1674) | 749 (741-760) | 50.8 |
| s2-idle-visible | 2199 (2151-2233) | 1149 (1131-1153) | 906 (905-947) | 1.9 |
| s2-idle-visible-100 | 2262 (2101-2338) | 1344 (1332-1369) | 982 (974-1002) | 2.5 |
| s3-scaled-small | 2588 (1997-2706) | 1852 (1672-1893) | 1809 (1653-1838) | 1.6 |
| s14-agents-20 | 2517 (2119-2741) | 2127 (1402-2162) | 1926 (1184-2112) | 140.9 |
| s15-stream-5 | 2500 (2492-2516) | 1876 (1810-1898) | 1814 (1792-1830) | 72.3 |

## Noise level

Idle scenarios: the median settled value varies about 1 to 5% between runs, but one run in three is
often 5 to 10% off (provider processes of real CLIs, GPU process). Streaming and many-agent scenarios
vary 10 to 40% between runs (s14-agents-20 settled 1184 to 2112 MB) depending on when the fake
streams end. A 15% limit on the median of 3 runs is therefore the least that can be judged; when a
scenario fails, run it again with `--runs=5` before changing code. CPU values are only comparable
for the same host load (see `host.cpu`).

## CodeBot results (r0, before other packages merge)

`_measure/codebot-r0/` holds the CodeBot runs with `.compare.md` files; `_measure/summary.md` is the verdict.
Median `mem.total` in MB, 3 runs each. All scenarios pass the 15% limit (largest growth +6.1%).

| Scenario | Mean base / CodeBot | Change | Settled base / CodeBot | Change |
| --- | ---: | ---: | ---: | ---: |
| s1-cold-empty | 1618 / 1666 | +3.0% | 749 / 745 | -0.5% |
| s2-idle-visible | 1149 / 1208 | +5.1% | 906 / 920 | +1.5% |
| s2-idle-visible-100 | 1412 / 1494 | +5.8% | 980 / 996 | +1.6% |
| s3-scaled-small | 1852 / 1719 | -7.2% | 1809 / 1697 | -6.2% |
| s14-agents-20 | 2127 / 2257 | +6.1% | 1926 / 1992 | +3.4% |
| s15-stream-5 | 1876 / 1826 | -2.6% | 1814 / 1841 | +1.5% |
| s14-agents-100 | 2353 / 2432 | +3.4% | 2121 / 2219 | +4.7% |

s14-agents-100 baseline: peak 2726 MB, settled 2121 MB. The final comparison runs after the merge
with the command above.
