# Home server setup

This guide shows what to put on the home server so that CodeBot needs no service of the upstream
project. It is a map. The details are in two documents that this guide links and does not copy:

- [account-service.md](account-service.md): account service, Nextcloud login, Signal and TURN (work
  package W03).
- [updates.md](updates.md): update folder and one-command release (work package W06).

The first release needs only the update server. Login and remote access are optional (PRD 11.7). A
user can run CodeBot with no server and a local profile.

## What runs where

| Part | Needed for | Runs as | Public address (example) |
| --- | --- | --- | --- |
| Nextcloud | Login of users | Your existing install | `https://cloud.example.com` |
| Account service (`apps/auth-api`) | Login, hosts, phone and remote access | Bun process with SQLite | `https://account.example.com` |
| Signal (`remote/api`) | Remote connections | Docker | `wss://signal.example.com/v1/signal` |
| TURN (coturn) | Remote connections through a firewall | Docker, host network | `turn.example.com` |
| Update server | Updates of the desktop app | A web folder | `https://updates.example.com/codebot/` |

Use your own names in place of `example.com`. Every public address needs HTTPS. The update URL may be `http://` only for a computer on your own network
(localhost, a private IP address, `.local` or `.lan`).

## Order of work

1. [Update server](#1-update-server). Do this first. It is all that the first release needs.
2. [Nextcloud and the account service](#2-nextcloud-and-the-account-service). For login.
3. [Signal and TURN](#3-signal-and-turn). For remote access.
4. [Point the apps at the services](#4-point-the-apps-at-the-services).

## 1. Update server

The update server is a folder that clients read by HTTP GET. It holds the installers and the files
`latest.yml`, `latest-mac.yml` and `latest-linux.yml`. A web server (nginx, Caddy, Apache) or a public
Nextcloud share can serve it. The full layout of the folder, the settings and the release command are in
[updates.md](updates.md).

Example for nginx. The folder `/var/www/codebot` holds the files:

```nginx
server {
  listen 443 ssl;
  server_name updates.example.com;
  root /var/www;
  location /codebot/ {
    autoindex off;
    add_header Cache-Control "no-cache";
  }
}
```

Check it. Replace the address with yours. After the first release, this must return the metadata:

```sh
curl -fsS https://updates.example.com/codebot/latest.yml
```

Make a release on each system that you build for. The command builds, checks the sha512 of each file,
and uploads the installers before the metadata:

```sh
bun run release:patch
CODEBOT_UPDATE_URL=https://updates.example.com/codebot/ \
  bun run release:codebot -- --target-dir /mnt/updates/codebot
```

Use `--webdav <url>` for Nextcloud or `--scp user@host:/folder` for ssh in place of `--target-dir`. Run
the command on Windows for the EXE, on a Mac for the DMG, and on Linux for the AppImage. Each run adds
its files to the same folder. Add `--dry-run` first to check the arguments. See
[updates.md](updates.md#release-in-one-command-prd-123-124) for all options and for roll back.

Builds are not signed. Tell your team to read [unsigned-builds.md](unsigned-builds.md).

The URL gets into the app in one of three ways, and the first one that is set wins: Settings > Updates >
Update server, the environment variable `CODEBOT_UPDATE_URL`, or the value built into the app. Set
`CODEBOT_UPDATE_URL` when you run `release:codebot` or `dist:*`, and the build has it.

## 2. Nextcloud and the account service

The account service uses Nextcloud as the identity provider (OpenID Connect or the OAuth2 app of
Nextcloud). Users sign in with their Nextcloud user name and password. When Nextcloud removes or
disables a user, the service ends the access of that user within `ACCOUNT_REVALIDATE_SECONDS`.

Follow these parts of [account-service.md](account-service.md):

1. "1. Nextcloud": add the client and the redirect URI `https://account.example.com/v1/auth/oidc/callback`.
2. "2. The account service": make the keys with `bun run --cwd apps/auth-api keys`, fill the environment
   file, start with `bun run --cwd apps/auth-api serve`, and run it as a service behind a reverse proxy.
3. Check both addresses. Each must answer 200:

   ```sh
   curl -fsS https://account.example.com/health/ready
   curl -fsS https://account.example.com/.well-known/jwks.json
   ```

4. Sign in once with a Nextcloud user. Disable that user in Nextcloud. Check that the access ends.

The service needs Bun on the server and a checkout of the CodeBot version that you run. Back up
`ACCOUNT_DATA_DIR`, `ACCOUNT_SECRET_KEY` and the ticket keys. The section "Data and backup" says how.

The tests use a mock Nextcloud. They did not run against a real Nextcloud. Do the sign-in and the
disable check on your own server before you trust it.

## 3. Signal and TURN

Signal and TURN run from `remote/compose.yaml`. You need DNS names, open ports and secrets. Follow
"3. Signal and TURN" in [account-service.md](account-service.md) and [remote/README.md](../../remote/README.md).

```sh
bun run remote:up
bun run remote:check
```

Both commands need Docker. `remote:up` reads `remote/.env.self-hosted`.

## 4. Point the apps at the services

| App | Setting |
| --- | --- |
| Desktop, update server | Settings > Updates > Update server, or `CODEBOT_UPDATE_URL` |
| Desktop, account service | `CODEBOT_AUTH_API_URL=https://account.example.com` in the environment of the app |
| Desktop, Signal | `CODEBOT_REMOTE_SIGNAL_URL=wss://signal.example.com/v1/signal` in the environment of the app |

A setting screen for the account and Signal addresses, and the new sign-in screen, come with work
package W04. The old email-code sign-in screen is still in the app until then.

## Linux server for the engine (Phase 2)

Phase 2 runs the agent engine on the home server. It is not part of the first release. Work package W17
builds it. A server can update itself from the same update folder. See "Servers" in
[updates.md](updates.md#servers).

## Where to look when something fails

| Problem | Look at |
| --- | --- |
| Clients do not see a new version | `curl` the `latest*.yml` file; check the version in it and the sha512 of the installer |
| The app says "No update server is set" | Settings > Updates, or the build had no `CODEBOT_UPDATE_URL` |
| A sign-in fails with `refresh_token_missing` | The Nextcloud client gives no refresh token: see "Nextcloud OAuth2 app" and "OpenID Connect" in [account-service.md](account-service.md) |
| The account service exits with code 78 | The secret key changed: see "Secret key" in [account-service.md](account-service.md) |
| Remote connections fail through a firewall | TURN ports are closed: see the port table in [account-service.md](account-service.md) |

## Tests without a server

| Command | What it checks |
| --- | --- |
| `bun run test:app-update` | The update service against a local web folder |
| `bun run test:release-script` | The release command against a folder and a mock WebDAV server |
| `bun run test:account-login` | Login with a mock Nextcloud |
| `bun run test:account-user-disabled` | Access ends when Nextcloud disables a user |
| `bun run test:account-remote-access` | Hosts, invitations, members and sessions |
| `bun run test:account-signal` | The real Signal service with the account service |

Each test writes `.codebot-build/<name>/report.json`.
