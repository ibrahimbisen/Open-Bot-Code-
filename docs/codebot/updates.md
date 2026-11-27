# Application updates from your server

By default CodeBot gets its updates from the GitHub Releases of the owner repository (decision D22,
see [releases.md](releases.md)). A folder on your own server (PRD 12, decision D15) is an optional
setting that replaces it. The app uses `electron-updater` with the generic provider: it reads the file
`latest.yml` (Windows), `latest-mac.yml` (macOS) or `latest-linux.yml` / `latest-linux-arm64.yml`
(Linux) in that folder, and downloads the installer that the file names.

## The update folder

Any web folder works: a folder of a web server (nginx, Caddy, Apache) or a public Nextcloud share.
The folder must be reachable by HTTP GET from every computer that runs CodeBot. Example:
`https://updates.example.com/codebot/`.

```
codebot/
  latest.yml                      Windows metadata
  latest-mac.yml                  macOS metadata (both architectures)
  latest-linux.yml                Linux x64 metadata
  latest-linux-arm64.yml          Linux arm64 metadata
  CodeBot-<version>-x64.exe       Windows installer
  CodeBot-<version>-arm64.dmg     macOS installers (and the .zip that the updater downloads)
  CodeBot-<version>-x86_64.AppImage
  history/<version>/latest*.yml   copy of the metadata of each release, for roll back
  codebot-minimum-version.json    optional, see below
  provider-runtime-blocklist.json optional, see below
```

## Where the app reads the update URL

Order, first match wins:

1. Settings > Updates > Update server (saved on the computer).
2. The environment variable `CODEBOT_UPDATE_URL`.
3. The URL that was built into the app (`CODEBOT_UPDATE_URL` at build time, in `resources/app-update.yml`).
   When `CODEBOT_UPDATE_URL` is not set at build time, the build wrapper uses the GitHub feed
   `https://github.com/ibrahimbisen/Open-Bot-Code-/releases/latest/download/`.

With no URL the app makes no request and Settings shows "No update server is set". A URL must use
`https://`. `http://` is accepted only for a computer on your own network (localhost, a private IP
address, `.local`, `.lan`).

## Check, download and restart (PRD 12.5, 12.6)

The app checks at start (after 12 seconds) and then every hour. It downloads a new version in the
background and then shows "Restart to update" in the account popover and in Settings > Updates.
Settings > Updates > "Restart automatically when idle" restarts the app by itself when no agent works.

Provider CLI updates (Claude Code, Codex and the others) are separate and unchanged (PRD 12.7): the
app reads them from the upstream sources of each provider. Put a file `provider-runtime-blocklist.json`
in the update folder to block a broken provider version in all clients; the app joins it with the list
that it carries.

## Release in one command (PRD 12.3, 12.4)

1. Raise the version: `bun run release:patch` (or `minor`, `major`), review, commit.
2. On each computer that builds one platform, run one command. The script builds the installer for the
   computer that it runs on, checks every file against the sha512 in the metadata, and uploads. It
   works the same on Windows, macOS and Linux.

```
# a folder on the server (a mounted share, or the web folder itself)
CODEBOT_UPDATE_URL=https://updates.example.com/codebot/ bun run release:codebot -- --target-dir /mnt/updates/codebot

# WebDAV, for example Nextcloud
CODEBOT_WEBDAV_USER=owner CODEBOT_WEBDAV_PASSWORD=app-password \
  bun run release:codebot -- --update-url https://updates.example.com/codebot/ \
  --webdav https://cloud.example.com/remote.php/dav/files/owner/codebot/

# scp (uses your ssh keys)
bun run release:codebot -- --update-url https://updates.example.com/codebot/ --scp owner@server:/var/www/codebot
```

Run it on a Windows computer for the EXE, on a Mac for the DMG (both architectures by default, or
`--mac-arch arm64|x64`) and on a Linux computer for the AppImage. Each run adds its files to the same
folder. The script uploads the installers first and the `latest*.yml` files last, so a client never
reads metadata for a file that is not there yet. When the folder already has a `latest-mac.yml` of the
same version for the other macOS architecture, the script merges both into one file.

Other options: `--staging <0-100>` writes a staged rollout percentage into the metadata, `--skip-build`
uploads the installers that already are in `dist/`, `--dry-run` checks the arguments and changes
nothing.

Roll back: copy `history/<old version>/latest*.yml` over the `latest*.yml` files in the folder (clients
with a newer version do not downgrade by themselves; they stay until the next release).

## Minimum version

`codebot-minimum-version.json` in the update folder, `{ "desktop": "1.2.3", "host": "1.2.3" }`, makes
older clients ask for an update. A missing file means no minimum.

## Servers

A Linux server updates itself from the same folder: set `CODEBOT_UPDATE_URL` in
`/opt/CodeBot/hosted/codebot.env`. Install a new server with
`sudo bash -s -- --update-url https://updates.example.com/codebot/ < install-server.sh`.
The server scripts accept only an `https://` URL.

## Test it without a server

`bun run test:app-update` runs the real update service against a local static HTTP folder and writes
`.codebot-build/app-update/report.json`. `bun run test:release-script` runs the release script against a
folder and a mock WebDAV server and writes `.codebot-build/release-script/report.json`.

Unsigned builds: see [unsigned-builds.md](unsigned-builds.md).
