# Renderer core (src/renderer, outside features)

Scope: `src/renderer/` except `src/renderer/src/features/`. Read-only map. Facts cite repo-relative paths. Items marked "(unverified)" were not confirmed.

## What this area is

- The app shell of the CodeBot desktop UI: the entry, the provider tree, the access gate, the signed-in workspace frame, and the left bar resizer.
- The cross-domain contexts that every feature reads (layout, navigation, platform, providers, turns), plus the typed port helpers that call `window.codebot`.
- The appearance system: palette JSON files in the user data folder, the `--codebot-*` CSS tokens, and the runtime code that applies both.
- The global stylesheet entry (`src/renderer/src/styles.css`), base styles, and the shell stylesheet (`styles/app-shell.css`).
- Domain code lives in `src/renderer/src/features/<domain>/`. That code is out of this map.

## Key files

| Path | What it owns |
| --- | --- |
| `src/renderer/src/index.tsx` | Entry. Runs `syncAppearance({ windowGlass: true })`, `syncLogoColor()`, `startActionSounds()`, `startRendererTiming()`, then `render(...)` into `#root`. Imports `./styles.css` last. |
| `src/renderer/src/App.tsx` | Root component `App`: `NotificationObserver` > `AppProviders` > `WindowAmbientMotion` > `AppAccessGate`. Adds the `Toaster`. |
| `src/renderer/src/app-providers.tsx` | `AppProviders` (global tree), `ServerScopeBoundary` (keyed on `activeServerId`), `ScopedProviders` (per-server tree). Exports `AppProps`. |
| `src/renderer/src/app-bootstrap.tsx` | `AppBootstrap`: listens for server invites, plugin and marketplace listings, and agent template links. Opens join-server and marketplace state. Renders nothing. |
| `src/renderer/src/AppView.tsx` | `AppAccessGate`: decides what shows. Splash, update-required screen, account login, language step, first-run flow, initial setup, or `WorkspaceShell`. |
| `src/renderer/src/WorkspaceShell.tsx` | `WorkspaceShell`: signed-in shell. Picks the middle pane, handles connection and paywall states, registers shortcuts, mounts `WorkspaceFrame` with `left`, `page` and `after` slots. |
| `src/renderer/src/WorkspaceFrame.tsx` | `WorkspaceFrame`: the grid frame. Sets `app-frame` classes and the `--left-panel-width` inline style. Renders left slot, resizer, panes, page panel, overlays. |
| `src/renderer/src/WorkspaceLeftPanelResizer.tsx` | `WorkspaceLeftPanelResizer`: `PanelResizer` for the left bar with snap-to-compact. |
| `src/renderer/src/WorkspaceOverlays.tsx` | `WorkspaceOverlays` (1197 lines). Hosts the dialogs and overlays: owner transfers, skills marketplace, plan reminder, shared agent install, join, add, create, install, leave, restart and hosted-upsell server flows, server settings, app settings, global message search, remote desktop. |
| `src/renderer/src/WorkspaceOverlayViews.tsx` | Overlay wrappers: `JoinServerOverlay`, `MarketplaceOverlay`, `SharedAgentInstallOverlay`, `ServerSettingsOverlay`, `GlobalSearchOverlay`, `ChannelCreateOverlay`. |
| `src/renderer/src/layout.tsx` | `Layout` context (`LayoutProvider`, `useLayout`). Left bar width, collapse and closed state, server view (`rail` or `menu`), sidebar chat order, rail pins, rail hidden items, responsive auto-compact. |
| `src/renderer/src/layout-constants.ts` | Left bar sizes and thresholds, storage keys, server rail widths, `CONVERSATION_MIN_WIDTH`. |
| `src/renderer/src/navigation.tsx` | `Navigation` context (`NavigationProvider`, `useNavigation`). `selectAgent`, `openCreatedAgent`, `selectDirectMember`, global search state, chat history back and forward, mouse back and forward buttons. |
| `src/renderer/src/platform.tsx` | `Platform` context. `appInfo` (from `getAppInfo`), `appFocused`, `chatWindow`, `landingPreview`, `peopleEnabled`, `appFrame` element ref. Sets motion via `setDrawsOnCpu` on software rendering. |
| `src/renderer/src/simple-context.tsx` | `createSimpleContext({ name, init })`. Returns `{ provider, use }`. `use()` throws a named error outside the provider. |
| `src/renderer/src/providers.tsx` | `Providers` context (611 lines). Provider runtimes, provider API keys, custom providers and custom agents for the provider UI. |
| `src/renderer/src/turns.tsx` | `Turns` context (683 lines). Uses `createStore`. |
| `src/renderer/src/app-stored-values.ts` | `createStoredProfile`, `createStoredMessage`, `updateStored`. Store wrappers with a `WeakMap` of setters. |
| `src/renderer/src/app-port.ts` | `AppPort` interface (each field typed as a `CodeBotDesktopApi` member) and `appPort()` (returns `window.codebot`). |
| `src/renderer/src/providers-port.ts`, `skills-port.ts`, `turns-port.ts` | Same port pattern for other domains. Each exports a `*Port` interface and a `providersPort()`, `skillsPort()` or `turnsPort()` helper. Field types are `CodeBotDesktopApi["name"]` or `Pick<CodeBotDesktopApi["agent"], ...>`. |
| `src/renderer/src/chat-history.ts` | `createChatHistory`, `chatHistoryShortcut`. Back and forward stack of agent, channel and person entries (`createStore`). |
| `src/renderer/src/i18n-context.tsx` | `I18nProvider`, `StaticI18nProvider`, `useI18n`. Internals beyond these exports were not read (unverified). |
| `src/renderer/src/app-defaults.ts` | `FALLBACK_STATUS`, `FALLBACK_UPDATE_STATUS`, `FALLBACK_PROVIDER_RUNTIMES`, `FALLBACK_HOST_STATUS`, `EMPTY_TEAM_PRESENCE`. Used before the first IPC answer. |
| `src/renderer/src/app-message-projection.ts` | Converts `ConversationMessage` to `AgentMessage` (`toAgentMessage`, `toAgentMessages`), equality helpers, time formatting. 574 lines. |
| `src/renderer/src/lazy-views.ts` | 26 `lazy(() => import(...))` view exports. Feature views and `@codebot/ui` views. |
| `src/renderer/src/appearance-choice.ts` | `syncAppearance` (boot path, cache-first) and `useAppearanceChoice` (settings hook). Holds `optimisticChoice` helper and the `codebot.*` localStorage cache keys. |
| `src/renderer/src/theme-palette.ts` | `applyThemePalette(palette | null)` is exported. `paletteTokens(palette)` is module-private. It maps the 12 palette colours to 58 `--codebot-*` entries (inline style on `<html>`). |
| `src/renderer/src/theme-sweep.ts` | Animated theme change through the View Transitions API (`SWEEP_MS = 1200`). Used when the visible look changes. |
| `src/renderer/src/styles/theme-sweep.css` | Styles for the sweep (`html:active-view-transition-type(theme-sweep)`). |
| `src/renderer/src/color-scheme.ts` | `syncColorScheme`. Sets `data-codebot-color-scheme` on `<html>` to `light` or `dark`. |
| `src/renderer/src/app-fonts.ts` | `applyAppFonts`, `useInstalledFonts`. Sets `--codebot-font-sans` and `--codebot-font-mono` on `<html>`. |
| `src/renderer/src/chat-background.ts` | `applyChatBackground`, `hideChatBackgroundForBackdrop`. Sets `--codebot-chat-background-light` and `-dark`, and matching `data-` attributes. |
| `src/renderer/src/window-glass.ts` | `setWindowGlass(source, on)`. Toggles `data-codebot-window-glass` on `<html>`. |
| `src/renderer/src/window-shape.ts` | `windowShape`, `windowExtent`. Hit areas for the agent dock. Limits come from `AGENT_DOCK_LIMITS` in `packages/contracts/src/ipc-agent-dock.ts`. |
| `src/renderer/src/interface-size.ts` | `useInterfaceSizeChoice`. Interface size percent through `setAppInterfaceSizePreference`. |
| `src/renderer/src/components/side-panel-width.ts` | Side panel width helpers. Default and max come from `@codebot/ui` `SETTINGS_PANEL_DEFAULT` (360) and `SETTINGS_PANEL_MAX` (1600). Reads legacy key as fallback. |
| `src/renderer/src/components/panel-width-storage.ts` | `readPanelWidth(key, fallback, min, max)`, `savePanelWidth(key, value)`. |
| `src/renderer/src/styles.css` | Global CSS entry. Import order, `:root` aliases (`--background`, `--surface`, `--border`, `--text-*`, `--accent`, `--danger`) and motion timing tokens. |
| `src/renderer/src/styles/base.css` | Reset, `html/body/#root` sizing and overflow, `body` background and text colour. |
| `src/renderer/src/styles/app-shell.css` | Shell and frame rules (3487 lines), including `.app-frame` and `.app-frame-edge`. |
| `src/renderer/src/styles/transitions.css`, `window-glass.css`, `chat-background.css`, `theme-sweep.css` | Transition, glass, chat background and sweep styles. |
| `packages/brand/src/tokens.css` | Dark default `--codebot-*` tokens on `:root` (314 lines with `--codebot-` names). Includes `--codebot-font-sans-default` and `--codebot-layer-tooltip: 240`. |
| `packages/brand/src/tokens-light.css` | Light overrides on `:root[data-codebot-color-scheme="light"]` (107 lines with `--codebot-` names). |
| `packages/brand/src/tokens-native.css` | Native and mobile token set. Imported by `apps/mobile/global.css` and read by `scripts/mobile-codegen.ts`. The renderer does not import it. |
| `packages/contracts/src/app-appearance.ts` | Appearance and palette types, defaults, validators, `selectedThemePalette`, `sameThemePalettes`, font family pattern. |
| `packages/contracts/src/ipc-desktop-apis.ts` | `CodeBotDesktopApi` interface (line 82). The shape of `window.codebot`. |
| `src/main/theme-palette-files.ts` | Reads and watches the palette folder. Main process. |
| `src/main/appearance-service.ts` | `AppearanceService`. Stores the preference file, holds the palette list, falls back to the first palette, notifies listeners. Main process. |
| `src/main/application-services.ts` | Wires `THEME_PALETTE_DIRECTORY` (`"themes"`) and `APPEARANCE_PREFERENCE_FILE` (line ~537, `codebot-appearance-preference-v1.json`) under `app.getPath("userData")`. Main process. |
| `src/preload/index.ts` | `contextBridge.exposeInMainWorld("codebot", ...)` (line 1762). |
| `src/renderer/src/env.d.ts` | Types `window.codebot` as `CodeBotDesktopApi`. |
| `src/renderer/AGENTS.md` | Renderer rules: Solid rules, file layout, store shape, token rules, test waits. |

