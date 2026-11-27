import {
  type CodeBotDesktopApi,
  EXPLORER_LIMITS,
  type ExplorerChange,
  type ExplorerEntry,
  type ExplorerFile,
  type ExplorerFileKind,
  type ExplorerGitChange,
  type ExplorerGitCommit,
  type ExplorerGitCommitFile,
  type ExplorerGitFile,
  type ExplorerScope,
  LOCAL_SERVER_ID,
} from "@codebot/contracts/ipc";

const PROJECT = "/home/dev/acme-shop";
const NOTES = "/home/dev/design-notes";
const HOUR = 3_600_000;

interface MockFile {
  content: string;
  original?: string | null;
  url?: string;
  kind?: ExplorerFileKind;
  mimeType?: string;
  size?: number;
  modifiedAt: number;
}

const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
  <rect width="120" height="120" rx="24" fill="#2563eb"/>
  <path d="M34 44h52l-6 30H42z" fill="none" stroke="#fff" stroke-width="6" stroke-linejoin="round"/>
  <circle cx="48" cy="86" r="5" fill="#fff"/>
  <circle cx="74" cy="86" r="5" fill="#fff"/>
</svg>
`;

const BANNER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 240" width="640" height="240">
  <defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#0ea5e9"/><stop offset="1" stop-color="#6366f1"/></linearGradient></defs>
  <rect width="640" height="240" fill="url(#g)"/>
  <circle cx="520" cy="60" r="90" fill="#ffffff" fill-opacity="0.14"/>
  <circle cx="110" cy="210" r="120" fill="#ffffff" fill-opacity="0.1"/>
  <text x="48" y="136" font-family="Arial, sans-serif" font-size="56" font-weight="700" fill="#ffffff">Acme Shop</text>
</svg>`;

