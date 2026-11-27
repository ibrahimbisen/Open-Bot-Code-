# CodeBot Mobile

React Native app built with Expo SDK 58, Expo Router, TypeScript 7, Biome, and Bun. The app uses Expo Continuous Native Generation, so native `ios/` and `android/` directories are intentionally not committed.

## Requirements

- Node.js 24 or newer (the repository pins 24 in `.nvmrc`)
- Bun 1.4.2 (the version in the root `packageManager`)
- Expo Go for device testing, including the WebRTC server connection

## Self-hosted services

The app has no built-in server address. It talks to the services of your home server:

- The account service (`apps/auth-api`, Bun and SQLite). The user signs in with Nextcloud: the app opens the
  browser sheet of the account service, Nextcloud asks for the user name and password, and the app gets a
  session through the PKCE exchange (`/v1/auth/oidc/start` and `/v1/auth/oidc/exchange`, return link
  `codebot://auth`). There is no email-code sign-in and no company sign-in.
- Signal and TURN (`remote/`). The account service gives the Signal address in each session ticket, and Signal
  gives the TURN servers and their credentials. A Signal address set in Settings > Connection replaces the one in
  the ticket.

The address of the account service comes from the first sign-in (or a QR code of the desktop app, which carries
its own address). It is stored in the secure store of the phone. A build can give defaults with these public
build variables; with none, the sign-in screen asks for the address:

| Variable | Meaning |
| --- | --- |
| `EXPO_PUBLIC_CODEBOT_API_URL` | Default address of the account service, for example `https://account.example.com` |
| `EXPO_PUBLIC_CODEBOT_SIGNAL_URL` | Default Signal address, for example `wss://signal.example.com/v1/signal` |
| `EXPO_PUBLIC_CODEBOT_UPDATE_URL` | Optional page that the "update required" screen opens |
| `EXPO_PUBLIC_CODEBOT_DOWNLOAD_URL` | Optional link that the "share the app" quick action sends |

An address must use `https`, or `http` for a host of a local network. Test: `bun run test:mobile-account`.

## Development

The repository uses Bun’s hoisted linker so native Expo modules resolve to one installation.
React Native Skia 2.14 needs no install step. CocoaPods copies its prebuilt libraries from the
`react-native-skia-apple-*` packages, and Gradle reads them from `react-native-skia-android`.

EAS profiles pin Bun 1.4.2 to match the root `packageManager`. Use the same Bun version
locally: dependency paths and package patch metadata affect the runtime fingerprint.
After switching from the isolated linker to the hoisted linker, move the old
`apps/mobile/node_modules` directory out of the app and run `bun install --frozen-lockfile`
from the repository root. A normal install can retain old workspace symlinks and cause
the local fingerprint to differ from the clean EAS installation.

Expo 58.0.25 is patched in `patches/expo@58.0.25.patch` so a DOM component ignores a props
message that it sends before Android mounts its web view, or after Android removes it. Android
rejects these calls, and the rejection shows as a console error. The DOM component asks for the
props again when it is ready.

expo-splash-screen 58.0.14 is patched in `patches/expo-splash-screen@58.0.14.patch` so Android 12
and 13 get no splash exit animation listener. With the listener, the platform hides the starting
window on the first draw, and the app crashes when that window is already gone. Gradle links the
prebuilt AAR of an Expo module and ignores a patch to its Kotlin source, so
`expo.autolinking.android.buildFromSource` in `package.json` builds `expo-splash-screen` from source.
A patch to the native code of another Expo module needs the same entry. iOS also links precompiled
Expo modules by default, so a patch to Expo Swift code needs `expo.autolinking.ios.buildFromSource`.

@react-native-masked-view/masked-view 0.3.2 is patched in
`patches/@react-native-masked-view%2Fmasked-view@0.3.2.patch` to change only its TypeScript types. They
extend `NativeMethods`, which React Native 0.87 removed from its types, so `MaskedView` was not a
valid JSX component. Remove the patch when a release fixes the types.

react-native-screens 4.30.1 is patched in `patches/react-native-screens@4.30.1.patch` so the full
screen swipe back of a chat waits for a gesture handler pan in the top screen to fail. The swipe back
starts anywhere in the chat, and a swipe to the right on a message bubble still replies. Without
the patch, no rule sets which of the two recognizers gets the swipe. Remove the patch when a
release sets this failure requirement.
If a row or pinned avatar is tapped during the native return transition, the app retains that
tap until the list is focused and `transitionEnd` fires. It then invokes the original Link
handler once, without a fixed delay.
Focus is read from the route's live `isFocused()` state; nested navigators do not always emit
an initial `focus` event, so a first tap must not depend on receiving one.

Keyboard Controller 1.22.7 is the version that Expo SDK 58 pins for Expo Go. Custom development clients and
standalone apps must be rebuilt after adding this native dependency; a JavaScript reload alone
cannot add it to an existing binary. All channels use the fingerprint runtime policy, so these
updates cannot target older app-version `1.0.0` binaries without Keyboard Controller. Build and
distribute a binary with the new fingerprint.

Run commands from the repository root:

```bash
bun run mobile
bun run mobile:ios
bun run mobile:android
```

Choose an iOS command:

| Repository root | `apps/mobile` | Integration |
| --- | --- | --- |
| `bun mobile:ios` | `bun ios` | No RocketSim installation required |
| `bun mobile:ios:rocketsim` | `bun ios:rocketsim` | Start RocketSim and enable Connect |

Both commands apply the iOS config plugins without clearing the native directory,
then build and launch the app with Expo. Expo arguments such as `--device` and
`--port` pass through. The RocketSim command requires the app in `/Applications`
or `~/Applications`, or `ROCKETSIM_APP_PATH` set to its `.app` directory. If it is
missing, the command stops with setup instructions. The standard command does not
look for RocketSim, even if `ROCKETSIM_APP_PATH` or the old `CODEBOT_ROCKETSIM`
variable is set.

