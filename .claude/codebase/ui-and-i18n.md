# UI, brand tokens and i18n (codebase map)

Scope: `packages/ui`, `packages/i18n`, `packages/brand`, `docs/ui-foundation.md`, `tools/ui-foundation`, and the `check:ui` and `i18n:check` scripts.
Read-only map written for coding agents. Paths are repo-relative to `CodeBot/`. Items marked (unverified) were not confirmed.

## What this area is

- `packages/ui` is the shared SolidJS component library (`@codebot/ui`). It holds primitives (buttons, dialogs, menus, fields, icons) and about 700 feature files (565 TS and TSX, 135 CSS) under `features/`, used by the desktop app, the public web and Storybook.
- `packages/brand` owns the design tokens (`--codebot-*` CSS variables), logos and brand shapes. Web and mobile import these too.
- `packages/i18n` owns the translation catalogs (15 locales), the `useText` runtime helpers and the `sourceText` matcher for English backend errors.
- `check:ui` (`scripts/ui-foundation-check.ts`) and the Biome Grit rules in `tools/ui-foundation` block native controls, direct Kobalte or Lucide imports, colour literals and hard-coded UI text. Budgets are zero.
- `i18n:check` (`scripts/i18n-check.ts`) validates every catalog: key shape, placeholders, plural forms, missing translations, unused keys and key order.

## Key files

