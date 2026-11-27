# CodeBot account service

The account service runs on the home server. It is the code of `apps/auth-api`, started as a Bun process
with a SQLite database. Nextcloud is the identity provider. Signal and TURN (`remote/`) are the other two
services that remote access needs. Nothing here calls a server that the upstream project runs, and no part
of it needs Cloudflare.

Decision D8 sets this design. PRD items: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6 (service part), 3.7 (service
part) and 20.9 (service part).

## What the service does

- Users sign in with their Nextcloud user name and password. The service never sees the password: Nextcloud
  shows its own sign-in page (OpenID Connect or the Nextcloud OAuth2 app).
- It keeps accounts, hosts, memberships, invitation links, logical sessions and phone sessions for remote
  access, and signs the short tickets that Signal accepts.
- It asks Nextcloud about each signed-in user on a timer and before each request, and ends the access of a
  user that Nextcloud removed or disabled.
- It sends signed events to Signal when access ends, so Signal closes the sockets of that user.

There is no email-code sign-in, no company sign-in, no SCIM, no invitation by email, no billing and no
hosted server. A request to one of these paths gets 404. Invitations are links that the owner copies from the
app. There is no plan limit: a host can have up to 1,000 members.

## Parts and ports

| Part | Where it runs | Port | Public |
| --- | --- | --- | --- |
| Account service (`apps/auth-api`) | Bun process | 3100 (set `ACCOUNT_PORT`) | Behind your reverse proxy at `https://account.example.com` |
| Signal (`remote/api`) | Docker | 443 or 8081 behind a proxy | `wss://signal.example.com/v1/signal` |
| TURN (coturn, `remote/coturn`) | Docker, host network | UDP and TCP 3478, TCP 5349, UDP 16384-65535 | `turn.example.com` |
| Nextcloud | Your existing install | 443 | `https://cloud.example.com` |

Use your own names in place of `example.com`. The account service needs HTTPS in front of it (`ACCOUNT_PUBLIC_URL`
must be `https://`; a loopback `http://` address is allowed for tests).

## 1. Nextcloud

Use one of two ways. Both give a refresh token, which the disabled-user check needs.

### OpenID Connect (preferred)

