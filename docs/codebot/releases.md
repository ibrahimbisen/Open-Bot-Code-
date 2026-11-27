# Releases through GitHub

Decision D22. The code is in `https://github.com/ibrahimbisen/Open-Bot-Code-`. Each push to `main`
makes a new version of the desktop app, and the installed apps get it from the GitHub Releases of that
repository.

## What a push to main does

The workflow `.github/workflows/release.yml` runs on each push to `main` (and when you start it by hand
in the Actions tab). Only one release runs at a time; a second push waits.

1. **Create draft release.** The job computes the version and makes a draft GitHub Release with the tag
   `v<version>`. Users do not see a draft.
2. **Build macOS, Build Windows, Build Linux.** Three jobs run at the same time on `macos-latest`,
   `windows-latest` and `ubuntu-latest`. Each job installs the dependencies with Bun 1.4.2 on its own
   system (so the native parts are the ones for that system), prepares the voice runtime and the
   Computer Use driver, runs `bun run build`, and packages with electron-builder (`--publish never`).
   Then it checks the update files (`verify:update-artifacts`) and uploads its files to the draft.
3. **Publish release.** Only when all three builds pass, the draft becomes the latest release. If one
   build fails, the draft stays a draft and the apps do not see it.

The workflow uses the built-in `GITHUB_TOKEN`. You do not need a personal access token.

`.github/workflows/ci.yml` runs the checks on each push and pull request: type checks, lint,
`check:ui`, `i18n:check`, `knip:check`, the unit tests, `test:app-update` and `test:release-script`.
It needs no secrets. The upstream workflows that deployed or called upstream services are removed.

## Version numbers

The version is `<major>.<minor>.<run number>`. Major and minor come from `package.json`; the patch is
the run number of the release workflow, which goes up by one for each run. Example: `package.json` has
`0.79.0` and the run number is 12, so the version is `0.79.12` and the tag is `v0.79.12`. The script
is `scripts/codebot/ci-version.ts`.

The job writes the version into `package.json` only on the build computer. It does not commit it, so
a release does not start a new release. To start a new minor version, change `package.json` to
`0.80.0` and push. The run number continues, so the next version is for example `0.80.13`, which is
newer than `0.79.12`.

## Files in each release

| System | Files |
| --- | --- |
| macOS (Apple silicon) | `CodeBot-<version>-arm64.dmg`, `CodeBot-<version>-arm64.zip`, their `.blockmap` files, `latest-mac.yml` |
| Windows (x64) | `CodeBot-<version>-x64.exe`, `CodeBot-<version>-x64.exe.blockmap`, `latest.yml` |
| Linux (x64) | `CodeBot-<version>-x86_64.AppImage`, `latest-linux.yml` |

The remote desktop runtime is not in these builds: its pinned download is an upstream release that
this repository does not have. The app works without it; only remote desktop is not available.
Intel Macs and Linux arm64 have no build yet.

## macOS signing

Without signing secrets the macOS app is not signed (`CSC_IDENTITY_AUTO_DISCOVERY=false`) and the
release is still published. To sign and notarize it, add these repository secrets (Settings > Secrets
and variables > Actions):

| Secret | Content |
| --- | --- |
| `CSC_LINK_BASE64` | Your Developer ID Application certificate as a `.p12` file, in base64 (`base64 -i cert.p12`) |
| `CSC_KEY_PASSWORD` | The password of that `.p12` file |
| `APPLE_ID` | The Apple ID e-mail of your developer account |
| `APPLE_APP_SPECIFIC_PASSWORD` | An app-specific password of that Apple ID |
| `APPLE_TEAM_ID` | Your Apple team ID |

With the first two the app is signed. With all five it is also notarized. Windows and Linux builds are
not signed (see [unsigned-builds.md](unsigned-builds.md)).

## Make a release by hand

- Run the workflow again: GitHub > Actions > Release > Run workflow (branch `main`). It makes a new
  version with the next run number.
- If a build failed, choose "Re-run failed jobs". The build uploads its files to the same draft again,
  and the release is published when all builds pass.
- To build on your own computer without GitHub, see the one-command release in
  [updates.md](updates.md) (`bun run release:codebot`).

## How users get updates

The installed app reads `latest.yml`, `latest-mac.yml` or `latest-linux.yml` from
`https://github.com/ibrahimbisen/Open-Bot-Code-/releases/latest/download/`. GitHub sends that address
to the files of the latest published release, so the app needs no GitHub account and no API call.
The app checks 12 seconds after start and then every hour. On Windows and Linux it downloads the new
version and shows "Restart to update".

A macOS app without a Developer ID signature cannot install an update by itself. It shows the new
version, and Download opens the release page in the browser. Install the new DMG by hand.

To use your own update server instead, enter its URL in Settings > Updates > Update server (see
[updates.md](updates.md)). Leave the field empty to use GitHub again.

The repository name is in one place: `packages/contracts/src/release-repository.ts`. The build wrapper
`scripts/codebot/electron-builder.ts` writes the feed URL into the app when `CODEBOT_UPDATE_URL` is not
set.
