# Troubleshooting CodeBot

## CodeBot says agent CLI setup is required

Open Terminal and verify the CLI:

```bash
codex --version
```

If the command is missing, install Codex using the official installer:

```bash
curl -fsSL https://chatgpt.com/codex/install.sh | sh
```

Then run `codex login`, sign in with ChatGPT, fully quit CodeBot, and open it again. To use OpenAI
API credits instead of a ChatGPT plan, select Add key under API key in Settings > Providers > ChatGPT,
or run `printenv OPENAI_API_KEY | codex login --with-api-key`.

You can use Claude instead. Verify and install Claude CLI:

```bash
claude --version
curl -fsSL https://claude.ai/install.sh | bash
claude auth login
```

If Codex is installed in a non-standard location, launch CodeBot with `CODEBOT_CODEX_PATH` set to the
absolute Codex executable path.

For a non-standard Claude location, set `CODEBOT_CLAUDE_PATH` to the absolute Claude executable path.

## The Linux AppImage exits immediately

On Ubuntu 23.10 or newer and on Debian 13, unprivileged user namespaces are restricted by AppArmor.
The Electron sandbox is built on one, so CodeBot exits during launch and writes a message about the
SUID sandbox or a user namespace to the terminal.

Install the AppArmor profile that ships with CodeBot, then reload AppArmor:

```bash
sudo install -m 0644 build/linux/codebot.apparmor /etc/apparmor.d/codebot
sudo systemctl reload apparmor
```

The same file is inside the AppImage at `resources/linux/codebot.apparmor`. The profile attaches to
the usual places to keep an AppImage; if yours is somewhere else, edit the path in the profile before
you install it.

Do not start CodeBot with `--no-sandbox`. It is not a supported workaround. The sandbox is the
boundary between a web renderer and the rest of your computer, and CodeBot gives its agents full
local access on the other side of it.

## The Linux AppImage says that no fusermount binary was found

The AppImage mounts itself with FUSE. It does not need libfuse2, but it needs the `fusermount3`
program. Install the `fuse3` package (`sudo pacman -S fuse3` on Arch Linux and Omarchy,
`sudo apt install fuse3` on Ubuntu and Debian), then start the AppImage again. With no FUSE, such
as in a container, start it with `--appimage-extract-and-run`.

## Remote desktop is missing on Linux

Remote desktop on Linux needs the x64 AppImage and an X11 session. Sunshine captures the X11 screen
and sends mouse and keyboard input through the XTest extension. Under Wayland, or with no `DISPLAY`,
remote desktop reports that it needs an X11 session. Log in with an Xorg session, or start CodeBot
under `xvfb-run` on a server. The arm64 AppImage does not include the runtime.

## Voice prompts fail on an older Linux

The voice runtime of the x64 AppImage needs glibc 2.32 or later, such as Ubuntu 22.04 or Debian 12.
On Ubuntu 20.04 or Debian 11, the dictation model downloads, but the runtime does not load, and
voice prompts show an error. Use a newer distribution. The arm64 AppImage needs glibc 2.17 or later.

## CodeBot is slow or stops because of the GPU on Linux

On Linux, CodeBot uses the GPU until the GPU fails on your computer. If the GPU process crashes, or a
start stops in its first 30 seconds, CodeBot writes `gpu-crash.json` or `gpu-start.json` in
`~/.config/CodeBot`. While one of these files is there, CodeBot renders on the CPU. A start that
stops with no crash, for example a kill or a power loss, gets one more try with the GPU; a second
stop in a row turns it off. An update with a new Chromium version tries the GPU again. CodeBot
ignores these files when CodeBot 0.75.0 or earlier wrote them: those versions could write them by
mistake after a reboot or a GPU reset. A GPU process restart after a lost GPU context, for example
after suspend, does not count. A GPU process that stops while CodeBot quits or the computer shuts down
or restarts does not count either. A server (`CODEBOT_SERVER=1` or a hosted server) always renders on the
CPU, and its browser runs WebGL on the CPU (SwiftShader) for sites such as the Figma editor. A GPU
process crash on a server writes `gpu-crash.json` and turns off WebGL at the next start. Chromium
also renders on the CPU when it blocks the GPU driver, for example in a remote desktop.

When CodeBot renders on the CPU, dialogs and panels do not blur what is behind them, agent
avatars do not move, and a theme change does not show its sweep. These effects used the most CPU time.
The agents' browser keeps WebGL on the CPU (SwiftShader), so sites such as CapCut and the Figma editor
still open.

On a Wayland session, a start that renders on the CPU opens CodeBot again on XWayland: on Wayland,
Chromium can leave the window empty, and KDE then shows only a 1x1 taskbar entry. The log then shows
"Software rendering is on, so CodeBot uses XWayland". Without XWayland (no `DISPLAY`), CodeBot stays
on Wayland. To stay on Wayland, start CodeBot with `--ozone-platform=wayland`.