| Path | What it owns |
|---|---|
| `packages/ui/AGENTS.md` | Rules for agents: no `window.codebot`, no `t` prop, `useText()` for text, keep markup and CSS order. |
| `packages/ui/README.md` | Short package description only. |
| `packages/ui/package.json` | Package name `@codebot/ui`. `exports` map lists every subpath (`./button`, `./text`, `./features/<domain>/<Name>`, `./styles.css`). Kobalte, lucide-solid, solid-sonner and others are dependencies. |
| `packages/ui/src/index.ts` | Barrel for the common primitives. Re-exports alert, badge, bubble, button, checkbox, complex, confetti, confirm-dialog, dynamic-island, error-reference, form, icons, item, marker, message, motion-tooltip, progress, select, settings, slider, sliding-tabs, surface, switch, toast, tooltip, typography, user-avatar and more. It does NOT export `text.tsx`, `utils.ts` or `data.ts`. |
| `packages/ui/src/button.tsx` | `Button`, `buttonVariants` (cva), `IconButton`, `CopyButton`, `StableLabel`. |
| `packages/ui/src/complex.tsx` | Kobalte adapters: `Dialog`, `AlertDialog`, `DropdownMenu`, `ContextMenu`, `Popover`, `Tooltip`, `Tabs`, `RadioGroup`, `SelectPrimitive`, `Combobox`, `Listbox`, plus `dialogOpen()` and `dialogShown()`. Also the focus-restore wrapper. |
| `packages/ui/src/typography.tsx` | `Text` and `Heading` (the public text components). |
| `packages/ui/src/text.tsx` | i18n context: `TextProvider`, `useText()`, `currentText()`. Import from `@codebot/ui/text`. |
| `packages/ui/src/form.tsx` | `Input`, `Textarea`, `NativeSelect`, `Label`, `Field`, `FieldContext`, `ControlSize` (sm, md, lg). |
| `packages/ui/src/select.tsx` | `Select`, `SelectTrigger`, `SelectValue`, `SelectContent`, `SelectItem`, `SelectSection`, `SearchSelect`. |
| `packages/ui/src/switch.tsx` | `Switch`, `SwitchField`, `SwitchSize` (sm, default). |
| `packages/ui/src/checkbox.tsx` | `Checkbox` (wraps a native input; top-level file, exempt from check:ui). |
| `packages/ui/src/surface.tsx` | `Card`, `Separator`, `Spinner`, `Skeleton`, `Kbd`. |
| `packages/ui/src/badge.tsx` | `Badge`, `badgeVariants` (cva, base class `z-badge`). |
| `packages/ui/src/alert.tsx` | `Alert`, `AlertIcon`, `AlertContent`, `AlertTitle`, `AlertDescription`, `AlertActions`, `AlertTone` (neutral, success, warning, danger), `NotificationObserver`. |
| `packages/ui/src/confirm-dialog.tsx` | `ConfirmDialog` (tone `destructive` or `default`). |
| `packages/ui/src/toast.tsx` | `Toaster`, `toast` (wraps solid-sonner), `TOAST_DURATION` (6000 ms). |
| `packages/ui/src/tooltip.tsx` | `LabelTooltip`, `LabelTooltipTrigger`. |
| `packages/ui/src/motion-tooltip.tsx` | `MotionTooltip`. |
| `packages/ui/src/menu-motion.tsx` | `useMenuMotion`, `ContentExitMotion`, `MotionPlace`, `panelShownInGroup`. Menu open and close motion. |
| `packages/ui/src/sliding-tabs.tsx` | `SlidingTabs` (Kobalte Tabs with a sliding indicator). |
| `packages/ui/src/item.tsx` | `ItemGroup`, `Item`, `ItemMedia`, `ItemContent`, `ItemTitle`, `ItemDescription`, `ItemActions`. |
| `packages/ui/src/message.tsx` | `MessageGroup`, `Message`, `MessageAvatar`, `MessageContent`, `MessageHeader`, `MessageFooter`. |
| `packages/ui/src/bubble.tsx` | `BubbleGroup`, `Bubble`, `BubbleContent`, `BubbleReactions`, `bubbleVariants`. |
| `packages/ui/src/settings.tsx` | `SettingsSection` (title, description, actions). |
| `packages/ui/src/marker.tsx` | `Marker`, `MarkerIcon`, `MarkerContent`. |
| `packages/ui/src/icons.ts` | Single entry for Lucide icons. Each line re-exports one icon from `lucide-solid/icons/<name>` (about 210 lines). |
| `packages/ui/src/utils.ts` | `cx` (class join), `truncateMiddle`, `REDUCED_MOTION_QUERY`, `prefersReducedMotion`, `usesTouchLayout`, `clamp`, `mix`, `holdFlag`, `motionDuration`, `createPressedPopupCue`. |
| `packages/ui/src/data.ts` | Shared display models used by features (imports types from `@codebot/contracts`). |
| `packages/ui/src/styles/primitives.css` | Styles for primitives (`.ui-text`, `.ui-heading`, buttons, dialogs, etc.). This is the `./styles.css` export. About 68 KB. |
| `packages/ui/src/styles/*.css` | Other shared sheets: `action-menu.css`, `chart.css`, `confetti.css`, `provider-code-login.css`, `reference-chip.css`, `scroll-edges.css`, `settings-panel.css`, `sliding-tabs.css`, `sr-only.css`. |
| `packages/ui/src/features/<domain>/` | Feature UI: 565 TS and TSX files and 135 CSS files in 33 domain folders. See the table in "How it works". |
| `packages/ui/src/features/conversation/conversation.css` | Ordered style manifest for the conversation feature. It is a list of `@import` lines for `styles/*.css` (about 56 fragments). Keep the order. |
| `packages/ui/src/components/` | Shared pickers and hooks (about 34 files). Examples: `SearchPicker.tsx`, `ProviderPicker.tsx`, `ProviderModelPicker.tsx`, `VirtualListbox.tsx`, `SettingsPanel.tsx`, `GlobalSearch.tsx`, `create*.ts` hooks (drag, scroll fades, tab rows, list virtualizer, menu search). |
| `packages/ui/src/assets/` | Crypto and model-maker logos (SVG), plush mascot art (WEBP and WEBM), Noto emoji font (`fonts/noto-greeting-emoji.woff2`). |
| `packages/brand/src/tokens.css` | Dark defaults for every global `--codebot-*` token (about 314 declarations), plus `[data-provider="..."]` overrides (about lines 355 to 411). This is the only place a colour literal is allowed. |
| `packages/brand/src/tokens-light.css` | Light values under `:root[data-codebot-color-scheme="light"]`. Changes values only (per docs). |
| `packages/brand/src/tokens-native.css` | Token set for native mobile. Declares `@variant light` and `@variant dark` blocks inside `:root`. The meaning of the `@variant` syntax is unverified. |
| `packages/brand/src/logo.css` | Logo styles. |
| `packages/brand/src/index.ts` | Exports `AppLogo`, `PlatformLogo`, `ProviderLogo` and their types. |
| `packages/brand/src/*.ts` | Shape and colour helpers: `app-logo-shape`, `wordmark-shape`, `provider-logo-shape`, `connector-mark-shape`, `bloub-avatar`, `bloub-avatar-motion`, `chat-colors`, `chat-backdrop-scenes` (916 lines), `article-gradient`, `file-reference`. |
| `packages/brand/package.json` | Subpath exports for each `.ts` and `.css` file (for example `./tokens.css`, `./tokens-light.css`, `./tokens-native.css`). |
| `packages/i18n/src/index.ts` | Main entry (`@codebot/i18n`). Exports `translateFor`, `createFormat`, `localizeSourceText`, `sourceText`, `matchingSourceKeys`, `resolveLocale`, `formatLocale`, `localeDirection`, `TRANSLATED_LOCALES`, `loadLocale`, `localeLoaded`, `createTranslate`, the message types (`Message`, `PluralMessage`, `MessageParams`, `PartialTranslation`, `Translate`) and `AppMessages`. `defineMessages` is not exported from the index; import it from `message.ts`. |
| `packages/i18n/src/messages/en/index.ts` | Builds the English catalog `en` by spreading every area module. Also exports the type `AppMessages`. |
| `packages/i18n/src/messages/<locale>/<area>.ts` | One file per area per locale. The English file exports `messages`, built with `defineMessages("<prefix>", {...})`. A locale file exports `messages` typed as `PartialTranslation`. Each locale `index.ts` exports a `const` named after the locale (for example `export const ar`). |
| `packages/i18n/src/messages/en/error/*.ts`, `en/status/*.ts` | Error and status text. These are aggregated into `en/source.ts` and used by `sourceText`. |
| `packages/i18n/src/messages/en/source.ts` | Aggregates `error/*` and `status/*` into the `source` catalog. |
| `packages/i18n/src/messages/en/mobile/*.ts` | Mobile app strings (separate catalog, about 5,000 key lines). |
| `packages/i18n/src/messages/en/format.ts` | Format strings for the format catalog (`format-catalogs.ts`). |
| `packages/i18n/src/message.ts` | Types (`Message`, `PluralMessage`, `Translate`, `PartialTranslation`, `MessageParams`), `defineMessages`, `createTranslate` (interpolation and plural selection). |
| `packages/i18n/src/source-text.ts` | `sourceText` (English), `localizeSourceText(text, locale)`, `sourceTextValues`, `matchingSourceKeys`, `isFixedSourceText`, `sourceTranslateFor`. |
| `packages/i18n/src/source-matcher.ts` | `createSourceLocalizer`: turns an English string into a key, then translates it. |
| `packages/i18n/src/source-catalogs.ts` | Maps a locale to its `source` catalog. |
| `packages/i18n/src/app-catalogs.ts` | Maps a locale to its app catalog (`appTranslation`). |
| `packages/i18n/src/format-catalogs.ts` | Maps a locale to its format catalog (`formatTranslation`). |
| `packages/i18n/src/lazy-catalogs.ts` | Lazy loaders per non-English locale (`loaders`, `loadLocale`). Loads app, source and format catalogs together. |
| `packages/i18n/src/locale-loading.ts` | Eager stub: `localeLoaded()` returns true, `loadLocale()` resolves. |
| `packages/i18n/src/vite-plugin.ts` | `lazyLanguageCatalogs()` Vite plugin. Redirects the four eager catalog modules to `lazy-catalogs.ts` when imported from inside `packages/i18n`. |
| `packages/i18n/src/locale.ts` | `TRANSLATED_LOCALES` (15 entries), `TranslatedLocale`, `resolveLocale`, `formatLocale`, `withHourCycle`, `localeDirection` (`ar` and `he` are RTL). |
| `packages/i18n/src/languages.ts` | Display labels for the language picker (`APP_LANGUAGE_OPTIONS`, `appLanguageOption`). |
| `packages/i18n/src/format.ts` | `AppFormat` and `createFormat`: number, compact, percent, `currencyUsd`, date, hour12, list, `fileSize`, `fileSizeAmount`, `diskSize`. |
| `packages/i18n/src/plural.ts` | `pluralCategory(locale, count)` (implementation unverified). |
| `packages/i18n/src/mobile.ts`, `mobile-catalogs.ts`, `mobile-catalogs.native.ts` | Mobile translator (`mobileTranslateFor`, `MobileTextKey`). |
| `packages/i18n/untranslated.json` | Gap list: `"key": ["locale", ...]`. About 1,743 keys listed. Written by `i18n:check --fix`. |
| `packages/i18n/package.json` | Exports `.`, `./format`, `./languages`, `./mobile`, `./source`. |
| `docs/ui-foundation.md` | Rules for the control scale, tokens, colour scheme, public API list, implementation rules, which component to pick, and dependency boundaries. |
| `scripts/ui-foundation-check.ts` | `check:ui` implementation. Exports `checkUiFoundation()`. Test: `scripts/ui-foundation-check.test.ts`. |
| `scripts/i18n-check.ts` | `i18n:check` implementation. |
| `.storybook/` (repo root) | Storybook config: `main.ts`, `preview.tsx`, `preview.css`, `chat-visual-pages.ts`. `packages/ui` has no `*.stories.*` files. |
| `tools/ui-foundation/no-desktop-preload.grit` | Biome rule: no `window.codebot` or `globalThis.codebot` access in shared UI. |
| `tools/ui-foundation/no-hardcoded-ui-text.grit` | Biome rule: letters in JSX text, in UI attributes (`aria-label`, `title`, `placeholder`, and others), in `{"..."}` children, in `toast("...")` and in `errorMessage(x, "literal")` and `userErrorMessage(x, "literal")` fallbacks. |
| `tools/ui-foundation/no-story-play.grit` | Biome rule: no Storybook `play` functions. CI only builds Storybook. |
| `tools/ui-foundation/fixtures/renderer/` | Bad and good samples for the rules. Under `components/`: `Bad.tsx`, `Good.tsx`, `HardcodedText.tsx`, `ui/Button.tsx`, `ui/DesktopPreload.ts` and `branches/*.tsx`. CSS samples are in `styles/`. |
| `tools/ui-foundation/fixtures/renderer-clean/` | Clean sample tree. |