Left bar and right panel pieces outside this scope (not read in depth):

| Path | Role |
| --- | --- |
| `src/renderer/src/features/sidebar/WorkspaceSidebar.tsx` | Left bar content. Rendered in the `left` slot by `WorkspaceShell.tsx`. Path confirmed; contents not read (unverified). |
| `src/renderer/src/features/servers/WorkspaceServerRail.tsx` | Server rail in the `left` slot. Path confirmed; contents not read (unverified). |
| `src/renderer/src/features/window/WorkspacePageRail.tsx`, `packages/ui/src/features/window/PageRail.tsx` | Page rail. Pinned and hidden items come from `PAGE_RAIL_PINNABLE_PAGES` and `PAGE_RAIL_HIDEABLE_ITEMS`, both exported from `packages/ui/src/features/window/PageRail.tsx`. Their rail behaviour was not read (unverified). |
| `src/renderer/src/features/window/window-page-context.tsx` | `WindowPage` type, `windowPageKind()` (returns `"agents"`, `"settings"` or `"titled"`). |
| `src/renderer/src/features/window/WindowPageView.tsx` | Content of the page panel (unverified). |
| `src/renderer/src/features/window/workspace-shortcuts.ts` | `useWorkspaceShortcuts(actions)` (signature read; body not read). |
| `src/renderer/src/features/conversation/ConversationPanels.tsx`, `side-panel-storage.ts`, `side-panel-toggle.ts` | Right side panel for agent conversations (unverified: not read). Uses `createSidePanelWidth`, `readSidePanelWidth`, `saveSidePanelWidth` (see `AgentSettingsPanel.tsx`). |