- To try the GPU again, for example after a driver update, remove the file. The log names it.
- To always use the GPU, start CodeBot with `CODEBOT_DISABLE_GPU=0`. A server ignores this value.
- If CodeBot stops at each start, start it with `CODEBOT_DISABLE_GPU=1` to always render on the CPU.
  This value also turns off WebGL.

## CodeBot does not start on Linux when the monitor is off

On Wayland, Chromium waits until a monitor is on before it opens a window. When CodeBot starts and
the Wayland session has no monitor, for example after an automatic update, CodeBot starts again on
XWayland. The log then shows "The Wayland session had no monitor". The window shows through XWayland
when a monitor comes on, and the next start uses Wayland again.

- If the session has no XWayland (no `DISPLAY`), CodeBot starts when a monitor is on.
- To always use XWayland, start CodeBot with `--ozone-platform=x11`.

## Computer Use is unavailable

Computer Use needs the `cua-driver` binary. An installed release carries it, so the panel reporting
a missing driver means a development build, or a file that was removed. On macOS it also needs the
Screen Recording and Accessibility permissions; Windows and Linux ask for no permission, so there a
driver that answers is ready. CodeBot starts the driver itself; it does not bypass the macOS prompts.

If an installed release reports that the driver is missing, reinstall a complete CodeBot package,
then start CodeBot again. Keep your CodeBot data folder. A separate driver installation cannot
repair an installed release, because the application uses only its bundled driver.

In a development checkout, run `bun run prepare:cua-driver`, then press **Try again** in the panel.
This command writes the same pinned build the release ships.
`bun run cua-driver:doctor` reports which binary CodeBot would use, and `CODEBOT_CUA_DRIVER_PATH`
selects a different one. The installed application ignores that variable: it runs only the driver it
was released with.

On Linux the driver reads the desktop through AT-SPI, so it needs the session bus of the desktop it
is to drive. A daemon started from a container, from `runuser`, or as root against another user's
session finds an empty accessibility tree, and `get_window_state` reports `degraded`. X11 is the
driver's fully supported Linux session. On Wayland CodeBot starts the driver with
`CUA_DRIVER_RS_ENABLE_WAYLAND=1`; set that variable yourself to `0` if your compositor works better
through XWayland. Window rectangles under GNOME also need the driver's own `winrects@cua` shell
extension, which its installer refreshes but does not enable for you.

If the panel reports that permissions are needed, open **System Settings → Privacy & Security** and
grant both **Screen & System Audio Recording** and **Accessibility**, then press **Check again**. A
development build asks for the grants as **Electron**, not as CodeBot, because the development binary
is the responsible process. For the same reason a development grant does not carry over to an
installed release, and each build must be granted once.

## Computer Use is slow

A Computer Use step has two parts: the driver does the action, and then the model reads the result
and chooses the next action. While the driver works, the activity line in the chat shows **Using an
app on this computer…**. While the model works, it shows **Deciding the next step in the app…**.
When the agent writes its own progress note, the line shows that note instead. When the line stays
the same for 5 seconds, the time since it changed shows next to the text.

A driver call usually takes a few seconds or less. To see the time of each call, start CodeBot from
a terminal. Each driver call that takes 5 seconds or more shows in its output as `Computer Use
driver answered`, with the tool name and the milliseconds. A call that gets no answer before the
agent closes the connection shows as `Computer Use driver did not answer`. Set
`CODEBOT_LOG_LEVEL=debug` to show every call. The log does not contain what the agent typed.

Most of the time in a slow step is the model. Its time depends on the model and on the reasoning
effort in the agent settings: a high effort can use tens of seconds before each action. For
mechanical GUI tasks, select a lower effort or a faster model. Name the application and the action
in your request, for example "In Safari, open https://example.com", so the agent does not look for
the target first.

A step also gets slower as the conversation gets longer. The model reads the full conversation
before each action, and each window read stays in it. When the conversation fills the model's
context, the provider compacts it: it writes a summary, which can take minutes, and the chat
shows no action in that time. A new conversation for a new GUI task does not have this cost, and the
agent keeps its workspace. With OpenCode, CodeBot adds a JSON copy of each driver result
to the result text, because OpenCode shows the model only the text. The copy leaves out the element
list, because the tree in the text already names each element by its index.

## A chat is missing after an update

Do not follow the reset steps below. Your messages are stored in one SQLite file, nothing copies it
before an upgrade, and moving that folder puts the only copy out of reach.

Quit CodeBot and start it again first. On launch CodeBot gives a chat back to the agent it belongs to
when an agent and its chat lose track of each other, so a restart recovers most cases on its own.