## How it works

### Primitives and features

- Primitives are plain SolidJS components. Most use `cva` for variants and `cx` for class joins.
- Kobalte is the behaviour engine. Only `packages/ui` may import `@kobalte/core` or `lucide-solid`. Features get them through `complex.tsx`, `icons.ts`, and the primitive files.
- `complex.tsx` keeps the public names (`Dialog`, `DropdownMenu`, and others) stable. It also fixes lost focus after dialogs, menus and popovers close (`focusRestoreHandler`).
- `Dialog.Content` and `AlertDialog.Content` add the class `ui-dialog-content`. `Dialog.Overlay` adds `ui-dialog-overlay`. `dialogShown()` counts mounted dialogs.
- Features import primitives from `@codebot/ui`. Shared feature components come from explicit subpaths, for example `@codebot/ui/features/sidebar/Sidebar` (per docs).

### Feature domains (`packages/ui/src/features/`)

| Domain | TS/TSX files | CSS files | Notes |
|---|---|---|---|
| conversation | 164 | 56 | Chat, composer, messages, threads, browser preview. Uses `conversation.css` manifest. |
| settings | 60 | 18 | Settings pages, provider settings, integrations. |
| workflows | 59 | 2 | Workflow editor and run views. |
| sidebar | 50 | 7 | Sidebar sections, rows, tabs, search, storage card. |
| browser | 23 | 1 | Browser dock, tabs, profiles, address row. |
| servers | 23 | 12 | Server install, paywall, roles, audit log, update. |
| marketplace | 22 | 1 | Marketplace list and details. |
| files | 19 | 1 | File explorer and preview. |
| agents | 15 | 4 | Agent picker, avatar, templates, first-agent setup, publish dialog. |
| billing | 12 | 4 | Billing dialog, order form, storage tiers. |
| credits | 12 | 4 | Credits sections, redeem and move dialogs. |
| vault | 12 | 1 | Vault UI. |
| custom-providers | 16 | 1 | Custom provider UI. |
| account | 11 | 4 | Login, OTP input, loading screens, language wheel. |
| crm | 13 | 1 | CRM UI. |
| agent-dock | 5 | 1 | Dock and chat. |
| channels | 8 | 3 | Channel avatar, folders, members, activity. |
| connectors | 3 | 0 | Connector detail panel and catalog. |
| dynamic-island | 3 | 2 | Island surface. |
| others (14 folders) | 1 to 6 each | 0 to 2 | github-star, import, mobile-app, provider-diagnostics, provider-updates, referral, remote-desktop, social-follow, tasks, team, transfer, updates, usage, window. |