## How it works

### 1. Entry and boot

1. `index.tsx` imports `./styles.css` and `./dev-worktree`. It installs the pointer focus guard and the optional perf probes (`__CODEBOT_PERF_PROBES__`).
2. It calls `syncAppearance({ windowGlass: true })`. That paints the cached theme before any IPC answer.
3. It renders `<WindowBackdropBubbles><App chatWindow={readChatWindowTarget(location.search)} /></WindowBackdropBubbles>`.
4. A chat window is a second window that shows one agent. `chatWindow` is passed down as a prop and read through `Platform`.

### 2. Provider tree

`AppProviders` in `app-providers.tsx`, outer to inner:

- `PlatformProvider` > `I18nProvider` > `AuthProvider` > `SetupProvider` > `WhatsNewProvider` > `SettingsProvider` > `LayoutProvider` > `UpdatesProvider` > `CustomProvidersProvider` > `CustomAgentsProvider` > `ProviderDetectionProvider` > `ServersProvider` > `DynamicIslandProvider` > `ServerSettingsProvider` > `RemoteDesktopProvider` > `ServerSwitchProvider` > `AnsweredPromptsProvider` > `UiErrorsProvider` > `UsageProvider` > `WindowPageProvider` > `AgentReadTrackingProvider`.
- Then `AppBootstrap` (skipped in a chat window), then `ServerScopeBoundary`.
- `ServerScopeBoundary` wraps children in `<Show keyed when={activeServerId()}>`. A server switch therefore remounts the whole scoped tree.
- `ScopedProviders` adds, in order: `ConversationControllerProvider`, `PresenceProvider`, `DirectMessagesProvider`, `AgentsProvider`, `ChannelsProvider`, `ProvidersProvider`, `TurnsProvider`, `AgentTasksProvider`, `AgentThreadsProvider`, `ConversationProvider`, `BrowserTabsProvider`, `SidebarProvider`, `NavigationProvider`, `ServerSelectionProvider`, `AgentActionsProvider`, `ServerScopeProvider`. Then `AgentEventBridge`, and (not in a chat window) `DynamicIslandBridge` and `ServerBrowserWindowBridge`.
- Chat window: `closeBrowserWindowWithServerScope` is skipped. `keepSidePanelFiles` is true only for the local server.

### 3. Access gate (AppView.tsx)

`AppAccessGate` reads these signals and renders one branch, in this order:

