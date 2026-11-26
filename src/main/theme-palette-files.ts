import { type FSWatcher, watch } from "node:fs";
import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  APP_THEME_PALETTE_COLOR_PATTERN,
  type AppThemePalette,
  isAppThemePaletteId,
} from "@codebot/contracts/app-appearance";
import { BUILT_IN_THEME_PALETTES } from "@codebot/contracts/app-theme-defaults";
import { createCodeBotLogger, toLogValue } from "@codebot/logging";
import { Effect, Option, Schema } from "effect";

const logger = createCodeBotLogger("theme-palette-files");

export const THEME_PALETTE_DIRECTORY = "themes";

const MAX_PALETTE_FILE_BYTES = 64 * 1024;

const MAX_PALETTE_FILES = 32;

const color = Schema.String.check(Schema.isPattern(APP_THEME_PALETTE_COLOR_PATTERN));

const ThemePaletteFile = Schema.Struct({
  name: Schema.String.check(Schema.isTrimmed(), Schema.isMinLength(1), Schema.isMaxLength(64)).check(
    Schema.isPattern(/^[^\p{Cc}]+$/u),
  ),
  appearance: Schema.Literals(["light", "dark"]),
  colors: Schema.Struct({
    canvas: color,
    frame: color,
    sidebar: color,
    surface: color,
    text: color,
    textMuted: color,
    border: color,
    accent: color,
    accentForeground: color,
    success: color,
    warning: color,
    danger: color,
  }),
});

const SEEDED_MARKER_FILE = ".seeded.json";

const decodeSeededIds = Schema.decodeUnknownOption(Schema.fromJsonString(Schema.Array(Schema.String)));

const decodeThemePaletteFile = Schema.decodeUnknownOption(Schema.fromJsonString(ThemePaletteFile));

function paletteId(fileName: string): string | null {
  if (!fileName.endsWith(".json")) return null;
  const id = fileName.slice(0, -".json".length);
  return isAppThemePaletteId(id) ? id : null;
}

const readThemePalette = Effect.fn("ThemePaletteFiles.readOne")(function* (directory: string, id: string) {
  const path = join(directory, `${id}.json`);
  const text = yield* Effect.tryPromise(async () => {
    const info = await stat(path);
    if (!info.isFile() || info.size > MAX_PALETTE_FILE_BYTES) return null;
    return readFile(path, "utf8");
  }).pipe(Effect.orElseSucceed(() => null));
  if (text === null) return null;
  const file = decodeThemePaletteFile(text);
  if (Option.isNone(file)) {
    logger.warn("Skipped a theme palette file that is not valid.", { id });
    return null;
  }
  return {
    id,
    name: file.value.name,
    scheme: file.value.appearance,
    colors: { ...file.value.colors },
  } satisfies AppThemePalette;
});

export const readThemePalettes = Effect.fn("ThemePaletteFiles.read")(function* (directory: string) {
  const names = yield* Effect.tryPromise(() => readdir(directory)).pipe(Effect.orElseSucceed(() => []));
  const ids = names
    .map(paletteId)
    .filter((id) => id !== null)
    .sort()
    .slice(0, MAX_PALETTE_FILES);
  const palettes = yield* Effect.forEach(ids, (id) => readThemePalette(directory, id), { concurrency: 4 });
  return palettes.filter((palette) => palette !== null);
});

export const watchThemePalettes = Effect.fn("ThemePaletteFiles.watch")(function* (
  directory: string,
  onChange: () => void,
) {
  yield* Effect.tryPromise(() => mkdir(directory, { recursive: true }));
  const watcher = yield* Effect.try((): FSWatcher => watch(directory, { persistent: false }, () => onChange()));
  watcher.on("error", (error) => {
    logger.warn("Stopped following theme palette files.", { error: toLogValue(error) });
    watcher.close();
  });
  return () => watcher.close();
});

export const seedThemePalettes = Effect.fn("ThemePaletteFiles.seed")(function* (directory: string) {
  yield* Effect.tryPromise(async () => {
    await mkdir(directory, { recursive: true });
    const markerPath = join(directory, SEEDED_MARKER_FILE);
    const seeded = new Set(
      await readFile(markerPath, "utf8").then(
        (text) => Option.getOrElse(decodeSeededIds(text), (): readonly string[] => []),
        (): readonly string[] => [],
      ),
    );
    const missing = BUILT_IN_THEME_PALETTES.filter((palette) => !seeded.has(palette.id));
    if (missing.length === 0) return;
    for (const palette of missing) {
      const file = { name: palette.name, appearance: palette.scheme, colors: palette.colors };
      await writeFile(join(directory, `${palette.id}.json`), `${JSON.stringify(file, null, 2)}\n`, {
        encoding: "utf8",
        flag: "wx",
      }).catch((error: NodeJS.ErrnoException) => {
        if (error.code !== "EEXIST") throw error;
      });
      seeded.add(palette.id);
    }
    await writeFile(markerPath, `${JSON.stringify([...seeded].sort())}\n`, "utf8");
  }).pipe(
    Effect.catch((error) =>
      Effect.sync(() => logger.warn("Could not write the built-in theme palette files.", { error: toLogValue(error) })),
    ),
  );
});