Feature folders also hold `*-store.ts` and `*-motion.ts` modules (for example `billing-store.ts`, `credits-store.ts`, `agent-dock-motion.ts`).

### Styles

- `src/renderer/src/styles.css` imports `@codebot/brand/tokens.css` (dark values), then `@codebot/brand/tokens-light.css`, which applies when the root has `data-codebot-color-scheme="light"`.
- `packages/ui/src/styles/primitives.css` is the `./styles.css` export. Feature sheets sit next to features (`features/<domain>/<name>.css`).
- The renderer's `src/renderer/src/styles/` holds `base.css`, `app-shell.css` and others (outside this map; the docs mention them).
- `conversation.css` is the only manifest. Its `@import` order is the cascade. Other feature sheets are imported by the app.

### Tokens (naming)

- Prefix: `--codebot-`.
- Colours: `--codebot-bg-*`, `--codebot-text-*` (for example `--codebot-text-primary`, `-secondary`, `-muted`, `-dim`), `--codebot-border-*`, `--codebot-danger`, `--codebot-success`, `--codebot-warning`, `--codebot-glass-*`, `--codebot-provider-*`, `--codebot-chart-*`.
- Type sizes: `--codebot-text-sm` (13px), `-md` (14px), `-lg` (15px), `-xl` (16px), `-2xl` (18px), `-3xl` (24px), `-display` (32px), `-hero` (clamp).
- Font: `--codebot-font-sans`, `--codebot-font-mono`. Weights: `--codebot-weight-regular` (used in `primitives.css`).
- Spacing: `--codebot-space-0-5` (2px), `-1` (4px), `-1-5` (6px), `-2` (8px), `-3` (12px), `-4` (16px), `-6` (24px), `-8` (32px).
- Radius: `--codebot-radius-xs` (4), `-sm` (6), `-md` (8), `-lg` (12), `-card` (14), `-xl` (20), `-bubble` (22), `-modal` (30), `-pill` (999px), `-logo` (20%).
- Control heights: `--codebot-control-xs` (24px), `-sm` (28px), `-md` (32px), `-lg` (36px), `-xl` (40px).
- Motion: `--codebot-duration-fast` (120ms), `-hover` (0ms), `-dialog` (100ms), `-normal` (160ms), `-slow` (200ms), `-overlay` (240ms), `-toast-enter` (340ms), `-toast-exit` (220ms). Easing: `--codebot-ease-out`, `--codebot-ease-in-out`.
- Shadows: `--codebot-shadow-raised`, `--codebot-shadow-overlay`, `--codebot-shadow-dialog`, `--codebot-shadow-menu`.
- Counts (approximate, from grep): `tokens.css` about 314 declarations, `tokens-light.css` about 107, `tokens-native.css` about 132.

