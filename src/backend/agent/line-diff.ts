const CONTEXT_LINES = 3;
const TABLE_CELL_LIMIT = 1_000_000;

type Operation = { kind: " " | "-" | "+"; line: string };

function splitLines(text: string): string[] {
  if (text === "") return [];
  const lines = text.replace(/\r\n/gu, "\n").split("\n");
  if (lines.at(-1) === "") lines.pop();
  return lines;
}

function commonSubsequence(before: readonly string[], after: readonly string[]): Operation[] {
  const rows = before.length;
  const columns = after.length;
  if (rows * columns > TABLE_CELL_LIMIT)
    return [
      ...before.map((line): Operation => ({ kind: "-", line })),
      ...after.map((line): Operation => ({ kind: "+", line })),
    ];
  const width = columns + 1;
  const lengths = new Uint32Array((rows + 1) * width);
  for (let row = rows - 1; row >= 0; row -= 1) {
    for (let column = columns - 1; column >= 0; column -= 1) {
      lengths[row * width + column] =
        before[row] === after[column]
          ? (lengths[(row + 1) * width + column + 1] ?? 0) + 1
          : Math.max(lengths[(row + 1) * width + column] ?? 0, lengths[row * width + column + 1] ?? 0);
    }
  }
  const operations: Operation[] = [];
  let row = 0;
  let column = 0;
  while (row < rows && column < columns) {
    const beforeLine = before[row] ?? "";
    const afterLine = after[column] ?? "";
    if (beforeLine === afterLine) {
      operations.push({ kind: " ", line: beforeLine });
      row += 1;
      column += 1;
    } else if ((lengths[(row + 1) * width + column] ?? 0) >= (lengths[row * width + column + 1] ?? 0)) {
      operations.push({ kind: "-", line: beforeLine });
      row += 1;
    } else {
      operations.push({ kind: "+", line: afterLine });
      column += 1;
    }
  }
  for (; row < rows; row += 1) operations.push({ kind: "-", line: before[row] ?? "" });
  for (; column < columns; column += 1) operations.push({ kind: "+", line: after[column] ?? "" });
  return operations;
}

function operationsOf(before: readonly string[], after: readonly string[]): Operation[] {
  let start = 0;
  while (start < before.length && start < after.length && before[start] === after[start]) start += 1;
  let beforeEnd = before.length;
  let afterEnd = after.length;
  while (beforeEnd > start && afterEnd > start && before[beforeEnd - 1] === after[afterEnd - 1]) {
    beforeEnd -= 1;
    afterEnd -= 1;
  }
  return [
    ...before.slice(0, start).map((line): Operation => ({ kind: " ", line })),
    ...commonSubsequence(before.slice(start, beforeEnd), after.slice(start, afterEnd)),
    ...before.slice(beforeEnd).map((line): Operation => ({ kind: " ", line })),
  ];
}

export function lineDiff(before: string, after: string): string {
  const operations = operationsOf(splitLines(before), splitLines(after));
  const changed = operations.flatMap((operation, index) => (operation.kind === " " ? [] : [index]));
  if (changed.length === 0) return "";
  const lines: string[] = [];
  let shownThrough = -1;
  for (const index of changed) {
    const from = Math.max(index - CONTEXT_LINES, shownThrough + 1);
    if (shownThrough >= 0 && from > shownThrough + 1) lines.push("@@");
    for (let cursor = from; cursor <= index; cursor += 1) {
      const operation = operations[cursor];
      if (operation) lines.push(`${operation.kind}${operation.line}`);
    }
    shownThrough = Math.max(shownThrough, index);
    const until = Math.min(index + CONTEXT_LINES, operations.length - 1);
    for (let cursor = index + 1; cursor <= until; cursor += 1) {
      const operation = operations[cursor];
      if (operation?.kind !== " ") break;
      lines.push(` ${operation.line}`);
      shownThrough = cursor;
    }
  }
  return lines.join("\n");
}

export function addedLines(text: string): string {
  return splitLines(text)
    .map((line) => `+${line}`)
    .join("\n");
}