1. `started()`: setup loaded, `appInfo` loaded, and language ready.
2. `updateRequired()`: shows `UpdateRequiredScreen`. It can be dismissed once per session (`requiredUpdateDismissed`).
3. No visible signed-in account: `Loading` > language step or `AccountLogin`.
4. Signed in, setup not complete:
   - No server content (`scope.connection.hasContent` false): `WorkspaceShell` (its own onboarding runs inside).
   - Server has content: `SetupReadError` if the setup read failed. Otherwise `InitialSetup` when a pending invite URL exists, or `FirstRunFlow` when it does not.
5. Setup complete: `WorkspaceShell`.

Rendered beside the branches: `WhatsNewOverlay`, `QuitShortcutHint`, and the `AppLoadingScreen` splash. `workspaceShown()` decides when the splash may finish. The splash waits for `splashReady()`, then runs `exit` as `playToEnd` (first run) or `fade`. `startupSplashPlayed` is a module flag.

### 4. Workspace shell (WorkspaceShell.tsx)

- Middle pane (`middlePane()`), first match wins: `chat window` > `"agent"`; `windowPage.page() === "tasks"` > `"tasks"`; `agentSetupOpen()` > `"agent-setup"`; channel open > `"channel"`; direct member > `"direct"`; default `"agent"`.
- Chat window: sets `document.title` to the agent name and calls `window.close()` if the agent disappears.
- Connection logic: `connectionFailure`, `connectionPhase` (from `serverWorkspacePhase`), `fullWindowLoading`, a loading cover, and `connectionNotice` (`ServerConnectionNotice`).
- Paywall and blocked servers: `createServerPaywall`, `blockedRemoteServer`, `planScreenShown`. These set `fullScreenServer()`, which hides the left sidebar.
- Shortcuts (`useWorkspaceShortcuts`): `newAgent` (opens agent setup), `toggleSidebar` (expand or set closed), `showShortcuts` (opens app settings on the `keyboard` section).
- Startup: `onStartupReady` fires when `fullWindowLoading()` is false.
- Slots passed to `WorkspaceFrame`:
  - `left`: `WorkspaceServerRail` and `WorkspaceSidebar` (not in a chat window; sidebar hidden when `fullScreenServer()`).
  - `page`: `WindowPageView`.
  - `after`: `WorkspaceOverlays` (always), plus `ServerUpdateDialogHost` and `AgentDockHost` (not in a chat window).
  - Children: `TasksPanel`, `WorkspaceServerOnboarding`, `WorkspaceAgentSetup`, `WorkspaceDirectConversation`, `WorkspaceConversation`, `WorkspaceChannelConversation`.

### 5. Frame (WorkspaceFrame.tsx)

- Root `div.app-frame` gets these classes: `app-frame-sidebar-compact`, `app-frame-sidebar-closed`, `app-frame-edge` (only when `appInfo` is loaded), `app-frame-with-server-rail`, `app-frame-page-open`, `app-frame-platform-darwin`. It also gets `data-window-page` and `data-window-page-kind`.
- Inline style: `--left-panel-width: <n>px`. It is `0` when full screen. It is `88` (`LEFT_PANEL_COMPACT`) when `compact` is set and either no window page is open or the panel is narrow (`layout.leftPanelNarrow()`). Otherwise it is `layout.leftPanelWidth()`.
- `pageOpen` is true when the window page kind is not `"agents"`. When it is true, the `.app-frame-panes` column gets `inert` and `aria-hidden`, and a `div.conversation-panel.window-page` renders `page`.
- Grid: `.app-frame` uses `grid-template-columns: var(--left-panel-width) 0 minmax(0, 1fr)`. With a server rail it adds one column (`--server-rail-width`). The CSS is in `styles/app-shell.css` (lines 1-25). Exact placement of the page panel is unverified.

### 6. Left bar state (layout.tsx, layout-constants.ts)

Constants:

| Name | Value |
| --- | --- |
| `LEFT_PANEL_DEFAULT` | 280 |
| `LEFT_PANEL_MIN` / `LEFT_PANEL_MAX` | 128 / 400 |
| `LEFT_PANEL_COMPACT` | 88 |
| `LEFT_PANEL_COLLAPSE_THRESHOLD` / `LEFT_PANEL_EXPAND_THRESHOLD` | 110 / 118 |
| `CONVERSATION_MIN_WIDTH` | 424 |
| `SERVER_RAIL_WIDTH` / `MAC_SERVER_RAIL_WIDTH` / `NARROW_SERVER_RAIL_WIDTH` | 64 / 72 / 56 (56 on non-macOS when the window is 800 px or narrower) |

Signals inside `Layout` (eight `createSignal` calls, no store): `leftPanelWidth`, `leftPanelCollapsed`, `serverView`, `sidebarChatOrder`, `railPinChoices`, `railHiddenChoices`, `leftPanelAutoCompact`, `sidebarClosed`. Memos: `railPinned`, `railHidden`, `leftPanelNarrow` (collapsed or auto-compact), `leftPanelCompact` (closed or narrow), `serverRailVisible`.

Two different flags:

- `sidebarClosed` (key `codebot:left-panel-closed`): the user hid the sidebar.
- `leftPanelCollapsed` (key `codebot:left-panel-collapsed`): the user or the auto logic made the panel narrow.