### Text and i18n at runtime

- `TextProvider` (in `packages/ui/src/text.tsx`) takes `locale` and optional `formatLocale`. It also wraps Kobalte's `I18nProvider`.
- `useText()` returns `TextValue`: `locale`, `t`, `format`, `errorMessage(error, fallback)`, `errorDetails`, `sourceText(text)`.
- `currentText()` returns the active value for code outside components.
- `useText` is used in about 415 files under `packages/ui/src`. The `@codebot/ui/text` import appears in about 105 files there.
- `t(key, params)` uses `translateFor(locale)`. Missing translated keys fall back to English. Missing English keys return the key itself.
- `sourceText(text)` takes an English string from the backend (an error or status string). It matches the string against the templates in `en/source.ts`. If one matches, it returns the translated template. Otherwise it returns the text unchanged. Nested `{reason}` and `{detail}` values are localized up to depth 2.
- Example callers: `ProviderPicker.tsx` (`sourceText(option().message ?? "")`) and `ProviderModelPicker.tsx`.

### check:ui

Entry: root `package.json` line 559, `"check:ui": "bun scripts/ui-foundation-check.ts"`. It also runs inside `check:desktop:static` (line 555).

Main call (in `scripts/ui-foundation-check.ts`, `import.meta.main`):
- `rendererRoot` = `src/renderer/src`
- `labelRoot` = repo root
- `reachableRoots` = `src`, `apps`, `packages/ui/src`
- `uiRoot` = `packages/ui/src`

Rules, in the order they run:

1. Native elements. A `.ts` or `.tsx` file outside the exempt area must not contain `<button`, `<input`, `<textarea` or `<select`.
2. Direct imports. No `from "@kobalte/core..."` or `from "lucide-solid..."` outside the exempt area.
3. No hand-rolled switch: `role="switch"` is an error.
4. Inline colour literals in `.tsx` `style` objects (hex, `rgb(`, `rgba(`, `hsl(`, named colours) are errors.
5. Inline `font-size`, `border-radius`, `transition` or `transition-duration` in `.tsx` must use `var(`.
6. `complex.tsx` must not contain `export const X = XPrimitive;` (direct Kobalte alias).
7. Every class declared in a `.css` file must appear as a word in some reachable `.tsx`, `.ts` or `.html` file, or match a template prefix (`prefix-${...}`). Otherwise the rule is unused and the error says "delete the rule".
8. Budgets (all max 0; counts may only go down):
   - hand-rolled composite ARIA roles (`role="dialog|alertdialog|menu|tablist|tab|tabpanel|listbox|option"`) outside the exempt area
   - `data-testid=` in non-test `.ts` and `.tsx` files under `src/renderer/src` and `packages/ui/src`
   - colour literals in the renderer and `packages/ui` stylesheets (hex, rgb(a), hsl(a), named colours)
   - untokenized `font-size:` in CSS
   - untokenized `border-radius:` in CSS
   - untokenized transition durations in CSS

