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

const WRITTEN_MARKER_FILE = ".built-in.json";

const decodeWrittenFiles = Schema.decodeUnknownOption(
  Schema.fromJsonString(Schema.Record(Schema.String, Schema.String)),
);

function builtInFileText(palette: AppThemePalette): string {
  const file = { name: palette.name, appearance: palette.scheme, colors: palette.colors };
  return `${JSON.stringify(file, null, 2)}\n`;
}

async function readMarker<T>(path: string, decode: (text: string) => Option.Option<T>, fallback: T): Promise<T> {
  return readFile(path, "utf8").then(
    (text) => Option.getOrElse(decode(text), () => fallback),
    () => fallback,
  );
}

export const seedThemePalettes = Effect.fn("ThemePaletteFiles.seed")(function* (directory: string) {
  yield* Effect.tryPromise(async () => {
    await mkdir(directory, { recursive: true });
    const markerPath = join(directory, SEEDED_MARKER_FILE);
    const writtenPath = join(directory, WRITTEN_MARKER_FILE);
    const seeded = new Set(await readMarker(markerPath, decodeSeededIds, []));
    const written: Record<string, string> = { ...(await readMarker(writtenPath, decodeWrittenFiles, {})) };
    let changed = false;
    for (const palette of BUILT_IN_THEME_PALETTES) {
      const text = builtInFileText(palette);
      const path = join(directory, `${palette.id}.json`);
      if (!seeded.has(palette.id)) {
        const created = await writeFile(path, text, { encoding: "utf8", flag: "wx" }).then(
          () => true,
          (error: NodeJS.ErrnoException) => {
            if (error.code !== "EEXIST") throw error;
            return false;
          },
        );
        if (created) written[palette.id] = text;
        seeded.add(palette.id);
        changed = true;
        continue;
      }
      const previous = written[palette.id];
      if (previous === undefined || previous === text) continue;
      const current = await readFile(path, "utf8").catch(() => null);
      if (current !== previous) continue;
      await writeFile(path, text, "utf8");
      written[palette.id] = text;
      changed = true;
    }
    if (!changed) return;
    await writeFile(writtenPath, `${JSON.stringify(written, null, 2)}\n`, "utf8");
    await writeFile(markerPath, `${JSON.stringify([...seeded].sort())}\n`, "utf8");
  }).pipe(
    Effect.catch((error) =>
      Effect.sync(() => logger.warn("Could not write the built-in theme palette files.", { error: toLogValue(error) })),
    ),
  );
});