`shouldAutoCompactSidebar` compares `window.innerWidth - serverRailWidth - panelWidth` with `CONVERSATION_MIN_WIDTH`. It runs on resize and when width or view changes.

Storage keys (all in `localStorage`, written in `layout.tsx`):

- `codebot:left-panel-width`, `codebot:left-panel-collapsed`, `codebot:left-panel-closed`
- `codebot:server-view` (`rail` or `menu`, default `menu`)
- `codebot:sidebar-chat-order` (default `unread-group`)
- `codebot:rail-pins` (JSON, default pinned: `tasks`, `workflows`, `usage`, `library`, `crm`)
- `codebot:rail-hidden` (JSON)

A `storage` event listener re-reads pins, hidden items and chat order, so other windows stay in sync.

Resizer: `WorkspaceLeftPanelResizer` passes `snap` with `compactValue` 88. When the drag crosses the thresholds, `onCompactChange` calls `setSidebarCollapsed(true)` or `expandSidebar()`. On resize end it saves the width with `savePanelWidth`.

### 7. Right side panel

- The shell's own page panel is `.conversation-panel.window-page` (see section 5). It shows for any window page other than `"agents"`.
- The agent side panels (settings, files, browser preview) are in `features/conversation/`. Their width uses `components/side-panel-width.ts`. The default is 360 and the max is 1600. Storage key is `codebot:side-panel-width`, with `codebot:settings-panel-width` as fallback.
- `readSidePanelWidth()` clamps the stored value to 360 to 1600 on read. `createSidePanelWidth`, `saveSidePanelWidth` and `resetSidePanelWidth` are the other exports.
- Files in `features/conversation/` that show a side panel: `AgentSettingsPanel.tsx`, `BrowserPreviewSidebar.tsx`, `FilePreviewPanel.tsx`, `ConversationSideThread.tsx`, `side-panel-page-tabs.ts`, `side-split-layout.ts`. `AgentSettingsPanel.tsx`, `BrowserPreviewSidebar.tsx` and `ConversationPanels.tsx` import the width helpers. `FilePreviewPanel.tsx`, `ConversationSideThread.tsx` and the split layout helpers were not checked for width handling (unverified).
- Channel side panel also uses these helpers (`features/channels/ChannelConversationParts.tsx`).

### 8. State patterns

- Context: `createSimpleContext({ name, init })` in `simple-context.tsx`. Each context file exports `XProvider` and `useX`. Examples: `Layout`, `Navigation`, `Platform`, `Providers`, `Turns`.
- `createStore` is used in only three root files: `app-stored-values.ts`, `chat-history.ts`, `turns.tsx`. Verified by grep.
- `app-stored-values.ts`: `createStoredProfile` and `createStoredMessage` wrap a store. `updateStored(store, value)` looks up a setter in a `WeakMap`. `isAgentProfile` tests for the `avatarSeed` key.
- `appearance-choice.ts` `optimisticChoice(initial, save)`: holds a signal, a `confirmed` value, a request counter, and a pending count. `change()` sets the new value, calls `save`, then keeps the result only if it is the latest request. On error it restores `confirmed`.
- `interface-size.ts` uses the same optimistic pattern with its own code.
- `src/renderer/AGENTS.md` asks for one `createStore` per concern. `layout.tsx` uses many signals instead. This is a known deviation (see Gotchas).

### 9. Routing

- There is no router library in `package.json` (checked for `solid-router` and `@solidjs/router`).
- Navigation is state-based:
  - `useWindowPage()` (`features/window/window-page-context.tsx`) sets the page kind (`agents`, `settings`, `titled`).
  - `middlePane()` in `WorkspaceShell.tsx` sets the centre content.
  - `navigation.tsx` `openAgent` and `selectDirectMember` change active agent, channel and direct state together.
- Mouse back and forward buttons and the back and forward keys call `goBack` and `goForward` in `navigation.tsx`.

### 10. Ports and the IPC bridge

- Preload exposes `window.codebot` (`src/preload/index.ts` line 1762). Its type is `CodeBotDesktopApi` (`packages/contracts/src/ipc-desktop-apis.ts`).
- Renderer code reads it through a port helper: `appPort()` in `app-port.ts`, `providersPort()`, `serversPort()` and others.
- Each port type is an interface whose fields are `CodeBotDesktopApi` members or `Pick<CodeBotDesktopApi["agent"], ...>`. This limits which calls a context may make.
- `preview/` replaces `window.codebot` with a mock for stories (`CodeBotPlayground.tsx`). Its mock files are the second implementation of the IPC surface.
- 82 files outside `preview/` reference `window.codebot` (grep, this check). The port helper is the root convention. Which of these bypass it was not classified (unverified).

### 11. Palette and theme system

Data and types:

- `packages/contracts/src/app-appearance.ts`:
  - `APP_APPEARANCES = ["system", "light", "dark"]`. Default `"dark"`.
  - `DEFAULT_TRANSPARENT_WINDOW = false`.
  - `APP_THEME_PALETTE_COLORS` (12 keys): `canvas`, `frame`, `sidebar`, `surface`, `text`, `textMuted`, `border`, `accent`, `accentForeground`, `success`, `warning`, `danger`.
  - `AppThemePalette`: `{ id, name, scheme: "light" | "dark", colors }`.
  - Colour pattern: `#RRGGBB` or `#RRGGBBAA`.
  - Id pattern: `^[a-z0-9][a-z0-9-]{0,63}$`.
  - `AppAppearancePreference` holds `appearance`, `palette` (id or null), `palettes` (list), `transparentWindow`, `chatBackgroundLight`, `chatBackgroundDark`, `interfaceFont`, `codeFont`.

Palette files on disk:

- Folder: `<userData>/themes/` (`THEME_PALETTE_DIRECTORY = "themes"`).
- File: `<id>.json`. Max 64 KiB. At most 32 files, sorted by id.
- File shape (decoded by `ThemePaletteFile` in `src/main/theme-palette-files.ts`): `name` (1-64 chars, no control characters), `appearance` (`"light"` or `"dark"`), and `colors` (all 12 keys, valid colour strings).
- The file key `appearance` becomes the runtime key `scheme`.
- Invalid files are skipped with a logged warning. Files that fail the id pattern are ignored silently.
- The folder is watched with `fs.watch`. A change re-reads the list (queued, one read at a time).
- No palette JSON file ships in the repo (checked with `find` for `*palette*` and `theme*.json`).

Preference:

- Main process: `AppearanceService` (`src/main/appearance-service.ts`) keeps the preference in `APPEARANCE_PREFERENCE_FILE`, which is `codebot-appearance-preference-v1.json` under `userData`. The file has `version: 1`.
- `themeChosen` flag: if the user has not chosen a theme, and the saved palette id is missing, `#showFirstPalette` picks the first palette in the list.
- `subscribe(listener)` notifies listeners after every write.
- IPC: `getAppAppearancePreference`, `setAppAppearancePreference`, `onAppAppearancePreference` (in `CodeBotDesktopApi`).

Renderer application:

1. `syncAppearance()` (`appearance-choice.ts`) reads the `localStorage` cache first: `codebot.appearance`, `codebot.transparentWindow`, `codebot.themePalette` (full palette JSON), `codebot.chatBackgroundLight`, `codebot.chatBackgroundDark`, `codebot.interfaceFont`, `codebot.codeFont`.
2. It applies the cached values: colour scheme, palette tokens, chat background, fonts, window glass.
3. It calls `getAppAppearancePreference()` and subscribes to changes. A later preference replaces the cache.
4. If the change alters the visible look (`visibleLook()` differs), it runs `sweepTheme()` (animated). Otherwise it applies at once. `options.sweep === false` skips the sweep. `sweepTheme()` in `theme-sweep.ts` applies at once when `document.startViewTransition` is missing, the page is hidden, or reduced motion is on (`canAnimate()`).
5. `useAppearanceChoice()` is the settings-side hook. It exposes `theme`, `changeTheme`, `palettes`, `transparentWindow`, chat background setters and font setters. All use `optimisticChoice`.

What each piece writes to `<html>`:

| Piece | Writes |
| --- | --- |
| `theme-palette.ts` `applyThemePalette` | Inline custom properties (58 `--codebot-*` entries) with `color-mix()`. It first removes the names it applied last time. |
| `color-scheme.ts` | `data-codebot-color-scheme="light" | "dark"`. Uses palette `scheme` when a palette is active, otherwise `appearance`. `"system"` follows `prefers-color-scheme`. |
| `app-fonts.ts` | `--codebot-font-sans`, `--codebot-font-mono`, falling back to `var(--codebot-font-sans-default)` and `-mono-default`. Removed when the font is null. |
| `chat-background.ts` | `--codebot-chat-background-light`, `--codebot-chat-background-dark`, and `data-codebot-chat-background-<scheme>`. Cleared while a backdrop is shown. |
| `window-glass.ts` | `data-codebot-window-glass` (on when any source is on: `transparent-window` or `backdrop`). |

Palette-to-token mapping (`theme-palette.ts`): for example `canvas` drives `--codebot-bg-canvas` and `--codebot-bg-overlay` (92% clear), and `sidebar` drives `--codebot-bg-sidebar`. `text` drives `--codebot-text-primary`. `accent` drives `--codebot-accent`, and `accentForeground` drives `--codebot-text-on-accent`. The light scheme uses `mix()` with white for raised surfaces.

### 12. CSS tokens