Success message: `UI foundation check passed. Legacy composite debt: N/0.`

Exempt area (`insideUi`): files under `packages/ui/src`, except those under `features/` or `components/`. Test files (`*.test.ts(x)`) are skipped.

Grit rules (Biome plugins, in `tools/ui-foundation/`): see the key files table. `biome.json` loads them as `plugins` (around lines 289, 305 and 309).

### i18n:check

Entry: root `package.json` line 218, `"i18n:check": "bun scripts/i18n-check.ts"`.

Flags:
- `--fix`: sorts keys in each non-English module into English order, and rewrites `untranslated.json` from the current gaps.
- `--accept=<locale>`: records every gap for that locale in `untranslated.json`.
- `--json`: writes `.codebot-build/i18n-report.json`.

Checks, in order:

1. Each `en` module exports `messages` (a plain object). Each value is a string or a plural object.
2. Each key starts with the module prefix (module path with `/` changed to `.`, plus `.`). For example `en/error/agent.ts` keys start with `error.agent.`.
3. No key appears in two modules.
4. Every translated locale (`TRANSLATED_LOCALES` except `en`) has a module with the same name. Missing ones fail with "Create it, even when it is empty."
5. In each locale module: no key missing from English, same shape (string or plural), a `other` form for plurals, and only placeholders that English also uses.
6. Missing translations: each key missing in a locale must be listed in `untranslated.json` (or accepted). Otherwise it fails with "is not translated. Translate it; see docs/i18n.md."
7. `untranslated.json` must not list keys that are now translated or removed.
8. For `error/*` and `status/*` keys: the English text (with `{count}` set to 2) must match only its own key. Otherwise two keys are ambiguous for `sourceText`.
9. Every English key must appear as a quoted string in code under `src`, `packages`, `apps/mobile/src`, `apps/auth-api/src`, `apps/browser-extension/src`, `remote/api/src` or `scripts`. Otherwise it fails with "is not used." Exception: `RELEASED_SOURCE_KEYS` (20 keys in `i18n-check.ts`).

Aggregator files (`index`, `mobile`, `source`, `shared`) are not checked as area modules.

## How to change it

### Pick a control

- Immediate action: `Button`. Icon-only action: `IconButton` (always pass `label`). Action inside text: `Button variant="link"`.
- State or category: `Badge`, which is not a button. Work in progress: `Spinner` or `Skeleton`.
- Binary setting applied at once: `Switch`. Value submitted with a form: `Checkbox` or `RadioGroup`.
- Short list of choices: `RadioGroup`. Longer list: `Select`. Searchable list or custom value: `Combobox`.
- Rows of items: `ItemGroup` and `Item` (`item.tsx`). Long scrollable lists: `VirtualListbox` (`components/`).
- Peer views: `Tabs` or `SlidingTabs`. Actions next to a trigger: `DropdownMenu`. Right-click: `ContextMenu`.
- Light information on an element: `Tooltip` or `Popover`. A task that needs focus: `Dialog`. Irreversible confirmation: `AlertDialog` or `ConfirmDialog`.
- Feedback: `Alert` for inline state. `toast()` for a transient message (`TOAST_DURATION` is 6000 ms).

### Use a button or icon button

```tsx
import { Button, IconButton } from "@codebot/ui";
import { X } from "@codebot/ui/icons";
import { useText } from "@codebot/ui/text";

const { t } = useText();
<Button variant="secondary" size="sm" loading={busy()} loadingLabel={t("common.saving")}>{t("common.save")}</Button>
<IconButton label={t("common.close")} tooltip={t("common.closeShortcut")}><X /></IconButton>
```

- Variants: `default`, `outline`, `secondary`, `ghost`, `destructive`, `destructive-ghost`, `link`.
- Sizes: `default`, `xs`, `sm`, `lg`, `icon`, `icon-xs`, `icon-sm`, `icon-lg`.
- Never use a native `<button>`. `check:ui` fails.
- Icons: import from `icons.ts` (`@codebot/ui/icons` or `@codebot/ui`). Do not import `lucide-solid` directly.

### Use a dialog, a confirmation or a menu

- Dialog: `Dialog.Root`, `Dialog.Trigger`, `Dialog.Portal`, `Dialog.Overlay`, `Dialog.Content`, `Dialog.Title`, `Dialog.Description`, `Dialog.CloseButton` (all from `complex.tsx`).
- Irreversible confirmation: `ConfirmDialog` (`@codebot/ui/confirm-dialog`) or `AlertDialog`.
- Menu: `DropdownMenu` (its sub-parts include `Item`, `CheckboxItem`, `RadioGroup`, `RadioItem`, `SubContent`). Right-click: `ContextMenu`.
- Do not hand-write `role="dialog"` or `role="menu"`. The check counts these.