1. Install the Nextcloud app that makes Nextcloud an OpenID Connect provider (the "OpenID Connect Identity
   Provider" app, id `oidc`).
2. In Administration settings > Security > OpenID Connect clients, add a client:
   - Name: CodeBot
   - Redirect URI: `https://account.example.com/v1/auth/oidc/callback`
   - Type: confidential
3. Copy the client ID and the secret.
4. Set `OIDC_ISSUER_URL` to the issuer of the provider. The service reads `<issuer>/.well-known/openid-configuration`.
   If your install keeps the endpoints elsewhere, set `OIDC_AUTHORIZATION_ENDPOINT`, `OIDC_TOKEN_ENDPOINT`,
   `OIDC_USERINFO_ENDPOINT` and `OIDC_JWKS_URI` instead.

### Nextcloud OAuth2 app

1. In Administration settings > Security > OAuth 2.0 clients, add a client with the redirect URI
   `https://account.example.com/v1/auth/oidc/callback`.
2. Set `NEXTCLOUD_URL=https://cloud.example.com` (not `OIDC_ISSUER_URL`). The service uses
   `/apps/oauth2/authorize`, `/apps/oauth2/api/v1/token` and `/ocs/v2.php/cloud/user`.

Set `OIDC_ISSUER_URL` or `NEXTCLOUD_URL`, not both. The login is refused when the provider gives no refresh
token (`refresh_token_missing`).

The tests use a mock provider that follows both ways (`scripts/oidc-mock-server.ts`). They did not run against
a real Nextcloud. Try one sign-in and one disable on your own server after the first start (step 5).

## 2. The account service

You need [Bun](https://bun.sh) on the server and a checkout of the CodeBot release that you run.

1. Make the keys and secrets:

   ```sh
   bun run --cwd apps/auth-api keys
   ```

   The command prints `ACCOUNT_SECRET_KEY`, the ticket key pair (`REMOTE_TICKET_KEY_ID`,
   `REMOTE_TICKET_PRIVATE_JWK`, `REMOTE_TICKET_PUBLIC_JWKS`) and a value for `REMOTE_AUTH_WEBHOOK_SECRET`.
   Keep them secret and back them up. `ACCOUNT_SECRET_KEY` encrypts the stored refresh tokens.

2. Copy `apps/auth-api/.env.example` to `/etc/codebot/account.env` and fill it. The file has no comments; the
   names are:

   | Name | Meaning |
   | --- | --- |
   | `ACCOUNT_PUBLIC_URL` | Public HTTPS address of the service, no path |
   | `ACCOUNT_LISTEN_HOST`, `ACCOUNT_PORT` | Where the Bun process listens (default `127.0.0.1:3100`) |
   | `ACCOUNT_DATA_DIR` | Folder for `account.sqlite`, avatar files and `instance.lock`. Only one process may use it |
   | `ACCOUNT_TRUST_PROXY` | `true` when a reverse proxy sets `X-Forwarded-For` |
   | `ACCOUNT_SECRET_KEY` | At least 32 bytes. Do not change it (see "Secret key") |
   | `OIDC_*`, `NEXTCLOUD_URL` | Nextcloud login (step 1) |
   | `REMOTE_TICKET_*` | Ticket signing key pair |
   | `REMOTE_SIGNAL_URL` | The Signal address that tickets name: `wss://signal.example.com/v1/signal` |
   | `REMOTE_SIGNAL_HOMES` | Optional list of Signal machines for more than one Signal |
   | `REMOTE_AUTH_WEBHOOK_URL`, `REMOTE_AUTH_WEBHOOK_URLS`, `REMOTE_AUTH_WEBHOOK_SECRET` | Where the signed access events go (Signal `/internal/auth-events`) |
   | `ACCOUNT_REVALIDATE_SECONDS` | How often the service asks Nextcloud about each active user (default 300) |
   | `ACCOUNT_TICKET_FRESHNESS_SECONDS` | A request after this age since the last confirmation asks Nextcloud first (default 60) |
   | `ACCOUNT_REVALIDATE_GRACE_SECONDS` | How long a user keeps access while Nextcloud does not answer (default 86400) |
   | `ACCOUNT_LOGIN_FLOW_SECONDS` | Life of a pending sign-in (default 600) |
   | `ACCOUNT_REPLACE_SECRET_KEY` | `true` once, to accept a new secret key (see "Secret key") |
   | `ACCOUNT_MINIMUM_VERSION_*` | Optional minimum app versions |
   | `CODEBOT_LOG_LEVEL` | `debug`, `info`, `warn` or `error` |

3. Start the service. A value in the process environment wins over the file:

   ```sh
   ACCOUNT_ENV_FILE=/etc/codebot/account.env bun run --cwd apps/auth-api serve
   ```

   The service applies the database migrations at start. It writes one line of log for each event, and it
   never logs a token, a secret or a password. Stop it with SIGINT or SIGTERM; it ends the open requests and
   background tasks first.

4. Run it as a service. Example systemd unit:

   ```ini
   [Unit]
   Description=CodeBot account service
   After=network-online.target

   [Service]
   User=codebot
   WorkingDirectory=/opt/codebot
   Environment=ACCOUNT_ENV_FILE=/etc/codebot/account.env
   ExecStart=/usr/local/bin/bun run --cwd apps/auth-api serve
   Restart=on-failure

   [Install]
   WantedBy=multi-user.target
   ```

   Put a reverse proxy in front for TLS. Example for Nginx:

   ```nginx
   server {
     listen 443 ssl;
     server_name account.example.com;
     location / {
       proxy_pass http://127.0.0.1:3100;
       proxy_set_header Host $host;
       proxy_set_header X-Forwarded-For $remote_addr;
       proxy_set_header X-Forwarded-Proto https;
     }
   }
   ```

5. Check the service. Both commands must return 200:

   ```sh
   curl -fsS https://account.example.com/health/ready
   curl -fsS https://account.example.com/.well-known/jwks.json
   ```

   Then sign in once with a Nextcloud user. Disable that user in Nextcloud and check that its access ends
   within `ACCOUNT_REVALIDATE_SECONDS`.

## 3. Signal and TURN

Signal relays the WebRTC set-up and gives each peer short TURN credentials. coturn relays the media when a
direct connection is not possible. Both run from `remote/compose.yaml`. The full guide is
[remote/README.md](../../remote/README.md); these are the steps for this set-up.

1. DNS: `signal.example.com` and `turn.example.com` point to the server. Open TCP 443, TCP and UDP 3478, TCP 5349
   and UDP 16384-65535 (the relay range).
2. Copy `remote/.env.example` to `remote/.env.self-hosted` and set:
   - `SIGNAL_DOMAIN`, `TURN_DOMAIN`, `TURN_PUBLIC_IP`, `ACME_EMAIL`. The `acme` container gets the
     certificates with a DNS challenge. `ACME_DNS_PROVIDER` is `cloudflare` by default; any
     [lego DNS provider](https://go-acme.github.io/lego/dns/) works if you also give its variables to the
     `acme` service. If a reverse proxy on the server already holds the certificates, set
     `REMOTE_TLS_DISABLED=true` and the proxy values that `remote/README.md` names.
   - `REMOTE_TICKET_JWKS_URL=https://account.example.com/.well-known/jwks.json`. Or give the public key set
     with `REMOTE_TICKET_PUBLIC_JWKS`, so that Signal needs no request to the account service.
   - `REMOTE_CONTROL_PLANE_URL=https://account.example.com`.
   - `REMOTE_AUTH_WEBHOOK_SECRET`: the same value as in the account service.
   - `REMOTE_SESSION_SECRET`, `TURN_SHARED_SECRET`, `REMOTE_METRICS_TOKEN`: new secrets (`openssl rand -base64 48`).
   - Leave the Slack, GitHub, Discord and Telegram values empty. They need apps that only the upstream project owns.
3. Start and check:

   ```sh
   bun run remote:up
   bun run remote:check
   curl -fsS https://signal.example.com/health/ready
   curl -fsS https://signal.example.com/health/turn
   ```

4. In the account service, `REMOTE_SIGNAL_URL=wss://signal.example.com/v1/signal`,
   `REMOTE_AUTH_WEBHOOK_URL=https://signal.example.com/internal/auth-events` and the same
   `REMOTE_AUTH_WEBHOOK_SECRET`. Restart the account service.

4. Point the app at the services. In the desktop app open Settings > Profile > Account service, enter
   `https://account.example.com` and save it, then choose Sign in. The app opens your browser at the Nextcloud
   sign-in page and returns to a loopback address of the app when you finish. The environment variable
   `CODEBOT_AUTH_API_URL` overrides the saved address (the field is then read-only).
   `CODEBOT_REMOTE_SIGNAL_URL=wss://signal.example.com/v1/signal` still comes from the environment.

   Sign-in is optional (decision D9, PRD 11.7). With no address saved the app makes no request to any account
   service and works with a local profile. Sign out returns to the local profile; the saved address stays. When
   Nextcloud disables the user, the next check of the service answers 401 and the app signs out.

A ticket for your Signal is signed with your key. A Signal that you do not run cannot accept it, and your
Signal accepts no ticket from another key set.

## Access ends when Nextcloud removes a user (PRD 11.5)

- The service stores the refresh token of each user, encrypted with `ACCOUNT_SECRET_KEY`.
- Every `ACCOUNT_REVALIDATE_SECONDS`, and before any request that is older than `ACCOUNT_TICKET_FRESHNESS_SECONDS`
  since the last confirmation, it uses the refresh token and reads the user at Nextcloud. A token that is
  revoked, a user that is missing and a user that is disabled all end the access.
- When access ends, the service marks the identity blocked, deletes the stored token, revokes every session and
  phone link of the user, ends the remote sessions, raises the `authEpoch` of the hosts that the user owns (so
  that they get no new ticket), and sends signed events to Signal. Signal closes the sockets of the user and the
  hosts at once.
- The user keeps the account record. When Nextcloud enables the user again, a new sign-in gives the same account
  back.
- When Nextcloud does not answer (network error, Nextcloud down), the access stays for
  `ACCOUNT_REVALIDATE_GRACE_SECONDS` after the last confirmation. After that, the service answers 503
  `identity_provider_unreachable` with `Retry-After`, and it does not block the account. Nothing is deleted.

## Secret key

`ACCOUNT_SECRET_KEY` encrypts the refresh tokens. The service writes a check value at the first start and
refuses to start with another key (exit code 78). If you lose the key, start once with
`ACCOUNT_REPLACE_SECRET_KEY=true` and the new key: every session ends, every identity is blocked with the
reason `key_replaced`, and each user signs in again and keeps the same account. Then remove the variable.

## Data and backup

`ACCOUNT_DATA_DIR` holds `account.sqlite` (with `-wal` and `-shm` files while the service runs) and
`blobs/avatars`. Back up the folder, `ACCOUNT_SECRET_KEY` and the ticket key pair. Stop the service or use
`sqlite3 account.sqlite ".backup <file>"` for a consistent copy.

## Who sees which data (PRD 11.6, service part)

A user sees and changes only the hosts where it has a membership, and only with the role of that membership
(owner, admin or member). Another user gets 403 or 404 on the host, its members, its invitations and its
sessions. A removed member loses the host. Chats and projects stay on the computer or host of the user; the
account service never holds them.

## Routes

The Bun router serves the kept routes of the upstream account API unchanged: the list is
`ROUTE_FILES` in `apps/auth-api/src/bun/routes/remote-access.ts`. The sign-in routes are new
(`/v1/auth/config`, `/v1/auth/oidc/start`, `/v1/auth/oidc/callback`, `/v1/auth/oidc/exchange`,
`/v1/auth/device/start`, `/v1/auth/device/poll`, `/device`). The phone and the desktop use the device flow when
the app cannot open a browser.

## Tests

All tests start the real service and a mock provider. They write `.codebot-build/<name>/report.json`.

| Command | What it checks |
| --- | --- |
| `bun run test:account-login` | Sign-in with the mock provider in both modes: redirects, PKCE, device flow, faults |
| `bun run test:account-user-disabled` | Encrypted token at rest, timer, check before a request, disabled and removed users, Signal events, grace time, secret key |
| `bun run test:account-remote-access` | Hosts, invitations, members with no plan limit, sessions, tickets, removed routes, isolation between users |
| `bun run test:account-signal` | The real Signal service with the account service: tickets, TURN credentials, access ends when the user is disabled |
| `bun run --cwd apps/auth-api test` | Migrations, including the CodeBot chain `migrations-codebot/` |

## Limits that remain

- Not tested against a real Nextcloud.
- Push relays for iPhone and Android (APNs and FCM) and the Slack, Discord, Telegram and GitHub connectors need
  secrets that only the upstream project has. Their routes are not served.
- Transfer of host ownership works by email and is not served.