- Import chain (`src/renderer/src/styles.css`): `@fontsource-variable/inter`, `tailwindcss`, `@codebot/brand/tokens.css`, `@codebot/brand/tokens-light.css`, `@codebot/brand/logo.css`, `@codebot/ui/styles.css`, then many `@codebot/ui` partials and feature partials, then `./styles/app-shell.css`, then `./styles/window-glass.css` and `./styles/chat-background.css` last. `@source "../../../packages/ui/src"` lets Tailwind scan the UI package.
- `base.css` is imported after `tokens.css`. The order matters for cascade.
- `tokens.css`: dark default on `:root`. Names: `--codebot-bg-*`, `--codebot-text-*`, `--codebot-border*`, `--codebot-accent*`, `--codebot-success/warning/danger*`, `--codebot-radius-*`, `--codebot-space-*`, `--codebot-text-sm`, `--codebot-leading-sm`, `--codebot-duration-overlay`, `--codebot-layer-*` (for example `--codebot-layer-tooltip: 240`), and `--codebot-font-*-default`.
- `tokens-light.css`: `:root[data-codebot-color-scheme="light"]` overrides the colours. Other tokens come from `tokens.css`.
- `styles.css` `:root` maps old names to `--codebot-*`: `--background`, `--surface`, `--border`, `--text-primary`, `--text-secondary`, `--text-muted`, `--accent`, `--danger`. It also sets motion tokens (not `--codebot-*`): `--modal-*`, `--page-*`, `--panel-*`, `--resize-*`, `--stream-*`, `--digit-*`, and others.
- `scripts/ui-foundation-check.ts` (run by `bun run check:ui`) has six `debtBudgets` entries, all 0: hand-rolled composite ARIA roles, `data-testid` hooks, colour literals outside the palette, untokenized `font-size`, untokenized `border-radius`, and untokenized transition durations. Do not run it by hand (see AGENTS).

## How to change it

### A. Add a palette colour role

1. Add the key to `APP_THEME_PALETTE_COLORS` in `packages/contracts/src/app-appearance.ts`.
2. Add it to the `colors` schema in `ThemePaletteFile` in `src/main/theme-palette-files.ts`. Without this, files with the key are rejected.
3. Map it in `paletteTokens()` in `src/renderer/src/theme-palette.ts`. Choose the closest existing `--codebot-*` name, or add a new token (step B).
4. Update every `Record<AppThemePaletteColor, string>` consumer. Known consumer: `scripts/theme-palette-e2e.ts` (`PaletteColors`).
5. Update the palette file docs if any exist (none found in repo).

### B. Add or change a `--codebot-*` token

1. Add the dark value in `packages/brand/src/tokens.css` (`:root`).
2. If the dark value does not read on a light canvas, add a light value in `packages/brand/src/tokens-light.css`.
3. If the token should follow the user's palette, add it to `paletteTokens()` in `theme-palette.ts`. Otherwise the palette leaves it at the `tokens.css` value.
4. Use it in CSS with `var(--codebot-...)`. Do not add a colour literal to a renderer stylesheet.
5. Add a token only for a new semantic role. Use the closest existing token first (AGENTS.md).

### C. Add a new appearance option (setting plus apply step)

1. Add the field to `AppAppearancePreference` and `SetAppAppearancePreferenceInput` in `app-appearance.ts`. Add a validator (like `isAppFontFamily`).
2. Handle it in `AppearanceService` (`src/main/appearance-service.ts`): reader, `#write`, and the `StoredAppearancePreference` type.
3. Add a `CACHED_*_KEY` constant and read and write it in `cachedPreference()` and `cachePreference()` in `appearance-choice.ts`.
4. Add an `optimisticChoice` in `useAppearanceChoice()` and expose it. Call `confirm` from the preference listener.
5. Add an apply function (like `applyAppFonts`) and call it from `syncAppearance()`'s `apply` closure.

### D. Change left bar size or behaviour

1. Sizes and thresholds: `src/renderer/src/layout-constants.ts`.
2. Snap and collapse logic: `WorkspaceLeftPanelResizer.tsx` (`snap` prop) and `layout.tsx` (`expandSidebar`, `setSidebarCollapsed`, `shouldAutoCompactSidebar`).
3. Frame width output: `WorkspaceFrame.tsx` `leftPanelWidth()`. The CSS grid reads `--left-panel-width`.
4. Default pinned rail pages: `RAIL_PINNED_BY_DEFAULT` in `layout.tsx`. The list of allowed pages comes from `PAGE_RAIL_PINNABLE_PAGES` in `@codebot/ui`.

### E. Add a context to the provider tree

1. Create it with `createSimpleContext({ name, init })` in `src/renderer/src/` (cross-domain) or in `features/<domain>/<domain>-context.tsx` (domain-only, per AGENTS.md).
2. Add `XProvider` to `AppProviders` in `app-providers.tsx`:
   - Global state (no server id): put it in the outer list, before `ServerScopeBoundary`.
   - Per-server state: put it in `ScopedProviders`. It remounts on server switch.
3. Read it with `useX()` inside children. It throws outside its provider.

### F. Add a lazy view

1. Add `export const XView = lazy(() => import("./features/...").then((m) => ({ default: m.XView })))` in `src/renderer/src/lazy-views.ts`. Follow the existing entries.
2. Mount it inside `WorkspaceShell` (the children list) or `WorkspaceOverlays` (dialogs).

### G. Add a bridge call used by the renderer

1. Add the method to `CodeBotDesktopApi` (`packages/contracts/src/ipc-desktop-apis.ts`) and to the main-process handler. This is outside this map (see `src/main` docs).
2. Add it to the relevant `*Port` type in the renderer (for example `AppPort` in `app-port.ts`). Use `Pick`.
3. Call it through `appPort()` or the domain port helper. Do not call `window.codebot` in root code.
4. Add the matching mock in `src/renderer/src/preview/mock-*.ts` so stories keep working.