If the chat is still missing, quit CodeBot and read the file directly. This reports chats that no
agent currently claims, and the number of messages waiting in each:

```sh
sqlite3 "$HOME/Library/Application Support/CodeBot/codebot.db" \
  "SELECT t.thread_id, t.agent_id, (SELECT count(*) FROM projection_thread_messages m
     WHERE m.thread_id = t.thread_id) AS messages
   FROM projection_threads t
   LEFT JOIN projection_agents a ON a.agent_id = t.agent_id
   WHERE a.agent_id IS NULL;"
```

Any row means the messages are still on disk and are recoverable. Report the output with the details
below, and keep the folder where it is until then.

## CodeBot will not start and names a stored agent profile

The message reads `Stored agent profile <id> has an unreadable "<field>" value`. Your data is intact:
CodeBot stops before it writes anything, which is what keeps the profile as it is.

Do not follow the reset steps below, and do not move the folder. Install the current version first:
CodeBot now repairs a stored profile field it cannot read and keeps the agent, its chat and its
workspace, while a release from before that repair refuses to start over the same profile.

If the current version still stops, quit CodeBot and read the profile it names. On macOS:

```sh
sqlite3 "$HOME/Library/Application Support/CodeBot/codebot.db" \
  "SELECT agent_json FROM projection_agents WHERE agent_id = '<id>';"
```

On Windows, the same file is at `%APPDATA%\CodeBot\codebot.db`.

Report the field the message names, together with the details below. The output holds your own file
paths, so review it before you publish it.

## CodeBot did not open, several times in a row

When one version stops before it opens several times in a row, the next start shows a recovery
window. Your local data was not reset or overwritten. The window lets you try again, export the
diagnostics, open the data folder, or download a version.

The window offers the previous version only when that version can open your data. Each version
keeps a list of the database changes that it knows, and a version cannot open data that a newer
version changed. CodeBot reads the newest change in your data, without a write, and compares it with
the last version that opened. When that version cannot open the data, or when CodeBot is not sure,
the window offers the latest version instead. An older version would only stop again with the
message below.

## CodeBot says a newer version saved your data

An older CodeBot started after a newer one opened your data, for example from an old shortcut or a
second installation. An older CodeBot cannot read data that a newer one updated, so it stops before
it writes anything. Your data is intact.