### Add a form field

- Wrap `Input`, `Textarea` or `NativeSelect` in `Field` (`form.tsx`). `Field` wires the label, description, error and `aria-describedby`.
- Use `Switch` only for an immediate change. Use `Checkbox` or `RadioGroup` when the form is submitted.

### Add a feature component

1. Create `packages/ui/src/features/<domain>/<Name>.tsx`. Props and callbacks only. Do not call `window.codebot`.
2. Add an export line to `packages/ui/package.json` `exports`:
   `"./features/<domain>/<Name>": "./src/features/<domain>/<Name>.tsx"`.
3. If the feature has CSS, put it in `features/<domain>/<name>.css` and add the import in the app stylesheet in the correct order. For conversation, add an `@import` to `features/conversation/conversation.css`. Keep the manifest order.
4. Use tokens only (no colour literals; no raw `font-size`, `border-radius` or `transition` numbers).
5. Run `bun run check:ui` (see "Verify" below).

### Add a design token

1. Add the dark value in `packages/brand/src/tokens.css` under `:root`. A new token name is declared here first. The light and native files only override values.
2. If the light scheme needs a different value, add it under `:root[data-codebot-color-scheme="light"]` in `tokens-light.css`. Do not declare a new token there (per docs).
3. For native mobile, check `tokens-native.css` (add there only if mobile needs it).
4. Use it as `var(--codebot-...)` in CSS. Do not hard-code the value in a feature.

### Add an i18n key to an existing area

1. Open the English module `packages/i18n/src/messages/en/<area>.ts`. Add the key on its own line, prefixed with the module name, for example `"dialog.chooseFolder": "Choose a folder"`. Keep the English order.
2. Use it in code as `t("dialog.chooseFolder")`. Use a literal key, not a built string, so the check finds it.
3. Add the key to each locale file `packages/i18n/src/messages/<locale>/<area>.ts`, or let the gap list hold it:
   `bun run i18n:check --fix` writes the missing locales into `packages/i18n/untranslated.json`.
   To accept a gap for one locale only: `bun run i18n:check --accept=<locale>`.
4. Placeholders (`{name}`) must match English exactly in every locale.
5. Run `bun run i18n:check`. It must pass. If keys are out of order: `--fix`.

### Add an error message that the backend sends

1. Add the English template in `packages/i18n/src/messages/en/error/<area>.ts` (or `status/`). Use `{detail}` or `{reason}` for nested text.
2. Make sure the English text matches only that key (check rule 8).
3. In UI code, call `sourceText(message)` (from `useText()`) to show the translation.
4. Translate the key in every locale file, or add it to `untranslated.json`.

### Add a new area module (new file)

1. Create `packages/i18n/src/messages/en/<area>.ts`:
   `export const messages = defineMessages("<area>", { "<area>.x": "..." });`
2. Import it and spread it into `en` in `packages/i18n/src/messages/en/index.ts`.
3. Create the same file in all 14 other locale folders (`ar, de, es, fr, he, it, ja, ko, nl, pl, pt, ru, tr, zh`). Each may be empty: `export const messages = {};`.
4. Import the module and spread it into each locale's `index.ts`, the same way as `ar/index.ts`, which exports `export const ar = {...}`.
5. Run `bun run i18n:check`.

### Add a primitive

1. Create `packages/ui/src/<name>.tsx` (or `.ts`).
2. If it is shared broadly, add `export * from "./<name>";` to `packages/ui/src/index.ts`. If not, add a subpath export to `packages/ui/package.json`.
3. Use `cva` for variants and `cx` for classes, like `button.tsx`.
4. Style it in `packages/ui/src/styles/primitives.css` (or a new sheet imported by the app).

### Verify your change

- `bun run check:ui` (UI rules and budgets).
- `bun run i18n:check` (catalogs).
- `bun run check:desktop:static` runs `check:ui` among other checks.
- Do not run builds or tests from this map. Follow the root instructions for focused checks.

## Gotchas

