# Themes

PRD items 16.1, 16.2, 16.4, 16.5 and 16.6.

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

At first start CodeBot writes `codebot-dark.json` and `codebot-light.json` there. They are the built-in
palettes, so you can copy and edit them. CodeBot writes each built-in file only once: the file
`.seeded.json` lists the files that it wrote. A file that you delete stays deleted, and a file that
you edit is never replaced.

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

New CSS must use tokens. `bun run check:ui` refuses a literal color. The colors that remain in
`packages/ui` are the logos of payment cards and of brands.

## Test

`bun run test:themes` drives a running dev app (`bun run dev`) and writes
`.codebot-build/themes/report.json`.
