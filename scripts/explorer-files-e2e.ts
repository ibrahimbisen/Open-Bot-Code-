import assert from "node:assert/strict";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import {
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  realpath,
  rename,
  rm,
  stat,
  symlink,
  utimes,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import {
  EXPLORER_LIMITS,
  type ExplorerChange,
  type ExplorerScope,
  type ExplorerText,
  isExplorerDirectory,
  isExplorerFile,
  isExplorerRoots,
} from "@codebot/contracts/ipc";
import { setAgentProjectContextSource } from "../src/backend/projects/project-context";
import { explorerScopeFolders } from "../src/main/explorer/explorer-roots";
import { createExplorerService, type ExplorerService } from "../src/main/explorer/explorer-service";

const OUT = resolve(import.meta.dirname, "../.codebot-build/explorer-files-e2e");
const EVENT_DEADLINE_MS = 20_000;
const SCOPE: ExplorerScope = { agentId: "agent-e2e" };

interface Check {
  name: string;
  passed: boolean;
  detail?: unknown;
  error?: string;
}

const report: { passed: boolean; platform: string; checks: Check[] } = {
  passed: false,
  platform: process.platform,
  checks: [],
};

async function check(name: string, run: () => Promise<unknown>): Promise<void> {
  try {
    const detail = await run();
    report.checks.push({ name, passed: true, ...(detail === undefined ? {} : { detail }) });
    process.stdout.write(`ok   ${name}\n`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    report.checks.push({ name, passed: false, error: message });
    process.stdout.write(`FAIL ${name}\n     ${message.split("\n").join("\n     ")}\n`);
  }
}

async function refused(run: () => Promise<unknown>, expected: RegExp, label: string): Promise<string> {
  try {
    await run();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    assert.match(message, expected, `${label}: the refusal has another text.`);
    return message;
  }
  throw new Error(`${label}: the request was not refused.`);
}

const OUTSIDE = /not in the folders of the project/u;

const base = await realpath(await mkdtemp(join(tmpdir(), "codebot-explorer-")));
const rootA = join(base, "project");
const rootB = join(base, "library");
const outside = join(base, "outside");
const trashed: string[] = [];
const revealed: string[] = [];

function service(recursive?: boolean): ExplorerService {
  return createExplorerService({
    folders: () => [rootA, rootB, join(base, "missing-folder"), rootA],
    trash: async (path) => {
      trashed.push(path);
      await rm(path, { recursive: true, force: true });
    },
    reveal: (path) => {
      revealed.push(path);
    },
    watch: recursive === undefined ? { coalesceMs: 60 } : { coalesceMs: 60, recursive },
  });
}

class Changes {
  readonly #seen: ExplorerChange[] = [];
  #waiters: (() => void)[] = [];

  readonly add = (change: ExplorerChange): void => {
    this.#seen.push(change);
    for (const wake of this.#waiters.splice(0)) wake();
  };

  get all(): readonly ExplorerChange[] {
    return this.#seen;
  }

  async until(label: string, found: (change: ExplorerChange) => boolean): Promise<ExplorerChange> {
    const deadline = Date.now() + EVENT_DEADLINE_MS;
    let from = 0;
    for (;;) {
      for (; from < this.#seen.length; from += 1) {
        const change = this.#seen[from];
        if (change && found(change)) return change;
      }
      const left = deadline - Date.now();
      if (left <= 0) throw new Error(`No watch event for: ${label}. Seen: ${JSON.stringify(this.#seen.slice(-5))}`);
      await new Promise<void>((wake) => {
        const timer = setTimeout(wake, left);
        this.#waiters.push(() => {
          clearTimeout(timer);
          wake();
        });
      });
    }
  }
}

let canLinkFiles = true;
let canLinkFolders = true;

try {
  await mkdir(join(rootA, "src", "deep", "a", "b"), { recursive: true });
  await mkdir(join(rootA, "docs"));
  await mkdir(join(rootA, "tests"));
  await mkdir(join(rootA, "node_modules", "pkg"), { recursive: true });
  await mkdir(join(rootA, ".git"));
  await mkdir(rootB);
  await mkdir(outside);
  await writeFile(join(outside, "secret.txt"), "secret");
  await writeFile(join(outside, "secret.png"), Buffer.from([0x89, 0x50, 0x4e, 0x47]));
  await writeFile(join(rootA, "README.md"), "# Project\n");
  await writeFile(join(rootA, ".hidden"), "x");
  await writeFile(join(rootA, "zeta.txt"), "z");
  for (const name of ["file10.txt", "file2.txt", "File1.txt", "b.ts", "a.ts"]) {
    await writeFile(join(rootA, "src", name), name);
  }
  await writeFile(join(rootA, ".git", "HEAD"), "ref: refs/heads/main\n");
  await writeFile(join(rootB, "lib.txt"), "library");
  await symlink(outside, join(rootA, "link-out"), "junction").catch(() => {
    canLinkFolders = false;
  });
  await symlink(join(rootA, "docs"), join(rootA, "link-in"), "junction").catch(() => {
    canLinkFolders = false;
  });
  await symlink(join(outside, "secret.txt"), join(rootA, "link-file.txt"), "file").catch(() => {
    canLinkFiles = false;
  });

  const explorer = service();

  await check("scope: an agent without a project gets its workspace and its added folders", async () => {
    const agents = {
      listAgents: () => [{ id: "agent-e2e", workspacePath: rootA, additionalFolders: [rootB] }],
    };
    setAgentProjectContextSource(() => null);
    assert.deepEqual(explorerScopeFolders(SCOPE, agents), [rootA, rootB]);
    assert.throws(() => explorerScopeFolders({ agentId: "other" }, agents), /does not exist/u);
    setAgentProjectContextSource((agentId) =>
      agentId === "agent-e2e"
        ? {
            projectId: "project-1",
            projectName: "Project",
            mainFolder: rootB,
            folders: [rootB, outside],
            accessLevel: "normal",
            replyRule: null,
            instructions: "",
          }
        : null,
    );
    assert.deepEqual(explorerScopeFolders(SCOPE, agents), [rootB, rootB, outside]);
    setAgentProjectContextSource(() => null);
  });

  await check("roots: each existing folder is one root, a missing folder is left out", async () => {
    const roots = await explorer.files.roots(SCOPE);
    assert.ok(isExplorerRoots(roots), "The roots do not pass the contract check.");
    assert.deepEqual(
      roots.roots.map((root) => root.path),
      [rootA, rootB],
    );
    assert.deepEqual(
      roots.roots.map((root) => root.name),
      ["project", "library"],
    );
    return roots;
  });

  await check("tree: folders first, natural name order, hidden files shown", async () => {
    const top = await explorer.files.list({ scope: SCOPE, path: rootA });
    assert.ok(isExplorerDirectory(top), "The listing does not pass the contract check.");
    const names = top.entries.map((entry) => entry.name);
    const folders = top.entries.filter((entry) => entry.kind === "directory").map((entry) => entry.name);
    const expectedFolders = [
      ".git",
      "docs",
      ...(canLinkFolders ? ["link-in", "link-out"] : []),
      "node_modules",
      "src",
      "tests",
    ];
    assert.deepEqual(folders, expectedFolders);
    assert.deepEqual(names.slice(0, folders.length), folders, "A file is before a folder.");
    assert.ok(names.includes(".hidden"), "The hidden file is not listed.");
    const source = await explorer.files.list({ scope: SCOPE, path: join(rootA, "src") });
    assert.deepEqual(
      source.entries.map((entry) => entry.name),
      ["deep", "a.ts", "b.ts", "File1.txt", "file2.txt", "file10.txt"],
    );
    const file = source.entries.find((entry) => entry.name === "file10.txt");
    assert.equal(file?.size, "file10.txt".length);
    assert.ok((file?.modifiedAt ?? 0) > 0, "The modified time is missing.");
    assert.equal(file?.path, join(rootA, "src", "file10.txt"));
    if (canLinkFolders) {
      assert.equal(top.entries.find((entry) => entry.name === "link-out")?.symlink, true);
      assert.equal(top.entries.find((entry) => entry.name === "src")?.symlink, false);
    }
    return { top: names, source: source.entries.map((entry) => entry.name) };
  });

  await check("tree: a large folder has a cap and a more flag", async () => {
    const big = join(rootB, "many");
    await mkdir(big);
    const total = EXPLORER_LIMITS.directoryPage + 50;
    await Promise.all(Array.from({ length: total }, (_, index) => writeFile(join(big, `item-${index}.txt`), "")));
    const first = await explorer.files.list({ scope: SCOPE, path: big });
    assert.equal(first.entries.length, EXPLORER_LIMITS.directoryPage);
    assert.equal(first.more, true);
    assert.equal(first.total, total);
    assert.equal(first.entries[0]?.name, "item-0.txt");
    assert.equal(first.entries[10]?.name, "item-10.txt");
    const second = await explorer.files.list({ scope: SCOPE, path: big, offset: first.entries.length });
    assert.equal(second.entries.length, 50);
    assert.equal(second.more, false);
    assert.equal(second.entries.at(-1)?.name, `item-${total - 1}.txt`);
    await rm(big, { recursive: true });
    return { firstPage: first.entries.length, total };
  });

  await check("containment: paths outside the roots are refused", async () => {
    const attempts: Record<string, string> = {};
    const files = explorer.files;
    attempts.outsideList = await refused(() => files.list({ scope: SCOPE, path: outside }), OUTSIDE, "list outside");
    attempts.parentList = await refused(() => files.list({ scope: SCOPE, path: base }), OUTSIDE, "list the parent");
    attempts.dotDot = await refused(
      () => files.read({ scope: SCOPE, path: `${rootA}/../outside/secret.txt` }),
      OUTSIDE,
      "read with ..",
    );
    attempts.dotDotDeep = await refused(
      () => files.read({ scope: SCOPE, path: join(rootA, "src", "..", "..", "outside", "secret.txt") }),
      OUTSIDE,
      "read with nested ..",
    );
    attempts.absolute = await refused(
      () => files.read({ scope: SCOPE, path: join(outside, "secret.txt") }),
      OUTSIDE,
      "read an absolute path elsewhere",
    );
    attempts.relative = await refused(() => files.read({ scope: SCOPE, path: "README.md" }), OUTSIDE, "relative path");
    attempts.missingOutside = await refused(
      () => files.read({ scope: SCOPE, path: join(outside, "no-such-file.txt") }),
      OUTSIDE,
      "a missing path outside",
    );
    attempts.write = await refused(
      () =>
        files.write({
          scope: SCOPE,
          path: join(outside, "new.txt"),
          content: "x",
          encoding: "utf8",
          bom: false,
          lineEnding: "lf",
          expected: null,
        }),
      OUTSIDE,
      "write outside",
    );
    assert.equal(existsSync(join(outside, "new.txt")), false, "The write outside the roots made a file.");
    attempts.create = await refused(
      () => files.create({ scope: SCOPE, parent: outside, name: "made.txt", kind: "file" }),
      OUTSIDE,
      "create outside",
    );
    attempts.rename = await refused(
      () => files.rename({ scope: SCOPE, path: join(outside, "secret.txt"), name: "moved.txt" }),
      OUTSIDE,
      "rename outside",
    );
    attempts.trash = await refused(
      () => files.trash({ scope: SCOPE, path: join(outside, "secret.txt") }),
      OUTSIDE,
      "trash outside",
    );
    attempts.reveal = await refused(() => files.reveal({ scope: SCOPE, path: outside }), OUTSIDE, "reveal outside");
    assert.equal(await readFile(join(outside, "secret.txt"), "utf8"), "secret");
    assert.deepEqual(trashed, [], "A refused request reached the trash.");
    assert.deepEqual(revealed, [], "A refused request reached the file manager.");
    await refused(
      () => files.list({ scope: { agentId: "agent-e2e" }, path: `${rootA}\0` }),
      OUTSIDE,
      "a path with a NUL character",
    );
    return attempts;
  });

  await check("containment: a link that leaves the root is refused, a link inside the root works", async () => {
    if (!canLinkFolders) return { skipped: "This computer cannot make a folder link." };
    const files = explorer.files;
    await refused(() => files.list({ scope: SCOPE, path: join(rootA, "link-out") }), OUTSIDE, "list through a link");
    await refused(
      () => files.read({ scope: SCOPE, path: join(rootA, "link-out", "secret.txt") }),
      OUTSIDE,
      "read through a link",
    );
    await refused(
      () => files.create({ scope: SCOPE, parent: join(rootA, "link-out"), name: "made.txt", kind: "file" }),
      OUTSIDE,
      "create through a link",
    );
    await refused(
      () => files.rename({ scope: SCOPE, path: join(rootA, "link-out", "secret.txt"), name: "moved.txt" }),
      OUTSIDE,
      "rename through a link",
    );
    await refused(
      () => files.trash({ scope: SCOPE, path: join(rootA, "link-out", "secret.txt") }),
      OUTSIDE,
      "trash through a link",
    );
    assert.equal(existsSync(join(outside, "made.txt")), false);
    assert.equal(existsSync(join(outside, "secret.txt")), true);
    await writeFile(join(rootA, "docs", "guide.md"), "guide");
    const inside = await files.list({ scope: SCOPE, path: join(rootA, "link-in") });
    assert.deepEqual(
      inside.entries.map((entry) => entry.path),
      [join(rootA, "link-in", "guide.md")],
    );
    const read = await files.read({ scope: SCOPE, path: join(rootA, "link-in", "guide.md") });
    assert.equal(read.text?.content, "guide");
    const result: Record<string, string> = { folderLink: "refused" };
    if (canLinkFiles) {
      await refused(
        () => files.read({ scope: SCOPE, path: join(rootA, "link-file.txt") }),
        OUTSIDE,
        "read a file link that leaves the root",
      );
      await refused(
        () =>
          files.write({
            scope: SCOPE,
            path: join(rootA, "link-file.txt"),
            content: "changed",
            encoding: "utf8",
            bom: false,
            lineEnding: "lf",
            expected: null,
          }),
        OUTSIDE,
        "write through a file link",
      );
      assert.equal(await readFile(join(outside, "secret.txt"), "utf8"), "secret");
      result.fileLink = "refused";
    } else result.fileLink = "skipped: this computer cannot make a file link";
    return result;
  });

  const samples = {
    "utf8.txt": { bytes: Buffer.from("héllo\nwörld\n", "utf8"), encoding: "utf8", bom: false, lineEnding: "lf" },
    "utf8-bom.txt": {
      bytes: Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from("héllo\r\nwörld\r\n", "utf8")]),
      encoding: "utf8",
      bom: true,
      lineEnding: "crlf",
    },
    "utf16le.txt": {
      bytes: Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from("héllo\r\nwörld\r\n", "utf16le")]),
      encoding: "utf16le",
      bom: true,
      lineEnding: "crlf",
    },
    "utf16be.txt": {
      bytes: Buffer.concat([Buffer.from([0xfe, 0xff]), Buffer.from("héllo\nwörld\n", "utf16le").swap16()]),
      encoding: "utf16be",
      bom: true,
      lineEnding: "lf",
    },
    "utf16le-no-bom.txt": {
      bytes: Buffer.from("plain ascii text\r\nsecond line\r\n", "utf16le"),
      encoding: "utf16le",
      bom: false,
      lineEnding: "crlf",
    },
    "latin1.txt": {
      bytes: Buffer.from("caf\xe9\nna\xefve\n", "latin1"),
      encoding: "latin1",
      bom: false,
      lineEnding: "lf",
    },
  } as const;

  await check("read: each encoding and line ending is detected", async () => {
    const found: Record<string, Pick<ExplorerText, "encoding" | "bom" | "lineEnding"> | undefined> = {};
    for (const [name, sample] of Object.entries(samples)) {
      const path = join(rootA, "docs", name);
      await writeFile(path, sample.bytes);
      const file = await explorer.files.read({ scope: SCOPE, path });
      assert.ok(isExplorerFile(file), `${name}: the file does not pass the contract check.`);
      assert.equal(file.kind, "text", `${name}: wrong kind`);
      assert.equal(file.text?.encoding, sample.encoding, `${name}: wrong encoding`);
      assert.equal(file.text?.bom, sample.bom, `${name}: wrong BOM flag`);
      assert.equal(file.text?.lineEnding, sample.lineEnding, `${name}: wrong line ending`);
      assert.equal(file.text?.mixedLineEndings, false, `${name}: mixed line endings`);
      assert.equal(file.text?.content.includes("\r"), false, `${name}: the content has a carriage return`);
      assert.equal(file.text?.readOnly, false);
      assert.equal(file.size, sample.bytes.byteLength);
      found[name] = { encoding: file.text?.encoding, bom: file.text?.bom, lineEnding: file.text?.lineEnding };
    }
    const accents = await explorer.files.read({ scope: SCOPE, path: join(rootA, "docs", "utf16be.txt") });
    assert.equal(accents.text?.content, "héllo\nwörld\n");
    const latin = await explorer.files.read({ scope: SCOPE, path: join(rootA, "docs", "latin1.txt") });
    assert.equal(latin.text?.content, "café\nnaïve\n");
    await writeFile(join(rootA, "docs", "mixed.txt"), "one\r\ntwo\nthree\r\nfour\r\n");
    const mixed = await explorer.files.read({ scope: SCOPE, path: join(rootA, "docs", "mixed.txt") });
    assert.equal(mixed.text?.lineEnding, "crlf");
    assert.equal(mixed.text?.mixedLineEndings, true);
    assert.equal(mixed.text?.content, "one\ntwo\nthree\nfour\n");
    return found;
  });

  await check("read: binary files and preview files give a kind and no text through IPC", async () => {
    await writeFile(join(rootA, "docs", "data.bin"), Buffer.from([1, 2, 0, 3, 4, 0, 0, 9]));
    const binary = await explorer.files.read({ scope: SCOPE, path: join(rootA, "docs", "data.bin") });
    assert.equal(binary.kind, "binary");
    assert.equal(binary.text, null);
    assert.equal(binary.url, null);
    assert.equal(binary.size, 8);
    await writeFile(join(rootA, "docs", "pixel.png"), Buffer.from("iVBORw0KGgo=", "base64"));
    const image = await explorer.files.read({ scope: SCOPE, path: join(rootA, "docs", "pixel.png") });
    assert.equal(image.kind, "image");
    assert.equal(image.mimeType, "image/png");
    assert.equal(image.text, null);
    assert.match(image.url ?? "", /^codebot-attachment:\/\/explorer\/agent\/agent-e2e\/pixel\.png\?/u);
    await writeFile(join(rootA, "docs", "shape.svg"), '<svg xmlns="http://www.w3.org/2000/svg"/>\n');
    const svg = await explorer.files.read({ scope: SCOPE, path: join(rootA, "docs", "shape.svg") });
    assert.equal(svg.kind, "svg");
    assert.match(svg.text?.content ?? "", /<svg/u);
    assert.ok(svg.url, "The SVG has no address for the image view.");
    await writeFile(join(rootA, "docs", "paper.pdf"), "%PDF-1.4\n");
    const pdf = await explorer.files.read({ scope: SCOPE, path: join(rootA, "docs", "paper.pdf") });
    assert.equal(pdf.kind, "pdf");
    await refused(
      () => explorer.files.read({ scope: SCOPE, path: join(rootA, "docs") }),
      /not a file/u,
      "read a folder",
    );
    return { binary: binary.kind, image: image.url, svg: svg.kind, pdf: pdf.kind };
  });

  await check("protocol: a preview file is served only from inside the roots", async () => {
    const image = await explorer.files.read({ scope: SCOPE, path: join(rootA, "docs", "pixel.png") });
    const served = await explorer.fileResponse(new Request(image.url ?? ""));
    assert.equal(served.status, 200);
    assert.equal(served.headers.get("Content-Type"), "image/png");
    assert.equal(served.headers.get("X-Content-Type-Options"), "nosniff");
    assert.deepEqual(Buffer.from(await served.arrayBuffer()), Buffer.from("iVBORw0KGgo=", "base64"));
    const ranged = await explorer.fileResponse(new Request(image.url ?? "", { headers: { Range: "bytes=0-3" } }));
    assert.equal(ranged.status, 206);
    assert.equal((await ranged.arrayBuffer()).byteLength, 4);
    const address = (path: string, agentId = "agent-e2e") =>
      `codebot-attachment://explorer/agent/${agentId}/file.png?path=${encodeURIComponent(path)}`;
    const statuses: Record<string, number> = {};
    for (const [label, url] of Object.entries({
      outside: address(join(outside, "secret.png")),
      dotDot: address(join(rootA, "..", "outside", "secret.png")),
      link: address(join(rootA, "link-out", "secret.png")),
      text: address(join(rootA, "README.md")),
      missing: address(join(rootA, "none.png")),
      noPath: "codebot-attachment://explorer/agent/agent-e2e/file.png",
      noScope: `codebot-attachment://explorer/file.png?path=${encodeURIComponent(join(rootA, "docs", "pixel.png"))}`,
    })) {
      const response = await explorer.fileResponse(new Request(url));
      statuses[label] = response.status;
      assert.equal(response.status, 404, `${label}: the file was served.`);
    }
    const svg = await explorer.files.read({ scope: SCOPE, path: join(rootA, "docs", "shape.svg") });
    const drawing = await explorer.fileResponse(new Request(svg.url ?? ""));
    assert.equal(drawing.headers.get("Content-Type"), "image/svg+xml");
    assert.equal(drawing.headers.get("Content-Security-Policy"), "sandbox");
    await drawing.arrayBuffer();
    return statuses;
  });

  await check("write: a save keeps the encoding, the BOM and the line endings", async () => {
    const saved: Record<string, number> = {};
    for (const [name, sample] of Object.entries(samples)) {
      const path = join(rootA, "docs", name);
      const file = await explorer.files.read({ scope: SCOPE, path });
      const text = file.text;
      assert.ok(text, `${name}: no text`);
      const result = await explorer.files.write({
        scope: SCOPE,
        path,
        content: `${text.content}added line\n`,
        encoding: text.encoding,
        bom: text.bom,
        lineEnding: text.lineEnding,
        expected: { modifiedAt: file.modifiedAt, size: file.size },
      });
      assert.equal(result.outcome, "saved", `${name}: not saved`);
      const bytes = await readFile(path);
      const ending = sample.lineEnding === "crlf" ? "\r\n" : "\n";
      const encodedLine =
        sample.encoding === "utf16be"
          ? Buffer.from(`added line${ending}`, "utf16le").swap16()
          : Buffer.from(`added line${ending}`, sample.encoding === "utf8" ? "utf8" : sample.encoding);
      assert.deepEqual(bytes, Buffer.concat([sample.bytes, encodedLine]), `${name}: the bytes on disk are wrong`);
      const again = await explorer.files.read({ scope: SCOPE, path });
      assert.equal(again.text?.encoding, sample.encoding);
      assert.equal(again.text?.bom, sample.bom);
      assert.equal(again.text?.lineEnding, sample.lineEnding);
      if (result.outcome === "saved") {
        assert.equal(result.size, bytes.byteLength);
        assert.equal(result.modifiedAt, again.modifiedAt);
      }
      saved[name] = bytes.byteLength;
    }
    const leftovers = (await readdir(join(rootA, "docs"))).filter((name) => name.endsWith(".tmp"));
    assert.deepEqual(leftovers, [], "A temporary file stayed after the save.");
    const latinPath = join(rootA, "docs", "latin1.txt");
    const latin = await explorer.files.read({ scope: SCOPE, path: latinPath });
    const widened = await explorer.files.write({
      scope: SCOPE,
      path: latinPath,
      content: "café ☕\n",
      encoding: "latin1",
      bom: false,
      lineEnding: "lf",
      expected: { modifiedAt: latin.modifiedAt, size: latin.size },
    });
    assert.equal(widened.outcome === "saved" ? widened.encoding : null, "utf8");
    assert.equal(await readFile(latinPath, "utf8"), "café ☕\n");
    return saved;
  });

  await check("write: a file that changed on disk gives a conflict, then reload or overwrite works", async () => {
    const path = join(rootA, "docs", "conflict.txt");
    await writeFile(path, "first\n");
    const opened = await explorer.files.read({ scope: SCOPE, path });
    const version = { modifiedAt: opened.modifiedAt, size: opened.size };
    await writeFile(path, "changed by another program\n");
    const input = {
      scope: SCOPE,
      path,
      content: "mine\n",
      encoding: "utf8",
      bom: false,
      lineEnding: "lf",
    } as const;
    const refusedSave = await explorer.files.write({ ...input, expected: version });
    assert.equal(refusedSave.outcome, "conflict");
    assert.equal(await readFile(path, "utf8"), "changed by another program\n", "The conflict changed the file.");
    const sameSize = await explorer.files.read({ scope: SCOPE, path });
    await writeFile(path, "changed by another PROGRAM\n");
    const later = new Date(sameSize.modifiedAt + 5_000);
    await utimes(path, later, later);
    const timeOnly = await explorer.files.write({
      ...input,
      expected: { modifiedAt: sameSize.modifiedAt, size: sameSize.size },
    });
    assert.equal(timeOnly.outcome, "conflict", "A change with the same size was not found.");
    const reloaded = await explorer.files.read({ scope: SCOPE, path });
    const afterReload = await explorer.files.write({
      ...input,
      expected: { modifiedAt: reloaded.modifiedAt, size: reloaded.size },
    });
    assert.equal(afterReload.outcome, "saved");
    await writeFile(path, "changed again\n");
    const overwritten = await explorer.files.write({ ...input, content: "overwrite\n", expected: null });
    assert.equal(overwritten.outcome, "saved");
    assert.equal(await readFile(path, "utf8"), "overwrite\n");
    const last = await explorer.files.read({ scope: SCOPE, path });
    await rm(path);
    const deleted = await explorer.files.write({
      ...input,
      expected: { modifiedAt: last.modifiedAt, size: last.size },
    });
    assert.deepEqual(deleted, { outcome: "conflict", exists: false, modifiedAt: 0, size: 0 });
    assert.equal(existsSync(path), false, "The conflict made the deleted file again.");
    const recreated = await explorer.files.write({ ...input, expected: null });
    assert.equal(recreated.outcome, "saved");
    assert.equal(await readFile(path, "utf8"), "mine\n");
    return { conflict: refusedSave, timeOnly: timeOnly.outcome };
  });

  await check("create, rename and trash work inside the roots and protect the roots", async () => {
    const files = explorer.files;
    const folder = await files.create({ scope: SCOPE, parent: join(rootA, "tests"), name: "unit", kind: "directory" });
    assert.deepEqual(
      { name: folder.name, kind: folder.kind, path: folder.path },
      { name: "unit", kind: "directory", path: join(rootA, "tests", "unit") },
    );
    const file = await files.create({ scope: SCOPE, parent: folder.path, name: "first test.ts", kind: "file" });
    assert.equal(file.kind, "file");
    assert.equal(file.size, 0);
    assert.equal(existsSync(join(rootA, "tests", "unit", "first test.ts")), true);
    await refused(
      () => files.create({ scope: SCOPE, parent: folder.path, name: "first test.ts", kind: "file" }),
      /is in this folder already/u,
      "create a file that exists",
    );
    for (const name of ["a/b.txt", "..", ".", "a\\b.txt"]) {
      await refused(
        () => files.create({ scope: SCOPE, parent: folder.path, name, kind: "file" }),
        /not valid/u,
        `create with the name ${name}`,
      );
    }
    const renamed = await files.rename({ scope: SCOPE, path: file.path, name: "second.ts" });
    assert.equal(renamed.path, join(rootA, "tests", "unit", "second.ts"));
    assert.equal(existsSync(file.path), false);
    assert.equal(existsSync(renamed.path), true);
    await writeFile(join(folder.path, "third.ts"), "3");
    await refused(
      () => files.rename({ scope: SCOPE, path: renamed.path, name: "third.ts" }),
      /is in this folder already/u,
      "rename to a name that exists",
    );
    await refused(
      () => files.rename({ scope: SCOPE, path: renamed.path, name: "../escaped.ts" }),
      /not valid/u,
      "rename with a path in the name",
    );
    await refused(
      () => files.rename({ scope: SCOPE, path: join(folder.path, "none.ts"), name: "x.ts" }),
      /does not exist/u,
      "rename a missing file",
    );
    const cased = await files.rename({ scope: SCOPE, path: renamed.path, name: "Second.ts" });
    assert.equal(cased.name, "Second.ts");
    assert.ok((await readdir(folder.path)).includes("Second.ts"), "The rename that changes only the case failed.");
    await refused(
      () => files.rename({ scope: SCOPE, path: rootA, name: "other" }),
      /outside|not in the folders|cannot be renamed/u,
      "rename a root",
    );
    await refused(
      () => files.trash({ scope: SCOPE, path: rootB }),
      /not in the folders|cannot be renamed or deleted/u,
      "trash a root",
    );
    assert.equal(existsSync(rootA) && existsSync(rootB), true);
    await files.trash({ scope: SCOPE, path: cased.path });
    assert.deepEqual(trashed, [join(rootA, "tests", "unit", "Second.ts")]);
    assert.equal(existsSync(cased.path), false);
    await files.trash({ scope: SCOPE, path: folder.path });
    assert.equal(existsSync(folder.path), false);
    await refused(() => files.trash({ scope: SCOPE, path: folder.path }), /does not exist/u, "trash a missing folder");
    if (canLinkFolders) {
      await files.trash({ scope: SCOPE, path: join(rootA, "link-in") });
      assert.equal(trashed.at(-1), join(rootA, "link-in"), "The trash got the target of the link.");
      assert.equal(existsSync(join(rootA, "docs", "guide.md")), true, "The trash of a link deleted its target.");
    }
    await files.reveal({ scope: SCOPE, path: join(rootA, "README.md") });
    assert.deepEqual(revealed, [join(rootA, "README.md")]);
    assert.equal(await files.stat({ scope: SCOPE, path: join(rootA, "no-such.txt") }), null);
    assert.equal((await files.stat({ scope: SCOPE, path: join(rootA, "README.md") }))?.size, 10);
    return { trashed };
  });

  await check("read: a file over the edit limit opens read-only and truncated", async () => {
    const path = join(rootB, "large.log");
    const line = `${"x".repeat(99)}\n`;
    const size = EXPLORER_LIMITS.editableBytes + 1_000;
    await writeFile(path, line.repeat(Math.ceil(size / line.length)));
    const large = await explorer.files.read({ scope: SCOPE, path });
    assert.ok(isExplorerFile(large), "The large file does not pass the contract check.");
    assert.equal(large.text?.readOnly, true);
    assert.equal(large.text?.truncated, true);
    assert.equal(large.text?.content.length, EXPLORER_LIMITS.truncatedBytes);
    assert.ok(large.size > EXPLORER_LIMITS.editableBytes);
    const limit = join(rootB, "limit.log");
    await writeFile(limit, line.repeat(EXPLORER_LIMITS.editableBytes / line.length - 1));
    const editable = await explorer.files.read({ scope: SCOPE, path: limit });
    assert.equal(editable.text?.readOnly, false);
    assert.equal(editable.text?.truncated, false);
    await rm(path);
    await rm(limit);
    return { size: large.size, shown: large.text?.content.length };
  });

  async function watchChecks(
    mode: "recursive" | "folders",
  ): Promise<{ events: number; openAfterRootDelete: number; openBeforeClose: number }> {
    const watched = service(mode === "recursive");
    const changes = new Changes();
    const deep = join(rootA, "src", "deep", "a", "b");
    const third = join(base, `third-${mode}`);
    await mkdir(third);
    const scoped = createExplorerService({
      folders: () => [rootA, rootB, third],
      trash: async () => undefined,
      reveal: () => undefined,
      watch: { coalesceMs: 60, recursive: mode === "recursive" },
    });
    const expanded = [
      rootA,
      join(rootA, "src"),
      join(rootA, "src", "deep"),
      join(rootA, "src", "deep", "a"),
      deep,
      rootB,
      third,
    ];
    try {
      await scoped.watch("window-1", { scope: SCOPE, expanded }, changes.add);
      assert.ok(scoped.watcherCount > 0, "No watcher is open.");
      assert.equal(scoped.watchSessionCount, 1);

      const created = join(deep, "created.txt");
      await writeFile(created, "one");
      const createEvent = await changes.until("create in a deep folder", (change) => change.directories.includes(deep));
      assert.ok(createEvent.files.includes(created) || changes.all.some((change) => change.files.includes(created)));
      assert.deepEqual(createEvent.scope, SCOPE);
      assert.equal(createEvent.serverId, "local");

      const before = changes.all.length;
      await writeFile(created, "one and more text");
      await changes.until(
        "change in a deep folder",
        (change) => changes.all.indexOf(change) >= before && change.files.includes(created),
      );

      const renamedPath = join(deep, "renamed.txt");
      const beforeRename = changes.all.length;
      await rename(created, renamedPath);
      await changes.until(
        "rename in a deep folder",
        (change) => changes.all.indexOf(change) >= beforeRename && change.directories.includes(deep),
      );

      const beforeDelete = changes.all.length;
      await rm(renamedPath);
      await changes.until(
        "delete in a deep folder",
        (change) => changes.all.indexOf(change) >= beforeDelete && change.directories.includes(deep),
      );

      const beforeSecond = changes.all.length;
      await writeFile(join(rootB, "second-root.txt"), "b");
      await changes.until(
        "create in the second root",
        (change) => changes.all.indexOf(change) >= beforeSecond && change.directories.includes(rootB),
      );

      const beforeNoise = changes.all.length;
      const noise = join(rootA, "node_modules", "pkg");
      await writeFile(join(noise, "index.js"), "noise");
      await writeFile(join(rootA, "sentinel.txt"), String(Date.now()));
      await changes.until(
        "the file after the noise",
        (change) => changes.all.indexOf(change) >= beforeNoise && change.files.includes(join(rootA, "sentinel.txt")),
      );
      const noisy = changes.all
        .slice(beforeNoise)
        .flatMap((change) => [...change.directories, ...change.files])
        .filter((path) => path.startsWith(noise));
      assert.deepEqual(noisy, [], "A change in a collapsed node_modules folder was sent.");

      const beforeGit = changes.all.length;
      await writeFile(join(rootA, ".git", "HEAD"), `ref: refs/heads/${mode}\n`);
      const gitEvent = await changes.until(
        "a change of .git/HEAD",
        (change) => changes.all.indexOf(change) >= beforeGit && change.git,
      );
      assert.equal(gitEvent.directories.includes(join(rootA, ".git")), false, "The collapsed .git folder was sent.");

      await scoped.watch("window-2", { scope: SCOPE, expanded: [rootA] }, () => undefined);
      assert.equal(scoped.watchSessionCount, 1, "A second window made a second watch session.");
      scoped.unwatch("window-2", SCOPE);
      assert.ok(scoped.watcherCount > 0, "The watch stopped while a window still uses the scope.");

      const beforeRoot = changes.all.length;
      await rm(third, { recursive: true, force: true });
      await changes.until("a deleted root", (change) => changes.all.indexOf(change) >= beforeRoot && change.roots);
      assert.equal(existsSync(third), false, "The deleted root is still there.");
      await mkdir(third);
      await rm(third, { recursive: true });
      const openAfterRootDelete = scoped.watcherCount;

      scoped.unwatch("window-1", SCOPE);
      assert.equal(scoped.watcherCount, 0, "Watchers stayed open after the last window left.");
      assert.equal(scoped.watchSessionCount, 0);

      for (let round = 0; round < 50; round += 1) {
        await watched.watch(`window-${round % 3}`, { scope: SCOPE, expanded }, () => undefined);
        if (round % 2 === 0) watched.unwatch(`window-${round % 3}`, SCOPE);
        else watched.unwatchAll(`window-${round % 3}`);
        assert.equal(watched.watcherCount, 0, `Round ${round}: a watcher leaked.`);
      }
      await watched.watch("window-a", { scope: SCOPE, expanded }, () => undefined);
      await watched.watch("window-b", { scope: { agentId: "other-agent" }, expanded }, () => undefined);
      assert.equal(watched.watchSessionCount, 2);
      const open = watched.watcherCount;
      watched.close();
      assert.equal(watched.watcherCount, 0, "close() left watchers open.");
      return { events: changes.all.length, openAfterRootDelete, openBeforeClose: open };
    } finally {
      scoped.close();
      watched.close();
      await rm(join(rootA, "sentinel.txt"), { force: true });
      await rm(join(rootB, "second-root.txt"), { force: true });
      await rm(third, { recursive: true, force: true });
    }
  }

  const nativeRecursive = process.platform === "win32" || process.platform === "darwin";
  await check("watch (recursive): create, change, rename, delete, second root, noise, cleanup", async () => {
    if (!nativeRecursive) return { skipped: "This platform uses the watchers of each folder." };
    return watchChecks("recursive");
  });
  await check("watch (one watcher for each expanded folder): the same events and cleanup", () =>
    watchChecks("folders"),
  );

  await check("watch: a failed recursive watch falls back to the folders", async () => {
    const changes = new Changes();
    let recursiveCalls = 0;
    const { watch } = await import("node:fs");
    const fallback = createExplorerService({
      folders: () => [rootA],
      trash: async () => undefined,
      reveal: () => undefined,
      watch: {
        coalesceMs: 60,
        recursive: true,
        watch: (path, options, listener) => {
          if (options.recursive) {
            recursiveCalls += 1;
            throw Object.assign(new Error("The feature watch recursively is unavailable on the current platform"), {
              code: "ERR_FEATURE_UNAVAILABLE_ON_PLATFORM",
            });
          }
          return watch(path, options, listener);
        },
      },
    });
    try {
      await fallback.watch("window-1", { scope: SCOPE, expanded: [rootA, join(rootA, "src")] }, changes.add);
      assert.equal(recursiveCalls, 1);
      assert.ok(fallback.watcherCount >= 2, "The fallback opened no folder watcher.");
      await writeFile(join(rootA, "src", "fallback.txt"), "x");
      await changes.until("a create with the fallback", (change) => change.directories.includes(join(rootA, "src")));
      fallback.unwatchAll("window-1");
      assert.equal(fallback.watcherCount, 0);
      return { recursiveCalls };
    } finally {
      fallback.close();
      await rm(join(rootA, "src", "fallback.txt"), { force: true });
    }
  });

  explorer.close();
  report.passed = report.checks.every((item) => item.passed);
} finally {
  await rm(base, { recursive: true, force: true }).catch(() => undefined);
  mkdirSync(OUT, { recursive: true });
  writeFileSync(join(OUT, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
  process.stdout.write(`Report: ${join(OUT, "report.json")}\n`);
}

await stat(join(OUT, "report.json"));
process.exit(report.passed ? 0 : 1);
