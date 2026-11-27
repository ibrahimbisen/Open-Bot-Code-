# Themes

PRD items 16.1 to 16.6 and 20.11.

## Choices

Settings > Appearance > Theme has these choices:

- **System** follows the light or dark setting of the operating system. It changes without a restart
  when the operating system changes.
- **Light** and **Dark** use the base tokens of `packages/brand/src/tokens*.css`. Dark is the
  original CodeBot look.
- Each file in the themes folder is one more choice.

## Themes folder

The folder is `themes` in the user data folder of the app. CodeBot watches it: a file that you add,
change or delete shows in the list at once.

At first start CodeBot writes the built-in palettes there, so you can copy and edit them:

| File | Visible name | Appearance |
| --- | --- | --- |
| `codebot-dark.json` | OpenBot Code Dark | dark (the original look) |
| `codebot-light.json` | OpenBot Code Light | light |
| `codebot-dark-modern.json` | OpenBot Code Dark Modern | dark, neutral grey with a blue accent |
| `codebot-light-modern.json` | OpenBot Code Light Modern | light, white with a blue accent |
| `codebot-high-contrast.json` | OpenBot Code High Contrast | dark, black with white text and a yellow accent |
| `codebot-dark-warm.json` | OpenBot Code Warm Dark | dark, brown with an amber accent |
| `codebot-dark-blue.json` | OpenBot Code Blue Dark | dark, navy with a cyan accent |

The values are original. They are not copied from a VS Code theme file. They are in
`packages/contracts/src/app-theme-defaults.ts`. In the five new palettes, text, muted text, accent,
success, warning and danger have a contrast of at least 4.5 on each background. In High Contrast,
text and muted text have at least 7 (WCAG AAA). The app also makes the text colours readable: when a
palette applies, muted text, dim text, accent text, success, warning and danger text and the code
colours of chat code blocks are moved toward the text colour until they reach 4.5 on every background,
also on selected rows and accent-tinted cards (`src/renderer/src/theme-palette.ts`). This keeps the
two original palettes and palette files that users write readable. The default look without a palette
does not change. CodeBot writes each built-in file only once: the file
`.seeded.json` lists the files that it wrote. A file that you delete stays deleted, and a file that
you edit is never replaced. A palette that a new version adds is written at the next start. The file
`.built-in.json` keeps the text that CodeBot wrote for each built-in file. When a new version changes a
built-in palette and the file still holds that text, CodeBot replaces it with the new values. A file
that a version before `.built-in.json` wrote keeps its old values; test:themes refreshes such files.

In High Contrast, an own chat bubble shows on the surface with a ring in the chat colour, so its text
stays at WCAG AAA. A solid chat bubble in every other theme uses dark or white text, whichever has the
better contrast on the chat colour.

A palette file:

```json
{
  "name": "My theme",
  "appearance": "dark",
  "colors": {
    "canvas": "#1a1a1a",
    "frame": "#0d0d0d",
    "sidebar": "#1a1a1a",
    "surface": "#212121",
    "text": "#ffffff",
    "textMuted": "#979797",
    "border": "#3a3a3a",
    "accent": "#007cf7",
    "accentForeground": "#ffffff",
    "success": "#31cf76",
    "warning": "#ff9412",
    "danger": "#fd2f3b"
  }
}
```

- The file name (without `.json`) is the id: lowercase letters, digits and `-`.
- `appearance` is `light` or `dark`. It selects the base tokens for values that the palette does not set.
- Each color is `#rrggbb` or `#rrggbbaa`. A file with a wrong value, or larger than 64 KB, is skipped.
  CodeBot reads at most 32 files.

## What a palette reaches

`src/renderer/src/theme-palette.ts` turns the 12 colors into the `--codebot-*` tokens for chats, the
file tree, panels, the browser frame, dialogs and menus. The main process also uses the canvas as the
window background.

For the editor, `src/renderer/src/editor-theme.ts` derives these from the same palette (or from the
built-in palette of the scheme, when no palette file is chosen):

- CSS tokens `--codebot-editor-*` (background, foreground, gutter, selection, line highlight, cursor,
  guides, widget, scrollbar, diff, error, warning) and `--codebot-syntax-*` (comment, keyword, string,
  number, type, function, variable, operator, regexp).
- `monacoThemeData(palette)`: the data for `monaco.editor.defineTheme`. `currentEditorTheme()` gives
  the active data and `onEditorTheme(listener)` reports each change, so the editor calls `defineTheme`
  and `setTheme` again. `EDITOR_THEME_NAME` is the theme name to use.
- `applyMonacoTheme` in `src/renderer/src/features/explorer/monaco-runtime.ts` uses these rules and
  colors for the file editor and the diff view, and applies them again at each theme change.

New CSS must use tokens. `bun run check:ui` refuses a literal color. The colors that remain in
`packages/ui` are the logos of payment cards and of brands.

## Test

`bun run test:themes` drives a running dev app and writes `.codebot-build/themes/report.json` and
the screenshots in `.codebot-build/themes/screens/`. Start the app with the stand-in provider, so a
chat can show a reply with a code block without a model:

```sh
CODEBOT_CODEX_PATH="$(bun scripts/themes-stand-in.ts)" bun run dev
bun run test:themes
```

The test:

- checks the palette files, the visible names and the contrast of each palette;
- checks that System follows the light or dark setting of the operating system without a restart;
- opens the project "Theme demo" (it creates it on `.codebot-build/themes/workspace` when it is
  missing), and for each built-in palette checks the computed colors of the left bar, the project
  list, the chat list, a chat with a code block, the file tree, Monaco (background and keyword
  color), a dock panel, the browser frame, the panel menu, Settings and the New project dialog. Each
  background must follow the light or dark appearance, and each text must have a contrast of 4.5 (3
  for large text, 7 in High Contrast). This applies to all seven palettes, the two original ones too.
  It archives the chats of earlier runs first, so the chat list shows one chat;
- takes a screenshot of each view in each palette: `main`, `chat`, `editor`, `dock`, `settings` and
  `dialog`;
- adds a palette file and checks that it shows in Settings without a restart.