A build for an iPhone signs all targets with the Apple team of `ios.appleTeamId` in `app.json`, so
Expo does not ask for a team. To build with a different team, change that value on your computer and
do not commit it: the app config is in the runtime version.

The iOS commands keep the Xcode build in `ios/DerivedData`, not in
`~/Library/Developer/Xcode/DerivedData`, so removing a worktree removes its build. Do not remove
`ios/build`: CocoaPods writes codegen output there. When that output is missing, `bun mobile:ios`
installs the pods again. Metro keeps its file map cache in `.expo/metro-file-map` of the worktree.

`bun mobile:android` also applies the config plugins without clearing `android/`, then runs
`expo run:android`. Three local settings make a build in a new worktree faster:

- A release variant builds native code only for the ABIs of the connected devices and running
  emulators, not for all four. Pass `--all-arch` to build every ABI.
- The local `android/gradle.properties` gets `org.gradle.caching=true`. Worktrees share Gradle task
  outputs in `~/.gradle/caches/build-cache-1`. The app config, fingerprint and EAS builds stay the
  same.
- `CCACHE_BASEDIR` and `CCACHE_NOHASHDIR` let ccache share C++ results between worktrees. Install
  ccache with `brew install ccache`. React Native uses it for the app CMake project when it is on
  `PATH`, and `CMAKE_C_COMPILER_LAUNCHER` and `CMAKE_CXX_COMPILER_LAUNCHER` add it to the CMake
  projects of the libraries, such as Reanimated, Worklets, Expo modules and Skia.

The first build in a new worktree also reuses the work of other worktrees through two shared caches
in `codebot-mobile-cache.noindex` of the common git directory (`git rev-parse --git-common-dir`), on
the disk of the main checkout. `CODEBOT_MOBILE_BUILD_CACHE=<directory>` puts them in another
directory; a relative path starts at the checkout root. `CODEBOT_MOBILE_BUILD_CACHE=off` turns them
off. You can remove the directory at any time.

- `metro/`: Metro transforms of all mobile commands (`metro-cache.js`). Each set of mobile
  dependencies in `bun.lock` and their patches has its own namespace, because the Metro cache key
  does not include the versions of the Babel plugins. Packages that only other workspaces or the dev
  dependencies of the app use are not in the namespace. When `bun.lock` or a patch is newer than the
  last `bun install` (`node_modules/.codebot-install-stamp`), Metro warns and does not use the shared
  cache. A namespace that no worktree used for 14 days is removed. A transform that contains the
  path of the checkout, such as a `use dom` component, stays in `.expo/metro-cache` of the worktree.
  The entries use the file store of `@expo/metro-config`, which writes each entry to a temporary file
  and renames it, so several Metro processes can use one namespace. The store is not a public export
  of Expo: when Expo moves it, Metro warns and does not use the shared cache. Uniwind replaces the
  Metro cache stores with one in the system temporary directory, so `metro.config.js` sets them
  again; EAS builds keep the store of Uniwind. React Native's build scripts and the early bundle of
  `expo run` clear the Metro cache before each release bundle; `bun mobile:ios` and
  `bun mobile:android` keep it. `bun mobile -- --clear` clears the namespace for all worktrees.
- `xcode/`: the Xcode compilation cache of `bun mobile:ios` (Swift, Objective-C and C++). Prefix
  mapping replaces the checkout path and its real path with `/^codebot` in the cache keys, in the
  debug info and in `__FILE__`. Only the `xcodebuild` build command (with `-destination`) gets these
  settings. Xcode removes old entries above 20 GB.

The local launcher enables RocketSim Connect in the local native project. The config plugin
loads it before React Native starts, only in Debug builds on the iOS Simulator.
It does not copy the framework into the app. Release builds and physical devices
cannot load it. A normal prebuild without the launcher removes the hook, as does
`bun ios`. Switching back to the standard command removes the previous Connect
hook before building. It does not close the RocketSim Mac app. The installed Debug
simulator app built with `ios:rocketsim` can also reconnect
when opened from its icon while RocketSim is running.