- check:ui exempts only top-level files in `packages/ui/src`. Files in `packages/ui/src/features/` and `components/` are checked. Confirmed: no JSX native elements or Kobalte or Lucide imports exist in `features/` or `components/`. Attribute selectors in strings, such as `'[role="dialog"]'` in `features/conversation/composer-focus.ts`, are not markup and are not flagged.
- Top-level shared files (`checkbox.tsx`, `color-picker.tsx`, `dynamic-island.tsx`, `form.tsx`, `questionnaire.tsx`) contain native `<input>` or `<button>` elements, and `color-picker.tsx` has `role="dialog"`. They are exempt by design. `button.tsx` and `complex.tsx` contain no native elements.
- Budgets are zero. A new `data-testid`, colour literal or `role="menu"` in a feature fails the check. Budgets may only go down.
- CSS rules must be reachable. A class declared in a stylesheet but never used in any scanned markup fails the check. Delete the rule, or use it.
- `Button` blocks click and Enter or Space while `loading` is true (it guards with capture listeners). Do not rely on `disabled` alone for loading.
- `Button` has `outline` and `destructive-ghost` variants that are not in `docs/ui-foundation.md`. The doc lists `default`, `secondary`, `ghost`, `destructive`, `link`.
- `Text` and `Heading` live in `typography.tsx`. They are exported from `@codebot/ui`. The i18n context (`useText`) is NOT exported from the barrel; import it from `@codebot/ui/text`.
- `packages/ui/src/index.ts` does not re-export `text.tsx`, `utils.ts` or `data.ts`.
- `packages/ui/AGENTS.md` says: do not add a `t` prop. Call `useText()` instead.
- `complex.tsx` is the only place that may alias Kobalte namespaces. A direct alias (`export const X = XPrimitive;`) fails the check.
- Hover styles belong inside `@media (hover: hover) and (pointer: fine)`. Animations stay below 300 ms and respect `prefers-reduced-motion` (per docs; not checked by script).
- Light tokens: values only. A new token must be declared in `tokens.css` first.
- `i18n:check` rejects block comments (`/* */`) inside a catalog. Use `//` line comments.
- `i18n:check` rejects template literals with `${}` inside a catalog.
- Each catalog key must start on its own line. Text after a comma on the same line is rejected.
- Every new English key must be used by a literal string in code, or the check fails with "is not used."
- Every English module must exist in all 14 other locale folders. A missing file fails the check.
- For `error/` and `status/` keys, the English text must match only one key. Two similar messages break `sourceText`.
- `sourceText` only translates English backend strings. It does not translate arbitrary text. Unmatched text passes through unchanged.
- `untranslated.json` is generated. Do not hand-edit it. Use `--fix` or `--accept=`.
- The `RELEASED_SOURCE_KEYS` list in `scripts/i18n-check.ts` exempts 20 error keys from the unused-key check. Do not add keys to it without a reason.
- `window.codebot` is forbidden in shared UI. Pass actions in as props (Grit rule and AGENTS rule).
- Dialogs and menus use wrappers in `complex.tsx` for focus restore. Do not use the raw Kobalte primitives.
- Lucide and Kobalte are pinned in the root `package.json` `catalog` (`lucide-solid` 1.33.0, `@kobalte/core` 2.0.0-alpha.0). Patches exist at `patches/@kobalte%2Fcore@2.0.0-alpha.0.patch` and `patches/lucide-solid@1.33.0.patch`.
- `docs/ui-foundation.md` says `styles/base.css` and `styles/app-shell.css` hold the reset and theme layer. These files are in `src/renderer/src/styles/`, not in `packages/ui`.
- Native mobile uses brand tokens and contracts, not `packages/ui` (per AGENTS). Mobile has its own catalog (`en/mobile/*`).

## Unverified points

- Expected results in `scripts/ui-foundation-check.test.ts` and the `tools/ui-foundation/fixtures` tree (test file not read).
- Content of `packages/i18n/src/plural.ts` (only its signature was confirmed).
- Content of each locale `messages/<locale>/index.ts` beyond its `export const <locale>` shape.
- Meaning of the nested `@variant light` syntax in `packages/brand/src/tokens-native.css`.
- Storybook config contents (`.storybook/` exists at the repo root; `packages/ui` has no stories).
- Whether every feature file has a `package.json` subpath export (only a sample was checked).
- Whether each Vite config that uses `lazyLanguageCatalogs` (`apps/auth-api/vite.config.ts`, `apps/browser-extension/vite.config.ts`, `electron.vite.config.ts`, by grep) gets the expected lazy behaviour.
- Key and locale counts are approximate (grep counts of key-shaped lines): about 11,800 English keys outside `mobile/`, about 5,000 in `mobile/`, about 1,743 gap entries in `untranslated.json` (grep count).
- `docs/i18n.md` (linked by `packages/ui/AGENTS.md` and the check messages) was not read; it is outside this scope.
- The renderer stylesheet import order (in `src/renderer/src`) was not read.