function svgUrl(svg: string): string {
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

const CART_ORIGINAL = `import { For } from "solid-js";
import { useCart } from "../hooks/useCart";

export function Cart() {
  const cart = useCart();
  return (
    <ul class="cart">
      <For each={cart.items()}>{(item) => <li>{item.name}</li>}</For>
    </ul>
  );
}
`;

const CART_MODIFIED = `import { For, Show } from "solid-js";
import { useCart } from "../hooks/useCart";
import { formatPrice } from "../format";

export function Cart() {
  const cart = useCart();
  return (
    <section class="cart">
      <Show when={cart.items().length > 0} fallback={<p class="cart-empty">Your cart is empty.</p>}>
        <ul>
          <For each={cart.items()}>
            {(item) => (
              <li>
                <span>{item.name}</span>
                <strong>{formatPrice(item.price * item.quantity)}</strong>
              </li>
            )}
          </For>
        </ul>
        <p class="cart-total">Total: {formatPrice(cart.total())}</p>
      </Show>
    </section>
  );
}
`;

const APP_ORIGINAL = `import { Cart } from "./components/Cart";

export function App() {
  return <Cart />;
}
`;

const APP_MODIFIED = `import { Cart } from "./components/Cart";
import { ProductCard } from "./components/ProductCard";
import products from "../data/products.json";

export function App() {
  return (
    <main class="shop">
      <div class="shop-grid">
        {products.map((product) => (
          <ProductCard product={product} />
        ))}
      </div>
      <Cart />
    </main>
  );
}
`;

const README = `# Acme Shop

A small web shop that the team uses to test CodeBot.

## Commands

| Command | Use |
| --- | --- |
| \`bun install\` | Install the packages |
| \`bun run dev\` | Start the shop on port 5173 |
| \`bun run test\` | Run the tests |

## Folders

- \`src\`: the SolidJS screen
- \`backend\`: the Python API
- \`docs\`: the notes of the team
- \`tests\`: the tests of the cart and the checkout

\`\`\`ts
export const TAX_RATE = 0.19;
\`\`\`
`;

const ORDERS_CSV = [
  "order_id,customer,product,quantity,price,status,note",
  ...Array.from({ length: 140 }, (_, index) => {
    const products = ["Desk lamp", "Notebook, lined", "USB-C cable", "Monitor arm", 'Keyboard "Pro"'];
    const product = products[index % products.length] ?? "Desk lamp";
    const quoted = /[",]/u.test(product) ? `"${product.replaceAll('"', '""')}"` : product;
    const status = ["paid", "shipped", "returned", "open"][index % 4];
    return `${1000 + index},customer-${(index * 7) % 23},${quoted},${(index % 4) + 1},${(9.5 + (index % 9) * 3.25).toFixed(2)},${status},`;
  }),
].join("\n");

const PRODUCTS_JSON = `${JSON.stringify(
  [
    { id: "lamp", name: "Desk lamp", price: 39.9, tags: ["office", "light"], stock: { berlin: 12, paris: 4 } },
    { id: "cable", name: "USB-C cable", price: 9.5, tags: ["accessory"], stock: { berlin: 240, paris: 80 } },
    {
      id: "arm",
      name: "Monitor arm",
      price: 89,
      tags: ["office"],
      stock: { berlin: 0, paris: 7 },
      discontinued: false,
    },
  ],
  null,
  2,
)}\n`;

function initialFiles(now: number): Map<string, MockFile> {
  const at = (hours: number) => now - hours * HOUR;
  const text = (content: string, hours: number, original?: string | null): MockFile => ({
    content,
    modifiedAt: at(hours),
    ...(original === undefined ? {} : { original }),
  });
  return new Map<string, MockFile>([
    [
      `${PROJECT}/.github/workflows/ci.yml`,
      text("name: CI\non: [push]\njobs:\n  test:\n    runs-on: ubuntu-latest\n", 400),
    ],
    [`${PROJECT}/.gitignore`, text("node_modules\ndist\n.env\n", 900)],
    [`${PROJECT}/.env`, text("API_URL=http://localhost:8000\n", 300)],
    [`${PROJECT}/.env.example`, text("API_URL=\n", 900)],
    [`${PROJECT}/README.md`, text(README, 30)],
    [
      `${PROJECT}/package.json`,
      text(
        '{\n  "name": "acme-shop",\n  "version": "1.4.0",\n  "scripts": { "dev": "vite", "test": "vitest" }\n}\n',
        50,
      ),
    ],
    [`${PROJECT}/tsconfig.json`, text('{\n  "compilerOptions": { "strict": true, "jsx": "preserve" }\n}\n', 700)],
    [
      `${PROJECT}/backend/main.py`,
      text('from api.routes import app\n\nif __name__ == "__main__":\n    app.run(port=8000)\n', 80),
    ],
    [`${PROJECT}/backend/requirements.txt`, text("flask==3.1.0\npydantic==2.9.2\n", 500)],
    [
      `${PROJECT}/backend/api/routes.py`,
      text(
        'from flask import Flask, jsonify\n\napp = Flask(__name__)\n\n\n@app.get("/products")\ndef products():\n    return jsonify([])\n',
        20,
        "from flask import Flask\n\napp = Flask(__name__)\n",
      ),
    ],
    [
      `${PROJECT}/backend/api/models.py`,
      text(
        "from pydantic import BaseModel\n\n\nclass Product(BaseModel):\n    id: str\n    name: str\n    price: float\n",
        200,
      ),
    ],
    [`${PROJECT}/data/products.json`, text(PRODUCTS_JSON, 60)],
    [`${PROJECT}/data/orders.csv`, text(ORDERS_CSV, 12)],
    [
      `${PROJECT}/docs/architecture.md`,
      text(
        "# Architecture\n\nThe screen calls the API on port 8000.\n\n1. `src` renders the shop.\n2. `backend` answers `/products`.\n",
        240,
      ),
    ],
    [`${PROJECT}/docs/setup.md`, text("# Setup\n\nCopy `.env.example` to `.env`.\n", 2, null)],
    [
      `${PROJECT}/docs/logo.svg`,
      { content: LOGO_SVG, url: svgUrl(LOGO_SVG), kind: "svg", mimeType: "image/svg+xml", modifiedAt: at(600) },
    ],
    [
      `${PROJECT}/public/banner.png`,
      { content: "", url: svgUrl(BANNER_SVG), kind: "image", mimeType: "image/png", size: 48_213, modifiedAt: at(650) },
    ],
    [
      `${PROJECT}/public/catalog.pdf`,
      { content: "", kind: "binary", mimeType: "application/pdf", size: 1_204_112, modifiedAt: at(650) },
    ],
    [`${PROJECT}/src/App.tsx`, text(APP_MODIFIED, 3, APP_ORIGINAL)],
    [
      `${PROJECT}/src/main.ts`,
      text(
        'import { render } from "@solidjs/web";\nimport { App } from "./App";\n\nrender(App, document.body);\n',
        500,
      ),
    ],
    [
      `${PROJECT}/src/format.ts`,
      text('export function formatPrice(value: number): string {\n  return value.toFixed(2) + " EUR";\n}\n', 4, null),
    ],
    [`${PROJECT}/src/components/Cart.tsx`, text(CART_MODIFIED, 1, CART_ORIGINAL)],
    [
      `${PROJECT}/src/components/ProductCard.tsx`,
      text(
        'export function ProductCard(props: { product: { name: string; price: number } }) {\n  return <article class="product">{props.product.name}</article>;\n}\n',
        90,
      ),
    ],
    [
      `${PROJECT}/src/hooks/useCart.ts`,
      text(
        'import { createSignal } from "solid-js";\n\nexport function useCart() {\n  const [items] = createSignal<{ name: string; price: number; quantity: number }[]>([]);\n  return { items, total: () => items().reduce((sum, item) => sum + item.price * item.quantity, 0) };\n}\n',
        5,
        null,
      ),
    ],
    [
      `${PROJECT}/src/styles/app.css`,
      text(".shop {\n  display: grid;\n  gap: 24px;\n}\n\n.cart-total {\n  font-weight: 600;\n}\n", 100),
    ],
    [
      `${PROJECT}/tests/cart.test.ts`,
      text(
        'import { expect, test } from "vitest";\n\ntest("an empty cart has a total of zero", () => {\n  expect(0).toBe(0);\n});\n',
        150,
      ),
    ],
    [
      `${PROJECT}/tests/checkout.test.ts`,
      text('import { test } from "vitest";\n\ntest.todo("the checkout sends the order");\n', 150),
    ],
    [`${PROJECT}/node_modules/solid-js/package.json`, text('{ "name": "solid-js" }\n', 900)],
    [`${PROJECT}/dist/index.html`, text("<!doctype html>\n", 40)],
    [`${NOTES}/ideas.md`, text("# Ideas\n\n- A dark mode for the shop\n- A saved cart\n", 70)],
    [`${NOTES}/palette.json`, text('{\n  "primary": "#2563eb",\n  "accent": "#f59e0b"\n}\n', 70)],
  ]);
}

interface StatusSeed {
  path: string;
  index: ExplorerGitChange | null;
  worktree: ExplorerGitChange | null;
  originalPath?: string;
  directory?: boolean;
}

const STATUS_SEED: readonly StatusSeed[] = [
  { path: `${PROJECT}/src/App.tsx`, index: "modified", worktree: null },
  { path: `${PROJECT}/src/hooks/useCart.ts`, index: "added", worktree: null },
  {
    path: `${PROJECT}/backend/api/routes.py`,
    index: "renamed",
    worktree: "modified",
    originalPath: `${PROJECT}/backend/routes.py`,
  },
  { path: `${PROJECT}/src/components/Cart.tsx`, index: null, worktree: "modified" },
  { path: `${PROJECT}/tests/legacy.test.ts`, index: null, worktree: "deleted" },
  { path: `${PROJECT}/src/format.ts`, index: null, worktree: "untracked" },
  { path: `${PROJECT}/docs/setup.md`, index: null, worktree: "untracked" },
];

const IGNORED: readonly StatusSeed[] = [
  { path: `${PROJECT}/node_modules`, index: null, worktree: "ignored", directory: true },
  { path: `${PROJECT}/dist`, index: null, worktree: "ignored", directory: true },
  { path: `${PROJECT}/.env`, index: null, worktree: "ignored" },
];

const COMMIT_SUBJECTS = [
  "Show the cart total",
  "Add the product grid",
  "Move the routes to the api package",
  "Fix the price format for values below 1 EUR",
  "Add the checkout test",
  "Update the setup notes",
  "Use strict mode in the TypeScript configuration",
  "Add the CI workflow",
  "Read the API address from the environment",
  "Add the logo",
];
const AUTHORS = ["Ibrahim Bisen", "Lena Hartmann", "Marc Dubois"];

function mockCommits(now: number): ExplorerGitCommit[] {
  return Array.from({ length: 137 }, (_, index) => {
    const hash = Array.from({ length: 40 }, (_unused, at) => ((index * 7 + at * 13 + 5) % 16).toString(16)).join("");
    const parent = Array.from({ length: 40 }, (_unused, at) =>
      (((index + 1) * 7 + at * 13 + 5) % 16).toString(16),
    ).join("");
    return {
      hash,
      shortHash: hash.slice(0, 7),
      subject: `${COMMIT_SUBJECTS[index % COMMIT_SUBJECTS.length] ?? "Update"}${index >= COMMIT_SUBJECTS.length ? ` (${index + 1})` : ""}`,
      author: AUTHORS[index % AUTHORS.length] ?? "Ibrahim Bisen",
      authoredAt: now - (index * 9 + 2) * HOUR,
      refs: index === 0 ? ["HEAD -> main"] : index === 2 ? ["origin/main"] : index === 14 ? ["tag: v1.4.0"] : [],
      parents: index === 136 ? [] : [parent],
    };
  });
}

function parentOf(path: string): string {
  return path.slice(0, path.lastIndexOf("/"));
}

function nameOf(path: string): string {
  return path.slice(path.lastIndexOf("/") + 1);
}

export function createMockExplorer(): CodeBotDesktopApi["explorer"] {
  const now = Date.now();
  const files = initialFiles(now);
  const folders = new Set<string>([PROJECT, NOTES, `${PROJECT}/tests/fixtures`]);
  const commits = mockCommits(now);
  const listeners = new Set<(change: ExplorerChange) => void>();
  const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });
  let status: StatusSeed[] = [...STATUS_SEED];
  let watching: ExplorerScope | null = null;

  for (const path of files.keys()) {
    for (let folder = parentOf(path); folder !== PROJECT && folder !== NOTES && folder.length > 1; ) {
      folders.add(folder);
      folder = parentOf(folder);
    }
  }

  const sizeOf = (file: MockFile) => file.size ?? new TextEncoder().encode(file.content).byteLength;

  function entry(path: string): ExplorerEntry | null {
    const file = files.get(path);
    if (file)
      return {
        name: nameOf(path),
        path,
        kind: "file",
        size: sizeOf(file),
        modifiedAt: file.modifiedAt,
        symlink: false,
      };
    if (folders.has(path))
      return { name: nameOf(path), path, kind: "directory", size: 0, modifiedAt: now - 48 * HOUR, symlink: false };
    return null;
  }

  function inside(path: string): void {
    if (![PROJECT, NOTES].some((root) => path === root || path.startsWith(`${root}/`)) || path.includes("/../"))
      throw new Error("This path is not in the folders of the project.");
  }

  function emit(change: Partial<ExplorerChange>): void {
    if (!watching) return;
    const full: ExplorerChange = {
      serverId: LOCAL_SERVER_ID,
      scope: watching,
      directories: [],
      files: [],
      roots: false,
      git: false,
      overflow: false,
      ...change,
    };
    for (const listener of listeners) listener(full);
  }

  function children(path: string): ExplorerEntry[] {
    const found: ExplorerEntry[] = [];
    for (const candidate of [...folders, ...files.keys()]) {
      if (parentOf(candidate) !== path) continue;
      const item = entry(candidate);
      if (item) found.push(item);
    }
    return found.sort((first, second) =>
      first.kind === second.kind ? collator.compare(first.name, second.name) : first.kind === "directory" ? -1 : 1,
    );
  }

  function gitFile(seed: StatusSeed): ExplorerGitFile {
    return {
      path: seed.path,
      relativePath: seed.path.slice(PROJECT.length + 1),
      index: seed.index,
      worktree: seed.worktree,
      originalPath: seed.originalPath ?? null,
      directory: seed.directory === true,
    };
  }

  function touch(path: string, worktree: ExplorerGitChange): void {
    if (
      !path.startsWith(`${PROJECT}/`) ||
      IGNORED.some((item) => path === item.path || path.startsWith(`${item.path}/`))
    )
      return;
    const known = status.find((item) => item.path === path);
    if (known) {
      if (known.worktree !== "untracked") known.worktree = worktree;
    } else status = [...status, { path, index: null, worktree }];
  }

  function commitFiles(hash: string): ExplorerGitCommitFile[] {
    const at = commits.findIndex((commit) => commit.hash === hash);
    const picks: [string, ExplorerGitChange][][] = [
      [
        ["src/components/Cart.tsx", "modified"],
        ["src/format.ts", "added"],
      ],
      [
        ["src/App.tsx", "modified"],
        ["src/components/ProductCard.tsx", "added"],
        ["data/products.json", "added"],
      ],
      [
        ["backend/api/routes.py", "renamed"],
        ["backend/main.py", "modified"],
      ],
      [["tests/checkout.test.ts", "added"]],
      [
        ["README.md", "modified"],
        ["docs/architecture.md", "modified"],
        ["tests/legacy.test.ts", "deleted"],
      ],
    ];
    return (picks[Math.max(0, at) % picks.length] ?? []).map(([relativePath, change]) => ({
      path: `${PROJECT}/${relativePath}`,
      relativePath,
      change,
      originalPath: change === "renamed" ? `${PROJECT}/backend/routes.py` : null,
    }));
  }

  return {
    roots: async () => ({
      roots: [
        { path: PROJECT, name: "acme-shop" },
        { path: NOTES, name: "design-notes" },
      ],
      separator: "/",
    }),
    list: async ({ path, offset = 0 }) => {
      inside(path);
      if (!folders.has(path)) throw new Error("This path is not a folder.");
      const all = children(path);
      const entries = all.slice(offset, offset + EXPLORER_LIMITS.directoryPage);
      return { path, entries, offset, total: all.length, more: offset + entries.length < all.length };
    },
    stat: async ({ path }) => {
      inside(path);
      return entry(path);
    },
    read: async ({ path }): Promise<ExplorerFile> => {
      inside(path);
      const file = files.get(path);
      if (!file) throw new Error(folders.has(path) ? "This path is not a file." : "The file or folder does not exist.");
      const kind = file.kind ?? "text";
      return {
        path,
        name: nameOf(path),
        size: sizeOf(file),
        modifiedAt: file.modifiedAt,
        mimeType: file.mimeType ?? "text/plain",
        kind,
        text:
          kind === "text" || kind === "svg"
            ? {
                content: file.content,
                encoding: "utf8",
                bom: false,
                lineEnding: "lf",
                mixedLineEndings: false,
                readOnly: false,
                truncated: false,
              }
            : null,
        url: file.url ?? null,
      };
    },
    write: async ({ path, content, expected }) => {
      inside(path);
      const file = files.get(path);
      if (expected && (!file || file.modifiedAt !== expected.modifiedAt || sizeOf(file) !== expected.size)) {
        return file
          ? { outcome: "conflict", exists: true, modifiedAt: file.modifiedAt, size: sizeOf(file) }
          : { outcome: "conflict", exists: false, modifiedAt: 0, size: 0 };
      }
      const next: MockFile = {
        ...(file ?? {}),
        content,
        modifiedAt: Math.max(Date.now(), (file?.modifiedAt ?? 0) + 1),
        ...(file && file.original === undefined ? { original: file.content } : {}),
        ...(file?.kind === "svg" ? { url: svgUrl(content) } : {}),
      };
      files.set(path, next);
      touch(path, file ? "modified" : "untracked");
      emit({ files: [path], git: true });
      return { outcome: "saved", encoding: "utf8", modifiedAt: next.modifiedAt, size: sizeOf(next) };
    },
    create: async ({ parent, name, kind }) => {
      inside(parent);
      const path = `${parent}/${name}`;
      if (!folders.has(parent)) throw new Error("This path is not a folder.");
      if (/[\\/]/u.test(name) || name === "." || name === "..")
        throw new Error("This name is not valid for a file or a folder.");
      if (entry(path)) throw new Error(`A file or folder with the name ${name} is in this folder already.`);
      if (kind === "directory") folders.add(path);
      else {
        files.set(path, { content: "", modifiedAt: Date.now(), original: null });
        touch(path, "untracked");
      }
      emit({ directories: [parent], files: [path], git: kind === "file" });
      const made = entry(path);
      if (!made) throw new Error("The file or folder does not exist.");
      return made;
    },
    rename: async ({ path, name }) => {
      inside(path);
      const parent = parentOf(path);
      const target = `${parent}/${name}`;
      if (path === PROJECT || path === NOTES) throw new Error("A project folder cannot be renamed or deleted here.");
      if (!entry(path)) throw new Error("The file or folder does not exist.");
      if (entry(target)) throw new Error(`A file or folder with the name ${name} is in this folder already.`);
      for (const [filePath, file] of [...files]) {
        if (filePath !== path && !filePath.startsWith(`${path}/`)) continue;
        files.delete(filePath);
        files.set(`${target}${filePath.slice(path.length)}`, file);
      }
      for (const folder of [...folders]) {
        if (folder !== path && !folder.startsWith(`${path}/`)) continue;
        folders.delete(folder);
        folders.add(`${target}${folder.slice(path.length)}`);
      }
      status = status.filter((item) => item.path !== path);
      touch(target, "untracked");
      emit({ directories: [parent], files: [path, target], git: true });
      const renamed = entry(target);
      if (!renamed) throw new Error("The file or folder does not exist.");
      return renamed;
    },
    trash: async ({ path }) => {
      inside(path);
      if (path === PROJECT || path === NOTES) throw new Error("A project folder cannot be renamed or deleted here.");
      if (!entry(path)) throw new Error("The file or folder does not exist.");
      for (const filePath of [...files.keys()]) {
        if (filePath === path || filePath.startsWith(`${path}/`)) {
          files.delete(filePath);
          touch(filePath, "deleted");
        }
      }
      for (const folder of [...folders]) if (folder === path || folder.startsWith(`${path}/`)) folders.delete(folder);
      emit({ directories: [parentOf(path)], files: [path], git: true });
    },
    reveal: async () => undefined,
    watch: async ({ scope }) => {
      watching = scope;
    },
    unwatch: async () => {
      watching = null;
    },
    onChanged: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    gitStatus: async ({ root, ignored }) => {
      if (root !== PROJECT)
        return { state: "not-repository", root, repository: null, branch: null, files: [], truncated: false };
      return {
        state: "ready",
        root,
        repository: PROJECT,
        branch: {
          name: "main",
          head: commits[0]?.hash.slice(0, 12) ?? null,
          upstream: "origin/main",
          ahead: 2,
          behind: 1,
        },
        files: [...status, ...(ignored ? IGNORED : [])].map(gitFile),
        truncated: false,
      };
    },
    gitLog: async ({ root, skip, limit }) => {
      if (root !== PROJECT) return { state: "not-repository", commits: [], more: false };
      return { state: "ready", commits: commits.slice(skip, skip + limit), more: skip + limit < commits.length };
    },
    gitCommitFiles: async ({ root, hash }) => {
      if (root !== PROJECT) return { state: "not-repository", files: [], truncated: false };
      return { state: "ready", files: commitFiles(hash), truncated: false };
    },
    gitDiff: async ({ root, path, hash }) => {
      if (root !== PROJECT)
        return { state: "not-repository", path, original: null, modified: null, binary: false, tooLarge: false };
      const file = files.get(path);
      if (file?.kind === "image" || file?.kind === "binary")
        return { state: "ready", path, original: null, modified: null, binary: true, tooLarge: false };
      if (hash !== null) {
        const change = commitFiles(hash).find((item) => item.path === path)?.change;
        const text = file?.content ?? `// ${nameOf(path)}\n`;
        const before = file?.original ?? text.split("\n").slice(0, -3).join("\n");
        return {
          state: "ready",
          path,
          original: change === "added" ? null : before,
          modified: change === "deleted" ? null : text,
          binary: false,
          tooLarge: false,
        };
      }
      const seed = status.find((item) => item.path === path);
      const deleted = seed?.worktree === "deleted";
      return {
        state: "ready",
        path,
        original: deleted
          ? 'import { test } from "vitest";\n\ntest("the old cart works", () => {});\n'
          : (file?.original ?? null),
        modified: deleted ? null : (file?.content ?? null),
        binary: false,
        tooLarge: false,
      };
    },
  };
}
