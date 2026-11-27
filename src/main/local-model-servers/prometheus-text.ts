export interface PrometheusSample {
  readonly name: string;
  readonly labels: Readonly<Record<string, string>>;
  readonly value: number;
}

const SAMPLE_LIMIT = 8_192;
const METRIC_NAME = /^[A-Za-z_:][A-Za-z0-9_:]*/u;
const LABEL_NAME = /^[A-Za-z_][A-Za-z0-9_]*/u;

function readLabels(line: string, start: number): { labels: Record<string, string>; end: number } | null {
  const labels: Record<string, string> = {};
  let position = start;
  for (;;) {
    while (line[position] === " " || line[position] === ",") position += 1;
    if (line[position] === "}") return { labels, end: position + 1 };
    const name = LABEL_NAME.exec(line.slice(position))?.[0];
    if (!name) return null;
    position += name.length;
    while (line[position] === " ") position += 1;
    if (line[position] !== "=") return null;
    position += 1;
    while (line[position] === " ") position += 1;
    if (line[position] !== '"') return null;
    position += 1;
    let value = "";
    for (;;) {
      const character = line[position];
      if (character === undefined) return null;
      if (character === '"') break;
      if (character === "\\") {
        const escaped = line[position + 1];
        if (escaped === undefined) return null;
        value += escaped === "n" ? "\n" : escaped;
        position += 2;
        continue;
      }
      value += character;
      position += 1;
    }
    position += 1;
    labels[name] = value;
  }
}

function readValue(text: string): number | null {
  const token = text.trim().split(/\s+/u)[0];
  if (!token) return null;
  const value = Number(token);
  return Number.isFinite(value) ? value : null;
}

export function parsePrometheusText(text: string, wanted: (name: string) => boolean): PrometheusSample[] {
  const samples: PrometheusSample[] = [];
  for (const raw of text.split("\n")) {
    if (samples.length >= SAMPLE_LIMIT) break;
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const name = METRIC_NAME.exec(line)?.[0];
    if (!name || !wanted(name)) continue;
    let rest = name.length;
    let labels: Record<string, string> = {};
    if (line[rest] === "{") {
      const read = readLabels(line, rest + 1);
      if (!read) continue;
      labels = read.labels;
      rest = read.end;
    }
    const value = readValue(line.slice(rest));
    if (value === null) continue;
    samples.push({ name, labels, value });
  }
  return samples;
}

export function hasPrometheusSeries(text: string, prefix: string): boolean {
  for (const raw of text.split("\n")) {
    const line = raw.trimStart();
    if (line.startsWith(prefix)) return true;
  }
  return false;
}