In RocketSim, select a camera source and allow camera access when macOS asks.
Allow local network access if requested. Camera and Network Monitor need Connect;
network speed control also needs RocketSim Pro and approval of the Network Extension
in RocketSim's Networking window. These OS approvals require user interaction.
Network Monitor does not establish that WebRTC DataChannel traffic is visible.
See [RocketSim Connect setup](https://www.rocketsim.app/docs/getting-started/setting-up-rocketsim-connect/).

Verified with RocketSim 16.4.6 (332), Expo SDK 57, and the iOS 26.5 iPhone 17 Pro
simulator: the app builds, starts Metro, and loads the Connect framework. Camera
startup then hit an uncaught exception inside RocketSim's `AVCaptureSession rs_stopRunning`:
`stopRunning may not be called between calls to beginConfiguration and commitConfiguration`.
Camera operation is therefore not verified with this combination. Use
`bun ios` if this occurs. The CLI also rejects network speed
control with `pro_required` when RocketSim Pro is unavailable.

For an Expo Go device outside the computer's trusted local network context, start Metro with a secure
tunnel:

```bash
bun run mobile -- --tunnel
```

The native UI does not depend on a native WebRTC module. A hidden Expo DOM component owns the browser
`RTCPeerConnection` and its authenticated DataChannels, then forwards validated commands and live
events to React Native. This keeps the production transport identical while remaining testable in
Expo Go without a development build. Expo Go on Android does not include `@expo/dom-webview`, so there
the component uses `react-native-webview`. Native builds link that package for HTML pages
(`html-page-view.native.tsx`), and iOS also uses it for the PDF preview (`pdf-preview.ios.tsx`). An Android
build from before it was linked shows HTML pages with no scripts.

Remote connection recovery starts the first attempt immediately, then waits 10 seconds after each failure. After
five failures it waits two minutes before starting a new series. The agent list shows `Reconnecting`
beside the server-list button in the header, with a smaller attempt counter and retry countdown below.
The status disappears once connected. Chat shows a compact, centered `Reconnecting · x/5 · m:ss`
above the composer, with the same animated digits and no banner. The composer and status float over
the message list on a transparent layer; bottom spacing keeps the last message clear of the controls.
The composer and status track interactive keyboard dismissal through `KeyboardStickyView`;
`KeyboardChatScrollView` uses the same native keyboard frames for message insets and scrolling.
There is no additional `KeyboardAvoidingView` or keyboard-event timer in the chat. The status disappears
after reconnecting. Countdown ticks are local UI
updates, not requests. Backgrounding suspends retries. Returning reuses the existing peer and reloads
workspace data silently. A healthy connection stays online and usable during this check; returning
does not show `Reconnecting` or disable sending. These reads use the existing WebRTC connection,
without creating an account session or ticket. The required compatibility read has a three-second deadline; a silent peer is closed
and its first replacement starts immediately. RTC disconnections keep their five-second recovery grace
period. A previous failed connection attempt keeps its retry deadline across app switches. A successful
connection resets the counter. Dead
WebRTC peers are discarded and authenticated again. Recovery reloads cached conversations as well
as agents and unread counts, including after an event-buffer reset. An interruption of Signal alone
can resume sooner while the authenticated WebRTC connection is still healthy, without a new ticket.

Chat links use a local link icon, with a smaller icon in thought-process text. Rendering links
or Markdown images does not contact their destinations; they open only on tap.

The Bloub loading overlay first renders a single idle pose. After commit, the animation provider
prepares one shared 30 fps sequence in idle batches of at most four frames. Hidden loaders and
reduced-motion mode do not start that work. Exit geometry is prepared the same way while holding
the current pose, then settles to idle before scaling down; unfinished preparation is cancelled
when no longer needed.

Working avatars also prepare their sequences in idle batches of at most four frames, sharing
both pending work and cached geometry across presentations. They hold the idle pose until ready;
leaving the screen or ending activity unsubscribes, cancelling preparation when no player needs it.
Returning to idle uses the same bounded scheduler and holds the displayed pose until ready;
resuming activity or unmounting cancels the pending return.

Streaming Markdown reveals words only for messages up to 2,000 characters. Longer responses
show incoming text directly, avoiding a full Markdown parse for every additional word reveal.

Structured question forms appear inline in mobile chat, including when reopening downloaded history.
They support option selection, multiple questions, skipping and cancellation. Custom answers are typed
in the main chat composer and sent to the current form question, rather than posted as chat messages. Responses
use the existing `/v1/prompts/respond` endpoint over the authenticated desktop connection; conversation
updates synchronize their resolution across devices. Offline forms are disabled, failed submissions
can be retried, and completed or expired forms cannot be submitted again. Private answers use a
secure input and are omitted from the local completion summary; unsent drafts stay in component memory.

When no agents have loaded and the selected server is connecting or offline, the agent list shows
`Waiting for connection`. The empty-server prompt appears only once the server is online; agents
already loaded remain visible during reconnection.

The phone keeps an encrypted copy of the agents, hidden agents, sections, latest chat pages,
channels with the latest 50 messages of each opened channel, capabilities and last drawer values (`drawer-snapshot.ts`) of each server (`workspace-cache.ts`),
and writes it when a server load ends and when the app goes to the background. It also keeps the
last server list of the account service. After a start, the servers of that list connect at once,
before the account service answers; a server whose key is not the key that the phone trusts waits
for the account service. Its list then replaces the copy: it removes a server that the account
left. A server shows its copy at once, and its first connection attempt is quiet for 5 seconds, as
a return to the app is. The first workspace reads go out with the compatibility read when the copy
has the capabilities. The UI does not mark the copy: a server that takes longer shows the usual
reconnect status and faded avatars. Its own reads then replace the copy. Sign-out, an expired
session and the removal of a server delete it.

The first connect of each server asks the account service for its logical session while the hidden
peer page loads (`remote-team-transport.tsx`). The account service gives the active session again, so
the peer then asks only for its ticket. After a return to the app, the other servers wait for the
selected server for up to 3 seconds. A failed attempt of the selected server, or its host that
Signal reports offline, ends this wait.

While a server is disconnected, its agent avatars and colored chat bubbles fade locally with the same
280 ms transition. Voice controls and suggested prompts are disabled until the server is online. The
chat input and attachments stay usable: a sent message goes to the phone's outbox and is drawn
lighter. One line under the last waiting message says `Sends when the server is online`, and touch
and hold on a waiting message opens the native context menu with Edit and Don't send. While the
history waits for the server, `Waiting for connection` shows under the reconnect status above the
composer; in the chat that status shows only the attempt and the countdown. The outbox is saved per account in the app's documents,
so it survives a restart. Each chat sends its messages one at a time and in order while its server is
online. An agent message carries a `clientMessageId` when the host advertises `message-client-id-v1`,
and a channel message uses the same id as its `operationId`, so a repeat after a lost reply stores
the message once. A message that the host refused shows `Not sent`, and its menu adds Retry; it holds
the later messages of its chat. A message that the host may have stored is not repeated when
the host cannot drop a repeat, or 12 hours after its first attempt; it shows `Not confirmed`. This
visual state is derived only in the mobile UI: it never changes the agent's synced avatar profile or
sends appearance updates over RTC.

Invitations pin the desktop public key before acceptance. Pins are stored in the device Keychain /
Keystore, scoped to the account service and user, and checked on later directory refreshes. Joining
installs the validated host immediately; a subsequent directory-refresh failure does not undo a
successful join or require reusing the one-use invitation.

After Mobile Connect has enabled publishing, restarting the development desktop restores its
WebRTC host as well as its local HTTP API. A local-only `online` status is not enough for mobile
connections. The separate development test client never auto-publishes.

Account validation and the server directory share the same refresh policy, with one controller per
endpoint and account. They refresh when 15 minutes have passed since the last successful response,
including on foreground return. Failed requests retry after one minute while foregrounded. Pending
requests are shared; an invalidation during a request causes one follow-up after success. Background
entry stops timers, and iOS system overlays do not restart them. Ordinary RTC failures do not reload
the directory. Session revocation and membership actions still refresh it. A stored session is shown
while startup validation runs; an invalid credential clears that login, while network failures retain it.

The app lock (Settings > App lock) uses a 4-digit PIN, the phone's biometrics with the phone
passcode as fallback (`expo-local-authentication`, Android strong biometrics only), or both. The
settings are in the after-first-unlock Keychain items, so a start in the background reads them and
starts locked. The PIN is stored as a salted PBKDF2-SHA256 hash, and the failed attempts are stored
before each check, both in when-unlocked, this-device-only items. A 4-digit PIN cannot resist a
person who reads the Keychain; the Keychain and the attempt limit protect it. After 4 failures each
attempt waits longer, and the 10th failure signs out. Every change in App lock asks the owner to
unlock first, unless the owner unlocked in the last 5 minutes. The local `modules/app-lock` native module
measures the time away with a clock that counts during sleep and ignores changes of the phone's time.
It reports a phone lock: iOS posts `protectedDataWillBecomeUnavailable` about 10 seconds after the lock,
and only with a passcode, so the module asks for the short background time while it waits for that
notification. Android reports `ACTION_SCREEN_OFF`. Android counts the app as away only when no activity
of the app is visible, so permission and biometric dialogs do not lock it. On Android 13 and later the
recent apps show a blank card. The lock screen draws in `FullWindowOverlay` on iOS and in a `Modal` on
Android, above sheets. Notification, Live Activity, quick action and share navigation waits until
the user unlocks. Expo Go does not have the module: it measures with the phone clock and cannot see a phone lock.

## Background refresh

While the user is signed in, the phone asks the system for a background refresh at most once every
15 minutes. The system decides when it runs. In a refresh, the workspace makes the server connections
active for at most 25 seconds. It waits until each server loads with its channels and open chats, or
stops at the retry cooldown, then saves the encrypted workspace copy and makes the connections
inactive again. The app stays "away" for the hosts, so they continue to send notifications, and a
chat on screen is not marked as read. A refresh sends no connection analytics.

- iOS uses `BGAppRefreshTask` with the identifier `run.codebot.mobile.refresh` (`UIBackgroundModes`
  `fetch` in `app.json`). The local `modules/background-refresh` module registers the task at launch
  and gives each run to JavaScript. iOS lists the app in Settings > General > Background App Refresh.
- Android uses `expo-background-task` (WorkManager). `package.json` excludes it, `expo-task-manager`
  and `unimodules-app-loader` from iOS autolinking, because that package schedules only an idle
  processing task on iOS.
- The server connections run in a web view, so a refresh needs the React tree. When the system
  starts the app in the background with no window, React Native does not start (iOS) or no component
  mounts (Android). The run then ends with no network work, and the refresh stops until the user
  opens the app again.
- The support log shows `Background refresh: available` (or the iOS status), and for each run the
  number of servers that loaded, or why the run did nothing (`Background refresh skipped: ...`). On
  iOS, the device log (subsystem `run.codebot.mobile`, category `BackgroundRefresh`) shows when iOS
  started the task and when it ended.
- Test on a device. iOS has no background tasks in the Simulator. Attach Xcode to `CodeBot`, put
  the app in the background and pause it. Select a thread that is not the main thread
  (`thread select <n>`): on the main thread the command does not return. Then run
  `e -l objc -- @import Foundation`, `e -l objc -- @import BackgroundTasks` and
  `e -l objc -- (void)[[BGTaskScheduler sharedScheduler] performSelector:NSSelectorFromString(@"_simulateLaunchForTaskWithIdentifier:") withObject:@"run.codebot.mobile.refresh"]`,
  and continue. Wait before you open the app: a run with the app in the foreground does nothing.
  On Android, `adb shell cmd jobscheduler run -f run.codebot.mobile <job id>` starts the job.

## iOS shortcuts

The Shortcuts app of iOS 26 and later has three CodeBot shortcuts: List Agents, Send Message and
Open Agent. An older iOS has none: their cards need `SnippetIntent`.

The shortcuts run in native code, with no JavaScript of the app. iOS runs a shortcut in the
background, also when the app is not in memory. There the app has no window, React Native does not
start, and iOS suspends the app soon after the intent returns.

- The App Intents, their cards and the `AppShortcutsProvider` are Swift files in `plugins/shortcuts`.
  `plugins/with-shortcuts.js` adds them to the app target, because Xcode reads the shortcuts of an
  app from that target. iOS reads the names and the phrases of the shortcuts at build time, so they
  are English and not from the `@codebot/i18n` catalog. The text of the cards is from the catalog.
- The app writes `shortcuts.json` to the App Group
  (`src/features/shortcuts/model/shortcut-directory.ts`): the agents, the agent of Settings >
  Shortcuts, the app lock and the card text. Sign-out deletes it. The servers with their public
  keys and the agent pictures are the ones that the app writes for the share extension.
- List Agents reads that file. A tap on an agent opens its chat. The message button of an agent runs
  the hidden intent Message Agent: it asks for the text and sends it to that agent as Send Message
  does, and the app does not open.
- Open Agent opens the app on the chat of the agent of Settings > Shortcuts. With no agent, it opens
  Settings > Shortcuts. It uses the same `ShortcutBridge` path as the card buttons.
- Send Message sends to the agent of Settings > Shortcuts with the sender of the share extension
  (`plugins/share-extension/ShareSender.swift` and the page `share-sender.html`, which the plugin
  also adds to the app target). A hidden web view with the Team client connects to the agent's
  server, sends the message and closes. The session token is the keychain item of the share
  extension. The intent returns when the server has the message, or after 24 seconds: iOS stops an
  intent after about 30. The reply comes as the notification of the server.
- A message that did not go opens in the composer of the chat from the card. A message with no
  answer from the server does not: it can be in the chat.
- A button of a card opens the app through `modules/shortcuts` (`ShortcutBridge`), which gives the
  target to `src/features/shortcuts/shortcuts-native.ts`.

Check the shortcuts on an iPhone, also with the app removed from the app switcher.

## Source structure

The mobile app uses a feature-first structure. Expo Router files stay deliberately thin: `src/app`
defines URLs, route groups, guards, and navigator options, while screen implementations live with
the feature that owns them.

```text
src/
  app/                  Expo Router routes and layouts only
    (app)/              routes available to an authenticated session
  features/
    auth/               QR and email sign-in, session storage, and session context
    agents/             agent list, agent actions, and pin transitions
    chat/               chat screen and its focused UI sections
    search/             search model, controls, results, and screen
    servers/            server drawer and joining a server
    settings/           account settings screen
    shortcuts/          iOS shortcuts: the data that the native intents read, and Settings > Shortcuts
    workspace/          remote directory, WebRTC transport, live events, and workspace state
  shared/
    components/         UI used by more than one feature
    lib/                platform and infrastructure helpers
```

Keep code inside a feature until a second feature needs it. Move it to `shared` only when it has no
feature-specific behavior. Shared code must not import from features; direct feature-to-feature reuse
should stay explicit so it cannot turn into an accidental circular dependency.
Split screens into focused sections when they combine navigation, local state, and multiple distinct
UI regions; for example, chat owns separate header, message-list, and composer components.

## Design development

The mobile design system is documented in [`DESIGN.md`](./DESIGN.md). Read it before implementing or reviewing UI.

In short, use HeroUI Native for application content and reusable product components. Use native Expo Router and `@expo/ui` surfaces for navigation, headers, tabs, toolbars, search, menus, and route-level sheets so each platform owns its chrome and iOS can render Liquid Glass where the operating system supports it.

## Verification

Chat follows the [v0 chat interaction model](https://vercel.com/blog/how-we-built-the-v0-ios-app).
`use-chat-motion.ts` owns measurements, native blank-space insets, initial positioning, and send
animation sequencing. Message groups keep stable keys. Responses fill the blank space without
autoscrolling; the down-arrow returns to the latest content. Keyboard Controller absorbs keyboard
and composer growth into the blank space before shifting content at the end of the chat.

Streaming Markdown uses a bounded reveal pool (four active nodes, batches every 32 ms). It renders
the complete received text without a second typewriter queue. Reduced motion skips movement.
The floating composer uses the existing Expo glass components with an opaque accessibility fallback.
Mobile file attachments are currently disabled by `CHAT_ATTACHMENTS_ENABLED` in
`use-chat-attachments.ts`. The plus button shows a native Coming soon dialog; large pasted text
stays in the input. When enabled, the native menu on the plus button opens Files. The plus button and input share one row; there is
no separate paste button. The native multiline input grows to five lines, then scrolls internally;
its height limit follows the system font scale. Large text pasted into the input becomes a text attachment.
Photos, videos and other files pasted into the input become attachments through the local
`modules/composer-paste` native module; Expo Go does not have it and pastes text only. Mobile uploads
use the released file-transfer protocol and are limited to 10 MB per file. Sending dismisses the
keyboard. The gesture area covers the chat and uses the measured composer height for dismissal.
The installed Keyboard Controller content-inset hit-test workaround enables scrolling in blank space.

Device verification must cover: first send with the keyboard open/closed; subsequent sends; short
and long responses; initial history position; scrolling up while streaming; down-arrow; multiline
composer growth at the end and in history; interactive keyboard dismissal and swipe-to-focus;
background/foreground; reduced motion/transparency; text/image/file paste; upload failure and retry.
Code blocks show the fence language and a Copy action. They use the same syntax tokenizer as
desktop, render native text, and retain plain text for unknown languages. Highlighting does not
change source whitespace. Copy writes only the source to the system clipboard.
The local model and protocol tests do not establish native animation quality.

```bash
bun run mobile:lint
bun run mobile:typecheck
bun run mobile:doctor
```

## EAS

The project is linked to EAS and has development, preview, and production build profiles in `eas.json`. EAS gives the
build credentials, the build numbers and the public values of each environment. The app does not use EAS Update.

```bash
cd apps/mobile
bunx eas-cli@latest build --profile development --platform ios
bunx eas-cli@latest build --profile development --platform android
```

Cloud builds require the final `ios.bundleIdentifier` and `android.package` values in `app.json`. Store submission also requires Apple Developer and Google Play Console credentials.

### Local TestFlight build

On a Mac with Xcode 27.1 or newer (see the iPhone Duo note below), CocoaPods, Fastlane, and this
project's Node and Bun versions installed, sign in to Expo with `bunx eas-cli@latest login` from
`apps/mobile`. An active Apple Developer membership is required for signing and TestFlight
distribution.

From the repository root, run:

```bash
bun run mobile:ios:build:local
```

From `apps/mobile`, the equivalent command is `bun run ios:build:local`.
This runs EAS Build locally with the `production` profile and writes
`/private/tmp/codebot-testflight.ipa`. Each successful build replaces that output file.
The profile uses remote build numbers and increments the build number automatically.
EAS CLI prompts for signing credentials when needed.

The build loads `Plain text` and `Sensitive` variables from the EAS `production` environment.
Variables with `Secret` visibility must be supplied in the local environment.

To upload, open Apple's Transporter app, sign in, add the `.ipa`, and select **Deliver**.
After Apple processes the build, select it in App Store Connect under **TestFlight** and assign
it to a tester group. Upload is manual; the command does not run EAS Submit.

### GitHub Actions TestFlight release

The `Release iOS to TestFlight` workflow builds the selected `main` commit on a GitHub-hosted
`xcode-27` runner (a GitHub preview image) with Xcode 27.1. Expo SDK 58 compiles with Xcode 26.4 or
newer, but iOS decides the iPhone Duo layout from the SDK of the build: an iOS 26 SDK build shows in
a small window in the middle of the open iPhone Duo, and only the iOS 27.1 SDK fills the screen and
moves the bars into the vertical rail. Keep Xcode 27.1 or newer, and check `DTSDKName` in the IPA
`Info.plist` after a runner change. The desktop release's `macos-14` runner is not suitable. EAS CLI
24.1.2 runs with `--local --non-interactive`, so compilation uses GitHub Actions compute. Fastlane
uploads directly to Apple without EAS Submit.

One-time setup:

1. In GitHub repository settings, create the `release-ios` environment. Under deployment branches
   and tags, select only the `main` branch.
2. Add environment secrets `EXPO_TOKEN`, `ASC_KEY_ID`, `ASC_ISSUER_ID`, and `ASC_PRIVATE_KEY`.
   The Expo token needs access to the CodeBot project. The Apple secrets are the Key ID, Issuer ID,
   and full `.p8` contents of an App Store Connect team API key with the App Manager role.
3. Keep the iOS distribution certificate and provisioning profiles configured in EAS. CI downloads
   these existing credentials. If they expire or need repair, update them interactively through
   EAS before retrying; the upload API key is not passed to the build step. Each target has its own
   profile: the app, `ExpoWidgetsTarget` (`run.codebot.mobile.ExpoWidgetsTarget`),
   `CodeBotNotificationService` (`run.codebot.mobile.NotificationService`, the Notification Service
   Extension) and `expo-sharing-extension` (`run.codebot.mobile.ShareExtension`, the share extension).
   Each extension needs the App Group `group.run.codebot.mobile`. When a release adds a
   target, set up its profile interactively once (`bunx eas-cli credentials -p ios`) before CI builds
   it. Keep the saved push key; do not let EAS make a new one.
4. Keep the OpenPanel variables in EAS `production` with `Plain text` or `Sensitive` visibility.
   `Secret` variables are unavailable to this local build. Do not copy these values into source.
5. Ensure App Store Connect has the app `run.codebot.mobile` and the intended TestFlight group.

After this workflow is merged into `main`, authenticate GitHub CLI with `gh auth login`, then run
from the repository root:

```bash
bun run mobile:ios:release:testflight
```

From `apps/mobile`, run `bun run ios:release:testflight`.

This dispatches a release of remote `main`, including no local or uncommitted changes. The command
returns after dispatch; follow the run in GitHub Actions under **Release iOS to TestFlight**.
You can also select **Run workflow** on `main` in GitHub. The workflow does not run on pushes,
pull requests, or desktop release tags. Concurrent iOS releases are serialized; GitHub can replace
an older pending run with a newer request, so avoid dispatching the same release repeatedly.

The workflow checks source before building. EAS increments the remote iOS build number; a failed
build can consume a number. The marketing version stays in `app.json` and is not changed by dispatch.
To release a new marketing version, run `bun run mobile:release:patch`, `mobile:release:minor` or
`mobile:release:major` first. It moves the notes in `apps/mobile/changelog.d` into
`apps/mobile/CHANGELOG.md`, which the Mobile tab of the public `/changelog` page shows, and sets the
version in `app.json`, `package.json` and `bun.lock`. Merge that change to `main`, then dispatch the release.

The new section is `## [x.y.z] - In review`, and `/changelog` does not show it. Apple and Google
review a build on their own, and each can take days. When testers can install the build from one
store, run `bun run mobile:release` and select 3, or `bun run mobile:release:published ios` (or
`android`). It writes today's date for that store, for example `## [x.y.z] - 2026-10-14 (Android)`,
and raises that store's `cloudServers` and `browser` flags and newest version in
`apps/auth-api/src/server/mobile-features-config.ts`. Merge that change to `main`. After the Worker
deploy, the site shows the version with that store, the other store as "In review", and Discord gets
the post of that store. When the other store makes the build available, do the same for that store.
The heading becomes `## [x.y.z] - 2026-10-14 (Android), 2026-10-16 (iOS)`, or `## [x.y.z] - 2026-10-14`
when both dates are the same. Use `both` when the two stores make the build available on the same day.
For an older version, add `--version x.y.z`. A new `mobile:release:*` stops while no store has the
current version.

A store that will never ship a version, because a newer one replaced it, is skipped:
`## [x.y.z] - 2026-11-01 (iOS), Skipped (Android)`. `/changelog` shows it as skipped, and Discord gets
no post. When you mark a newer version as available, the menu asks to mark the older versions that
the store still reviews as skipped (`--skip-older` on the command). Menu step 4 marks a version as
skipped by hand, or as in review again.

### Release menu

`bun run mobile:release` shows the state of the newest versions on each store and their posts, and
one menu for each step. Press a digit; Enter selects the first choice, and 0 goes back.

1. Prepare a new version (`prepare-release.ts --mobile`).
2. Build and send to TestFlight or Google Play (dispatches `release-ios.yml` or `release-android.yml` on `main`).
3. Mark a version as available in a store, with its flags and the skip of older versions.
4. Mark a version as skipped, or in review again.
5. Write the Discord highlights.
6. Show the live state: the flags and `/changelog` of production, and the posts that are due or wait.

A step that changes files needs a clean working tree. It makes a branch from the `main` of GitHub,
commits (the pre-commit hook runs), pushes, opens the pull request with the release title and body,
and goes back to your branch. It can also turn on auto-merge. The menu never merges by itself.

The signed `.ipa` is saved as a GitHub Actions artifact for seven days before upload. If upload
fails, download that artifact and retry with Transporter to avoid rebuilding. Re-running the full
workflow creates a new build number.

A successful workflow means Apple accepted the upload. Fastlane does not wait for Apple processing
or assign tester groups. Configure automatic distribution for an internal group in App Store Connect,
or assign the processed build manually. External testing can require Beta App Review. This workflow
does not submit the app for public App Store release.

The workflow uses the runner's installed Fastlane and CocoaPods and prints their versions. Update
the selected Xcode and EAS CLI versions when upgrading Expo. GitHub Actions usage and limits apply.
See [local EAS builds](https://docs.expo.dev/build-reference/local-builds/) and
[Fastlane TestFlight upload](https://docs.fastlane.tools/actions/upload_to_testflight/).

### GitHub Actions Google Play release

The `Release Android to Google Play` workflow builds the selected `main` commit on a GitHub-hosted
`ubuntu-24.04` runner with JDK 17 and the runner's Android SDK. EAS CLI 24.1.2 runs with
`--local --non-interactive`, so compilation uses GitHub Actions compute. Fastlane 2.240.1 uploads
the `.aab` directly to Google Play without EAS Submit. The workflow uploads only to the `internal`
or `alpha` (closed testing) track. Promote a release to production in Play Console.

One-time setup:

1. In GitHub repository settings, create the `release-android` environment. Under deployment branches
   and tags, select only the `main` branch.
2. Add environment secrets `EXPO_TOKEN` and `GOOGLE_PLAY_SERVICE_ACCOUNT_KEY`. The Expo token is the
   same as in `release-ios`. The Google secret is the full JSON key of a Google Cloud service account.
3. In the Google Cloud project of that service account, enable the Google Play Android Developer API.
   In Play Console, under **Users and permissions**, invite the service account email and give it
   access to `run.codebot.mobile` with the release permissions for testing tracks.
4. Keep the Android upload keystore configured in EAS as the default build credentials. CI downloads
   it. Play App Signing keeps the app signing key; the EAS keystore is the upload key.
5. Keep the OpenPanel variables in EAS `production`, as for iOS.
6. Google Play accepts API uploads only after the app has one bundle. For the first release, dispatch
   the workflow with `upload` cleared, download the `android-*` artifact, and upload the `.aab` in
   Play Console under **Test and release → Testing → Internal testing**. Until the app has a
   published release, Play accepts only draft releases: dispatch with `release_status` set to `draft`
   and roll out the release in Play Console.
7. Commit `apps/mobile/google-services.json`, the Firebase file of the Android app
   `run.codebot.mobile`. `app.config.js` adds it when it exists. Without it the build has no Firebase,
   and Android gets no notifications. The file has public identifiers only. The account service has
   the key that sends (`FCM_SERVICE_ACCOUNT` in [the account service](../auth-api/README.md)).

After this workflow is merged into `main`, run from the repository root:

```bash
bun run mobile:android:release:play
```

From `apps/mobile`, run `bun run android:release:play`. This dispatches a release of remote `main`
to the `internal` track with status `completed`. To choose another track, status, or a build without
upload, select **Run workflow** on `main` in GitHub, or run
`gh workflow run release-android.yml --ref main -f track=alpha -f release_status=draft -f upload=true`.

EAS increments the remote Android `versionCode`; a failed build can consume a number. iOS and Android
use the same marketing version in `app.json` and the same notes in `apps/mobile/CHANGELOG.md`. Run
`bun run mobile:release:published android` when testers can install the build from Google Play.
The signed `.aab` is saved as a GitHub Actions artifact for seven days before upload. If upload fails,
upload that artifact in Play Console to avoid rebuilding.

A successful workflow means Google Play accepted the bundle on the selected track. Fastlane does not
upload store metadata, screenshots or release notes. Write the release notes in Play Console.

To build a signed `.aab` on your computer, run `bun run mobile:android:build:local`. It needs JDK 17
and the Android SDK, and writes `/private/tmp/codebot-play.aab`.
See [Fastlane Google Play upload](https://docs.fastlane.tools/actions/upload_to_play_store/).

### Android APK

The universal APK that Google Play makes from the store bundle can be given to a phone with no Google Play.

The file is the universal APK that Google Play makes from the store bundle. Google Play signs it
with the app signing key, so it has the signature of the app on Google Play: a user can change
between the two without removing the app, and no second key or second build is necessary.

The APK is not public after the build. It becomes public when the version is marked as available.

**Stage, after the build.** After each upload, `Release Android to Google Play` calls the
`Stage the Android APK` workflow (`release-android-apk.yml`) with the build number:

1. Fastlane (`fastlane android apk`) downloads the universal APK of that `versionCode` from Google
   Play, with the `GOOGLE_PLAY_SERVICE_ACCOUNT_KEY` of the `release-android` environment.
2. `scripts/android-apk-release.ts stage` reads the package, the version and the build number in
   the file and checks its signature. It stops when the file is not that build.
3. The script puts the file on the draft GitHub release `android-v<version>` as
   `CodeBot-<version>.apk`. Only people who can write to the repository see a draft. A second build
   of a version replaces the file of the first. The release notes have the SHA-256 of the file and
   of the signing certificate.

The workflow saves no workflow artifact of the APK: each signed-in GitHub user can download the
artifacts of a public repository. The signed `.aab` of the build is such an artifact for seven days.

**Publish, when the version is marked as available.** The site offers the APK of
`MOBILE_LATEST_VERSIONS.android` (`apps/auth-api/src/server/mobile-features-config.ts`), so the APK
and Google Play give the same version. `bun run mobile:release:published android` sets that version.
When that change is on `main`, the `Publish the Android APK` workflow (`publish-android-apk.yml`)
makes the draft of that version public (`scripts/android-apk-release.ts publish`). The account
Worker deploys at the end of CI, some minutes later, so the file is there before the site links to
it. The release is a GitHub prerelease, as the remote desktop runtime releases are: a prerelease
cannot become the "latest" release, so desktop downloads and updates do not change, and the notes
of the next desktop release do not start from it. The workflow fails if the "latest" release changed.
Do not publish the draft by hand in the GitHub page with the prerelease mark cleared.

The site makes the link from the version and does not ask GitHub. So the publish workflow fails when
the version has no release: the link on the site is then dead. Stage the APK of that version, then
start `Publish the Android APK` again. `ANDROID_APK_FIRST_VERSION` in the same file hides the APK
download while it is `null` or newer than the newest Google Play version. It is `1.4.11` now.

**Play's automatic integrity protection must stay off.** With it, the APK that Google Play makes
has an installer check (`com.pairip.licensecheck`). After an install from the file, the app shows
"Get this app from Play" and does not continue. The APK of 1.4.9 was public on 2026-11-13 and showed
this. The protection is off in Play Console (Protected by Google Play > Automatic protection:
"Installer check: off") since 2026-11-16. It changes only new uploads, so builds up to 1.4.10 still have it, and
the first APK is the one of 1.4.11. Do not turn the protection on again: each APK on the site then
stops after an install.

The service account must have the Play Console permission to download the generated APKs of the
app. Without it, Google Play answers "The caller does not have permission" (run 43252109769). The
account of 2026-11-12 has it: run 43385420725 downloaded the APK of build 25.

When the stage job fails, the store build and its record are not affected. Run the failed jobs
again. To stage the APK of a bundle that Google Play already has, such as a build that you uploaded
in Play Console, start the workflow with its build number:

```bash
gh workflow run release-android-apk.yml --ref main -f version_code=<versionCode>
gh workflow run publish-android-apk.yml --ref main   # only when the site already offers this version
```

A release that is public keeps its file. To replace it with another build of the same version, add
`-f replace=true` to the first command.

A build with `upload` cleared has no APK until Google Play has its bundle. If Google Play has more
than one signing key for the app, Fastlane stops and lists them; the lane does not select one.

A phone with the APK gets over-the-air updates as a phone with the store app does. For a new store
version, Update in the app opens the `market://` link of the app. When no app on the phone opens
that link, it opens `/download/android`. Another store app can take the link and show no result
(not tested on a device); the user then downloads the APK from the site. Notifications use Firebase Cloud Messaging, so a phone with no Google Play services gets none.
See [Fastlane universal APK download](https://docs.fastlane.tools/actions/download_universal_apk_from_google_play/).

### Discord announcement

Each store gets its own post in the CodeBot Discord when users of that store can see the version.
The source is `apps/mobile/CHANGELOG.md`; the gate is production. The `Announce mobile release on
Discord` workflow (`mobile-release-announcement.yml`) runs after each CI run on `main`, at minutes
17 and 47 of each hour, and on a manual dispatch. It posts a version for a store only when the
account Worker lists the version in `/v1/mobile/changelog?platform=<store>` and gives it the newest
version and the flags of `apps/auth-api/src/server/mobile-features-config.ts` in
`/v1/mobile/features`. Thus the post never comes before the deploy of the flags, the browser and
`/changelog`. A newer push to `main` cancels an older CI run, and that does not lose a post: the next
deploy or the schedule sends it.

A tag `mobile-announced/v<version>/<store>` records each post. The workflow creates the tag, then
posts; a failed post removes the tag, so the next run tries again. A version with a tag gets no post
again. Only the newest dated version of each store gets a post, from 1.4.7 on. The desktop release
has its own post and its own workflow (`docs/RELEASING.md#discord-announcement`).

| Event | Title | Line under the title |
| --- | --- | --- |
| The first store | `CodeBot vx.y.z is out on iOS` | `The Android version comes out later.` |
| The second store | `CodeBot vx.y.z is out on Android` | `It is already out on iOS.` |
| Both stores in the same run | `CodeBot vx.y.z is out on iOS and Android` | none |
| The other store skipped the version | `CodeBot vx.y.z is out on iOS` | none |

The message mentions the `Mobile Release Pings` role, then has the title, the highlights, and one
line of links to each store that has the version and to `Full Changelog`, the version on the Mobile
tab of `/changelog`. It notifies only that role.

Before the first store has the build, select the 3 to 5 changes in the version section that have
the largest effect on users, and write them with the version in `apps/mobile/release-announcement.json`:

```json
{ "version": "x.y.z", "highlights": ["...", "...", "..."] }
```

Use the highlight rules of the desktop announcement. Both posts of a version use the same file.
Replace the highlights of the previous version; the file holds only one version. Run
`bun scripts/discord-mobile-release-announcement.ts check x.y.z` to see the posts.
`bun run mobile:release` and `bun run mobile:release:published` stop while the file is not ready,
and the Changelog workflow stops a pull request that adds a store date before the file is ready.

`bun scripts/discord-mobile-release-announcement.ts plan` shows the posts that are due and why the
others wait. To post a version again, or an older one, run
`gh workflow run mobile-release-announcement.yml --ref main -f version=x.y.z -f stores=ios -f again=true`.
For a post that you sent by hand, run
`bun scripts/discord-mobile-release-announcement.ts mark-posted x.y.z ios`, so the workflow does not send it again.

One-time setup:

1. In GitHub repository settings, create the `release-mobile` environment. Under deployment branches
   and tags, select only the `main` branch.
2. In Discord, open the settings of the announcement channel, then Integrations > Webhooks. Make a
   webhook named `CodeBot` with the CodeBot icon. Add its URL as the environment secret
   `DISCORD_MOBILE_RELEASE_WEBHOOK_URL`. It can be the same channel as the desktop post.
3. In Discord, turn on Developer Mode, open Server Settings > Roles, right-click `Mobile Release Pings`
   and select Copy Role ID. Add the ID as the environment variable `DISCORD_MOBILE_RELEASE_ROLE_ID`.
4. A tag ruleset must let GitHub Actions create and delete tags that start with `mobile-announced/`.

## Removed features

Over-the-air updates, product analytics, error reports, billing, credits, referral, hosted server plans and
store review prompts are removed (decision D7). `updates.enabled` is `false` in `app.json`, and the app
never calls an upstream server. `apps/mobile-updates` is not used by the app.