### H. Change the startup flow

1. Gate order and screens: `AppAccessGate` in `src/renderer/src/AppView.tsx`.
2. Splash readiness: `splashReady()` and `splashExit()`.
3. First-run and setup screens are lazy (`lazy-views.ts`).

### I. Add an overlay or dialog

1. Add the component in `features/<domain>/`.
2. If it needs a root host, add a wrapper to `WorkspaceOverlayViews.tsx` and mount it in `WorkspaceOverlays.tsx`.
3. Open and close it through a context signal (for example `setSettingsRequest`, defined in `features/agents/agents-context.tsx` and read in `navigation.tsx` through `useAgents()`, or `useSettings()` from `features/settings/settings-context.tsx`).

## Gotchas

- Palette inline styles beat stylesheet tokens. `applyThemePalette` writes the 58 properties on `<html>.style`. A value in `tokens.css` or `tokens-light.css` for one of those names does not show while a palette is active. Tokens not in `paletteTokens()` still come from the CSS files.
- Palette file key is `appearance`. The runtime key is `scheme`. Do not mix them up when writing a palette file.
- Palette files are validated strictly. A file with a missing colour key, a colour without `#`, or an id with capitals is skipped. Only a warning log shows (`theme-palette-files`).
- The first paint uses the `localStorage` cache. If the cached palette JSON is stale, the page shows the old look for a short time until IPC answers.
- `sidebarClosed` and `leftPanelCollapsed` are two separate flags. `leftPanelCompact` is derived from both. Changing one without the other gives a state the UI does not expect.
- `--left-panel-width` is set as an inline string style on `.app-frame`. A width of 0 in full-screen mode also hides the resizer (`<Show when={!fullScreen()}>`).
- While the page panel is open, `.app-frame-panes` is `inert`. Clicks and keys do not reach the conversation.
- `ServerScopeBoundary` remounts `ScopedProviders` on each server change. State held there resets. Put server-independent state in the outer tree.
- Chat windows (`platform.chatWindow !== null`) skip the server rail, sidebar, `AppBootstrap`, agent dock host, server update dialog host, dynamic island, and the server browser bridge. `WorkspaceOverlays` still mounts in a chat window. Code added to `WorkspaceShell` must check `chatWindow` where needed.
- `AppAccessGate` gate order matters. A new screen placed after `WorkspaceShell` is never shown until the earlier branches finish.
- `createEffect` in this repo: read props in the compute function, not the callback. `untrack` in the compute function stops re-runs (`src/renderer/AGENTS.md`).
- `layout.tsx` uses eight `createSignal` calls, not one store. AGENTS.md prefers one `createStore` per concern. Treat the store rule as the target for new code.
- `src/renderer/AGENTS.md` says `styles/app-shell.css` "ends in a theme layer". A grep for `theme`, `palette`, `@layer` and `data-codebot` in that file found no such section. A re-check of `theme` in `styles/app-shell.css` also found no match. The claim is not confirmed.
- `src/renderer/AGENTS.md` says `solid-js@2.0.0`. Root `package.json` pins `solid-js` and `@solidjs/web` to `2.0.3`. The installed pin wins.
- `tokens-native.css` uses `@variant light` (a Tailwind v4 form). Only the mobile app imports it. Do not expect it to load in the renderer.
- The palette e2e script (`scripts/theme-palette-e2e.ts`) writes palette files into a dev app's data folder. It is a dev tool. Do not use it to verify a release build.
- Dark is the default (`DEFAULT_APP_APPEARANCE = "dark"`). `system` follows the OS. `data-codebot-color-scheme` is set by `color-scheme.ts`, so CSS that checks the scheme must use that attribute, not `prefers-color-scheme`.
- Stories that show the shell must render the real `App` or `CodeBotPlayground` (AGENTS.md). Hand-built shells drift.

## Unverified

- Contents of `features/sidebar/WorkspaceSidebar.tsx`, `features/servers/WorkspaceServerRail.tsx`, `features/window/WindowPageView.tsx`, and `features/conversation/ConversationPanels.tsx` (not read).
- Exact CSS grid column placement of `.conversation-panel.window-page`. `app-shell.css` and `features/window/window.css` style `.conversation-panel` under `.app-frame-edge`, but no rule was found that places `.window-page` on the grid.
- Body of `useWorkspaceShortcuts` (only the signature was read).
- Internals of `i18n-context.tsx` beyond its exported names (`I18nProvider`, `StaticI18nProvider`, `useI18n`). Relation to `useText()` from `@codebot/ui/text` (not read).
- Method lists of `providers-port.ts`, `skills-port.ts` and `turns-port.ts`. The port pattern is confirmed; the field lists were not read.
- Which files that call `window.codebot` directly are exempt from the port rule (82 files match outside `preview/`; not classified).
- Exact colour-literal exemptions in `scripts/ui-foundation-check.ts`.
- Reload behaviour of the palette folder watcher after a file change beyond "queued re-read" (no debounce value checked).