Do not follow the reset steps below, and do not move the folder. When in-app updates and automatic
downloads are on, CodeBot installs the latest version and opens again. Otherwise, or when the
update fails, install the latest version from [openbot.run/download](https://openbot.run/download).

When the latest version is the one that did not open several times in a row, CodeBot does not install
it again. It says that the latest CodeBot did not open, and it keeps your data as it is. Install a
version newer than the one it names when one is available on the
[releases page](https://github.com/nightly-labs/openbot/releases), and report the problem with the
details below.

Then remove the older copy. On Windows, look for a second CodeBot in Settings → Apps, and pin the
new CodeBot again if a taskbar or desktop shortcut opens the old one. Older versions show the
message `CodeBot database version <n> is newer than this application supports (<m>).` The same
steps apply.

## Routines do not run while the computer sleeps

A routine runs only while the computer is awake and CodeBot is open.

- After a sleep, each overdue routine runs one time, when the network is back. CodeBot does not run
  each occurrence that it missed.
- After CodeBot was closed, the routine setting "If CodeBot was closed at the scheduled time"
  decides: skip the run, or run it one time when CodeBot opens.

On macOS and Windows, turn on Settings → App behavior → **Keep this computer awake**. While the computer
is connected to power, it then does not sleep when idle. The display can still turn off. A closed
laptop lid, or a sleep that you select, still sleeps the computer, unless macOS uses an external
display (closed-display mode). On battery power, the computer sleeps as usual, unless you also turn
on **Also on battery**.

`pmset -g assertions` can show an CodeBot entry named `WebRTC has active PeerConnections`. It
exists only while another device is connected to this computer, so the computer can sleep after that
device disconnects. With the setting on, the entry is named `Electron`.

To see when a Mac slept, run `pmset -g log | grep -E " Sleep | Wake "`. `logs/main/main.log` (see
[Report a problem](#report-a-problem)) has a `Keeping this computer awake.` line when CodeBot
starts to keep it awake. For routines that run when no computer of yours is on, use a
[hosted server](hosted-servers.md) or a [self-hosted server](self-hosted-server.md).

## A company firewall or proxy blocks CodeBot

Sign-in shows "A firewall or proxy on this network blocked CodeBot from reaching `<host>`" when a
network filter, such as Fortinet, answers in place of the CodeBot service. This occurs when the
filter shows a block page, or when it inspects TLS with a root certificate that the computer does
not trust.

CodeBot trusts the root certificates in the operating system store, as a browser does. If the
company installs its inspection certificate on the computer, CodeBot accepts it. Agent CLIs that
CodeBot starts, such as Codex and Claude, check certificates by their own rules. Do not turn off
certificate checks to work around a block.

Ask the network administrator to allow these hosts over HTTPS (TCP 443) and WebSocket:

| Host | Use |
| --- | --- |
| `api.openbot.run` | Accounts, sign-in, teams, and hosted servers |
| `signal.openbot.run` | Connection setup for teams and remote servers |
| `openbot.run` | Public site and images in invitation emails |
| `*.openbot.run` | Hosted servers and sites, and `analytics.openbot.run` |
| `github.com`, `*.githubusercontent.com` | App updates |

Teams and remote servers also send WebRTC traffic to the other device or to the TURN relay that
Signal names, on the UDP and TCP ports that it names. A filter that blocks WebRTC makes these
connections slow or stops them. Conversations stay on the computer; the [privacy policy](../PRIVACY.md) lists what each
host receives.

If the filter puts `openbot.run` in a blocked category, the administrator can ask the vendor to
review it. For Fortinet, use the FortiGuard web filter lookup.

## A server connects slowly through a VPN or proxy app

A proxy app, such as Clash, Mihomo, Shadowrocket, or Surge, can send CodeBot traffic through a
remote proxy. Many proxies do not carry UDP. Then the connection to a joined server uses a slower
path, it fails more frequently, and it must reconnect more often when you open the app again.

Send CodeBot traffic directly, not through the proxy. Add this rule above the other rules of the
proxy app:

```text
DOMAIN-SUFFIX,openbot.run,DIRECT
```

If the app uses fake-IP DNS, also add `+.openbot.run` to the fake-IP filter (`fake-ip-filter` in a
Clash or Mihomo configuration). Then the connection uses the real addresses of the CodeBot hosts.

This rule covers sign-in, Signal, and the TURN relays. It does not cover a direct path to the
server, because that path uses an address, not a name. When the direct path fails, CodeBot uses a
TURN relay.

## Reset CodeBot

Quit CodeBot before moving data. To reset application state and the shared browser profile while
keeping agent workspaces, move this folder somewhere safe:

```text
~/Library/Application Support/CodeBot
```

To also reset agent workspaces, managed transfers, and downloads, move this folder as well:

```text
~/CodeBot
```

CodeBot creates fresh folders on the next launch. Review and back up their contents first. Do not
remove `~/.codex` or `~/.claude` unless you intentionally want to manage CLI login and history.

## Uninstall

Quit CodeBot. On macOS remove `CodeBot.app` from Applications; on Windows use the installer's
uninstaller; on Linux delete the AppImage, `~/.local/share/applications/codebot.desktop`,
`~/.local/share/icons/codebot.png`, and `/etc/apparmor.d/codebot` if you installed the profile. If
you also want to remove local CodeBot data, follow the reset steps above. Agent CLIs and their data
are independent and are not removed with CodeBot.

## Report a problem

Use the [bug report form](https://github.com/nightly-labs/openbot/issues/new?template=bug_report.yml)
for reproducible bugs. It asks for the platform, the CodeBot version (Settings → Updates on the
desktop), the operating system and hardware, the provider and its CLI version, the steps, and the
expected and actual results. When a provider row shows an error, select **Copy diagnostics** in its
menu and paste the result into the form.

For a problem in the iPhone or Android app, use the
[mobile app bug report form](https://github.com/nightly-labs/openbot/issues/new?template=mobile_bug_report.yml).
It asks for the full app version line from Settings → About. Settings → Support → **Save log file**
makes a log that you can attach. Attach it for a connection or network problem: we will most
probably close such a report without it.

Never publish tokens, `~/.codex`,
`~/.claude`, conversations, private files, Electron user data, or full unreviewed diagnostics.

When the desktop app closes by itself, look in the `logs` folder of its user data
(`%APPDATA%\CodeBot\logs` on Windows, `~/Library/Application Support/CodeBot/logs` on macOS,
`~/.config/CodeBot/logs` on Linux):

- `main/main.log` has a `Quitting: <reason>.` line when CodeBot quit by itself or was closed.
- `trace.ndjson` has an `exit` line with the same reason, and a `crash` line for each renderer or
  helper process that stopped.

When CodeBot or a server freezes again and again, `stall-profiles.ndjson` in the same folder has a line
for a minute in which the main process stopped for 2 seconds or more, twice in a row. The line names
the CodeBot functions that used the time (`top`) and their callers (`stack`). It holds no paths and
none of your data, so you can attach it to a report.

A dump in the `Crashpad` folder next to `logs` means a process crashed. Tell us that a dump exists,
but do not attach it publicly: it can hold secrets. When neither file has a reason and there is no
dump, something outside CodeBot stopped it.
