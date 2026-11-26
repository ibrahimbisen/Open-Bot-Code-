# Take changes from upstream OpenBot

CodeBot renames the upstream product in every file. A direct merge of an upstream commit would
conflict in almost every changed line. The rename script removes this problem: first rename the
upstream tree, then merge the renamed tree.

## Branches and tags

| Name | Content |
| --- | --- |
| `origin/main` | Upstream OpenBot. Fetch only; the push URL is disabled. |
| `upstream-renamed` | The upstream tree after `scripts/codebot/rename-upstream.ts`. One commit for each upstream commit that was taken. |
| `main` | CodeBot. |
| `openbot-baseline` | The first upstream commit that CodeBot used. |
| `codebot-v*` | CodeBot releases. `codebot-v0.79.0` is the first rename commit. |

## Procedure

Run the commands in Git Bash from the repository root. The work tree must be clean.

1. Get the upstream commits and choose the commit to take:

   ```sh
   git fetch origin main
   git log --oneline upstream-renamed..origin/main | tail -5
   ```

2. Make the renamed tree of that commit in a separate worktree:

   ```sh
   git worktree add ../_sync upstream-renamed
   cd ../_sync
   git read-tree -u --reset origin/main
   bun ../CodeBot/scripts/codebot/rename-upstream.ts --root "$PWD"
   bun install --frozen-lockfile
   ./node_modules/.bin/biome check --write --linter-enabled=false .
   git add -A
   git commit --no-verify -m "Rename OpenBot to CodeBot (mechanical) for upstream <sha>"
   ```

   This commit is a script result. It is the only commit that does not run the pre-commit hook.

3. Merge the renamed tree into CodeBot and solve the conflicts that are left. They are in the places
   that CodeBot changed by hand:

   ```sh
   cd ../CodeBot
   git merge upstream-renamed
   ```

4. Run `bun install --frozen-lockfile`, then the checks in [agent-brief.md](agent-brief.md#6-checks-before-you-report)
   and `bun scripts/codebot/check-branding.ts`. An upstream change can add a new reference to an
   upstream server. Remove each one.

5. Remove the sync worktree: `git worktree remove ../_sync`.

## Database migrations

CodeBot does not add files to `src/backend/migrations/`. Its own tables use the project migration
chain, which has its own version table. Thus an upstream migration keeps its version number after a
merge.

## What the script keeps

The script does not change `LICENSE`, `NOTICE`, `docs/upstream/` and `docs/codebot/`. In all other
files it keeps the upstream domains, the upstream GitHub paths and the accounts that the upstream
project owns. `bun scripts/codebot/check-branding.ts --report` lists each kept name, so that it can be
removed or replaced with a setting.
