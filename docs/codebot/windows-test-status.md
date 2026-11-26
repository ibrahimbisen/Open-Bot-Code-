# Test status on Windows

Upstream CI runs on Ubuntu and macOS only. This file records the result of each check and each
offline test suite on Windows. Work package W20 keeps it current (PRD items 19.1 and 19.5).

- Computer: Windows 11 Pro (x64), Bun 1.4.2, Node.js 26.13.1.
- Each run uses a sandbox profile: `cb_sandbox <name>` in Git Bash (see [agent-brief.md](agent-brief.md)).
- No run on macOS or Linux was possible on this computer (no WSL, no Docker). Each change keeps the
  POSIX branch of the code and of the test; "POSIX" in the notes says what stays the same there.

Result values: `pass`, `fail` (with the exact reason), `not run yet`, `not run` (with the reason).

## Checks

| Check | Result on Windows | Notes |
| --- | --- | --- |
| `bun run test:desktop` | pass | 103 files, 2298 tests. See [Vitest corrections](#vitest-corrections). |
| `bun run knip:check` | fail, not a Windows problem | The 18 unused files, 9 unused exports and 1 unused type that only Windows reported are gone: see [knip corrections](#knip-corrections). One finding stays: `src/backend/projects/project-context.ts` is an unused file. Commit `ce1b138cc` on `main` added it and no module imports it yet, so each platform reports it. With that file moved away, knip exits with code 0 on Windows. The 7 configuration hints are not errors. |
| `bun run check:agent-context` | not run yet | |

## Vitest corrections

Before W20, 9 tests in 4 files failed on Windows, also on unmodified upstream.

| Test file | Cause on Windows | Correction |
| --- | --- | --- |
| `scripts/ui-foundation-check.test.ts` (4 tests) | `scripts/ui-foundation-check.ts` made each label with `path.relative`, which gives `\` on Windows. | The check now writes each label with `/` on every platform. The test did not change. POSIX: the label text is the same as before. |
| `src/backend/codebot-database.test.ts` (1 test) | Windows has no POSIX permission bits. After `chmod 0o600`, Node.js reports `0o666` for a file that is not read-only. The failed assertion also left the database open, which made the cleanup fail with `EBUSY`. | The test expects `0o600` on POSIX and `0o666` on Windows. On Windows, the folder ACL of the user profile keeps the file private; CodeBot does not set an ACL. |
| `src/main/file-preview-pages.test.ts` (3 tests) | A file symbolic link needs the "Create symbolic links" privilege (administrator or Developer Mode). Without it, `symlink` fails with `EPERM`. | The fixture also makes two folder links (a junction on Windows, a symbolic link on POSIX), which need no privilege. The test asserts that the preview refuses a file behind each folder link. The file links stay: the fixture skips them only on Windows and only for `EPERM`. |
| `src/main/provider-runtime-failure-log.test.ts` (1 test) | The log line shows the home folder as `~`, and the rest of the path keeps the separator of the platform: `~\proxy.conf`. The test expected `~/proxy.conf`. | The test expects `~` with the platform separator, as the JSON log line writes it. It also asserts that the JSON form of the home path is not in the line. |

## knip corrections

The electron-vite plugin of knip 6.42.1 reads the folder of each renderer HTML page with
`path.posix.dirname`. `electron.vite.config.ts` gives the page as a Windows path with backslashes, so
the folder was `.`, and the module of the page (`/src/index.tsx`) resolved to a file that does not
exist. knip then reported the 7 page modules, and each file and export that only they use, as unused.

`knip.config.ts` now reads the `<script src>` of each `src/renderer/*.html` file and gives these
modules to the electron-vite plugin as its entries. POSIX: the plugin finds the same modules by
itself, so the result does not change. The entries belong to the plugin, not to the workspace `entry`
list, so knip does not report them as redundant on POSIX.

## Provider fakes E2E

Not run yet.

## Other offline suites

Not run yet.
